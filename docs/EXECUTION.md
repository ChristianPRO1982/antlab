# Pilotage des calculs longs

## Contrôleur et Worker

`ExecutionController` dans `src/execution-controller.js` pilote un
`LangtonEngine` par lots asynchrones, sans DOM, Canvas ou Worker. Il convient
aux appels sans affichage ; la future campagne utilisera le même moteur.
Le calcul scientifique reste synchrone et autonome ; seul son pilotage utilise
des timers et une horloge pour les notifications.

`createSimulationClient(configuration, execution)` dans `src/simulation-client.js`
crée un Web Worker module, attend son initialisation puis renvoie un client
avec la même API. `src/simulation-worker.js` héberge un contrôleur par Worker.
La configuration initiale est celle du [moteur](MOTEUR.md), y compris les
[règles et seuils de majorité](REGLES.md). Elle reste fixe pendant l'expérience.

Le lot 05 fournit cette API et des fixtures de test sous Vite. Les commandes de
la page Jeu et le Canvas ne sont pas encore raccordés. Le client n'est donc pas
encore importé par l'entrée du site, ni embarqué dans son build de production.
Lors du raccordement, l'import du client permettra à Vite de construire aussi
le Worker référencé par `new Worker(new URL(..., import.meta.url))`.

## API commune

Toutes les méthodes ci-dessous renvoient des promesses, sauf `subscribe`.

| Opération              | Résultat et effet                                                              |
| ---------------------- | ------------------------------------------------------------------------------ |
| `step()`               | Effectue exactement un pas supplémentaire ; progression finale.                |
| `advance(count)`       | Effectue exactement N pas supplémentaires ; progression finale.                |
| `runUntil(targetStep)` | Atteint une étape absolue exacte ; progression finale.                         |
| `start()`              | Lance le calcul continu sans cible ; progression après acceptation.            |
| `pause()`              | Suspend entre lots, conserve cible et tâche ; progression acquittée.           |
| `resume()`             | Reprend une tâche suspendue ; progression acquittée.                           |
| `cancel()`             | Abandonne tâche et cible en conservant l'état atteint ; progression acquittée. |
| `getProgress()`        | Lit une copie compacte de la progression.                                      |
| `getState()`           | Copie le monde complet et la fourmi, sur demande explicite.                    |
| `getRules()`           | Copie la sélection normalisée et le seuil effectif des majorités.              |
| `subscribe(callback)`  | Observe la progression ; retourne une fonction de désabonnement.               |
| `dispose()`            | Libère les ressources et rejette les tâches/demandes en attente.               |

La promesse d'un calcul fini reste en attente pendant une pause. Elle est résolue
avec `status: 'completed'` à la cible, ou `status: 'cancelled'` après annulation.
Une erreur de calcul la rejette. Pour contrôler une tâche pendant son calcul,
conserver sa promesse sans l'attendre immédiatement.

Une seule tâche peut être active, y compris en pause. Les nouveaux calculs
concurrents sont refusés. Pause et annulation sont idempotentes : sans tâche
correspondante, elles renvoient l'état courant. `resume` est refusé hors pause.
Après annulation, une nouvelle tâche repart de l'étape conservée ; revenir aux
conditions initiales demande une nouvelle instance.

N et les cibles sont des entiers sûrs positifs ou nuls, sans coercition. N = 0 et
une cible égale au compteur courant terminent immédiatement. Une cible passée
est refusée avec une `RangeError` : aucun état antérieur n'est disponible.
Les dépassements du compteur sont refusés avant tout calcul.

## Lots, progression et erreurs

Le deuxième argument du constructeur ou de la fabrique configure le pilotage :

| Option               | Défaut | Domaine                                                                    |
| -------------------- | ------ | -------------------------------------------------------------------------- |
| `batchSize`          | 1000   | Entier de 1 à 10 000 transitions.                                          |
| `batchDelayMs`       | 0      | Entier de 0 à 2 147 483 647 millisecondes entre lots.                      |
| `progressIntervalMs` | 100    | Entier de 0 à 2 147 483 647 millisecondes entre notifications périodiques. |

Une option omise ou `undefined` prend sa valeur par défaut. Les champs inconnus,
structures et types invalides sont refusés ; un nombre hors domaine provoque
une `RangeError`. Ces options sont copiées et fixes pendant la vie du contrôleur.

Chaque lot calcule au plus `batchSize` pas et s'arrête exactement à la cible si
elle est plus proche. Un `setTimeout` cède la main avant le lot suivant, même
avec un délai nul. Les commandes du Worker sont traitées entre les lots ; une
pause est effective à son acquittement, après l'éventuel lot déjà engagé.
Les timers invalidés par pause, annulation ou fermeture ne peuvent plus agir.

Le **nombre de transitions** est scientifique. Le **débit** dépend du matériel,
des règles, de la taille et du délai des lots. La **fréquence des notifications**
est indépendante ; aucune ne décide des transformations. Un intervalle nul
notifie chaque lot. Les changements de statut et les fins de tâches sont toujours
notifiés. Le futur rendu choisira sa propre fréquence et pourra ne pas s'abonner.

Une progression contient `ant`, `stepCount`, `blackCellCount`, `status` et
`targetStep` (nul pour le calcul continu ou après annulation). Les statuts sont
`ready`, `running`, `paused`, `completed`, `cancelled` et `error`. En erreur de
calcul, elle contient aussi `error: { name, message }`. Les copies sont indépendantes.
Le moteur fournit les trois premières données en coût constant, sans parcourir
les cases noires et sans appeler `getState()`.

Une erreur scientifique arrête la tâche et conserve chaque transition terminée.
La progression annonce le compteur réel ; `getState()` reste disponible pour
inspecter cet état partiel. Une erreur de commande ne détruit pas l'expérience.
Les exceptions d'un abonné sont signalées comme erreurs asynchrones, sans être
requalifiées en erreurs scientifiques ni interrompre les autres abonnés.

## Protocole Worker

Le client utilise un identifiant entier sûr positif distinct par requête.
Une requête contient `{ id, command }`, complété uniquement par ses arguments :

- `initialize` : `configuration`, `execution` ; accepté une seule fois.
- `advance` : `count` ; `runUntil` : `targetStep`.
- Les autres commandes n'ont pas d'argument. `subscribe` est local au client ;
  sa fermeture termine directement le Worker.

Les réponses sont `{ type: 'response', id, result }` ou
`{ type: 'response', id, error: { name, message } }`. Les notifications sont
`{ type: 'progress', progress }`, sans état complet. Messages mal formés et champs
inconnus sont refusés ; un identifiant invalide reçoit une erreur avec `id: null`.
Une initialisation est nécessaire avant toute commande de calcul ou lecture.

Le Worker ne bloque pas la réception des commandes en attendant un calcul fini.
Le client corrèle les réponses indépendamment de leur ordre. Un `error`,
`messageerror` ou message invalide termine la connexion et rejette les demandes
en attente ; aucun calcul de secours n'est lancé sur le thread principal.
Les `TypeError` et `RangeError` de commande sont rétablies côté client. La
fermeture est idempotente ; toute opération sur une instance fermée est refusée.

## Exemples et vérification manuelle

Depuis la racine après la [préparation Docker](DEVELOPPEMENT.md) :

```sh
docker compose run --rm tools node --input-type=module <<'JS'
import { ExecutionController } from './src/execution-controller.js';
const simulation = new ExecutionController();
try {
  console.log(await simulation.runUntil(10000));
  console.log(await simulation.runUntil(100000));
  console.log(await simulation.runUntil(1000000));
} finally {
  await simulation.dispose();
}
JS
```

Les trois résultats doivent être `completed`, aux compteurs et cibles exacts
10 000, 100 000 et 1 000 000. Avec Langton par défaut, au million la fourmi est en
`(-19056, -19032)`, orientée `north`, et le monde contient 114 952 cases noires.

Pour le vrai Worker, ouvrir le site sous Vite puis utiliser la console du
navigateur, commande par commande :

```js
const { createSimulationClient } = await import('/src/simulation-client.js');
const simulation = await createSimulationClient();
const unsubscribe = simulation.subscribe(({ status, stepCount }) =>
  console.log(status, stepCount),
);
await simulation.start();
// Naviguer entre les pages et manipuler le zoom pendant le calcul.
await simulation.pause();
await simulation.getProgress();
await simulation.resume();
await simulation.cancel();
await simulation.getState(); // Copie complète uniquement sur demande.
unsubscribe();
await simulation.dispose();
```

La page doit rester utilisable. Après l'acquittement de pause, le compteur reste
stable jusqu'à reprise ; après annulation, la cible vaut `null` et le monde est
conservé. Le pavage affiché reste celui de l'interface actuelle : il n'est pas
encore relié à l'expérience de cette console.

## Limites

Le moteur reste limité aux entiers sûrs JavaScript et à la mémoire disponible.
Un lot n'est pas préemptible : sa durée dépend du matériel et des règles, même
si sa taille est bornée. Aucune durée maximale ou cadence réelle n'est garantie.
Les timers peuvent être ralentis dans un onglet masqué ; fermer ou recharger
la page termine le Worker et perd son état en mémoire.

`getState()` a un coût proportionnel au monde ; transférer une grande copie peut
mobiliser les deux threads et ne convient pas à chaque pas. Une panne fatale du
Worker détruit son état privé ; seule une erreur scientifique traitée par le
contrôleur permet encore sa consultation. Aucune sauvegarde ou reprise après
panne n'est ajoutée.

Les tests Worker utilisent les modules source de Vite et sont explicitement
ignorés avec `TEST_BASE_URL` vers une image de production, qui ne contient pas
ces fixtures. Les parcours actuels de l'interface restent exécutés dans ce cas.
