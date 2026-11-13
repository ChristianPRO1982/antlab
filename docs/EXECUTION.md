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

Depuis le lot 06, le client est importé par la page Jeu et raccordé au Canvas.
Vite construit aussi le Worker référencé par
`new Worker(new URL(..., import.meta.url))`. Depuis le lot 07, les commandes
graphiques pilotent ce client. La [session et sa visualisation](VISUALISATION.md)
restent accessibles par API sous Vite. Les expériences indépendantes utilisent toujours cette fabrique.

## API commune

Toutes les méthodes ci-dessous renvoient des promesses, sauf `subscribe`.

| Opération                      | Résultat et effet                                                              |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `step()`                       | Effectue exactement un pas supplémentaire ; progression finale.                |
| `advance(count)`               | Effectue exactement N pas supplémentaires ; progression finale.                |
| `runUntil(targetStep)`         | Atteint une étape absolue exacte ; progression finale.                         |
| `start()`                      | Lance le calcul continu sans cible ; progression après acceptation.            |
| `pause()`                      | Suspend entre lots, conserve cible et tâche ; progression acquittée.           |
| `resume()`                     | Reprend une tâche suspendue ; progression acquittée.                           |
| `cancel()`                     | Abandonne tâche et cible en conservant l'état atteint ; progression acquittée. |
| `getProgress()`                | Lit une copie compacte de la progression.                                      |
| `getState()`                   | Copie le monde complet et la fourmi, sur demande explicite.                    |
| `getRules()`                   | Copie la sélection normalisée et le seuil effectif des majorités.              |
| `setExecutionOptions(options)` | Ajuste les options de pilotage entre lots ; retourne les options effectives.   |
| `subscribe(callback)`          | Observe la progression ; retourne une fonction de désabonnement.               |
| `dispose()`                    | Libère les ressources et rejette les tâches/demandes en attente.               |

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
une `RangeError`. Ces options sont copiées ; elles peuvent être ajustées par
`setExecutionOptions(options)`. Cette méthode accepte un objet partiel, conserve
les valeurs omises ou `undefined`, valide tout avant application et renvoie
une copie des trois options effectives. Elle est disponible sur le contrôleur
et le client, y compris pendant un calcul ou une pause. Le timer précédent est
invalidé ; le prochain lot utilise la nouvelle cadence, sans changer état,
cible, statut ni promesse de calcul. Une commande invalide ne modifie rien.

Chaque lot calcule au plus `batchSize` pas et s'arrête exactement à la cible si
elle est plus proche. Un `setTimeout` cède la main avant le lot suivant, même
avec un délai nul. Les commandes du Worker sont traitées entre les lots ; une
pause est effective à son acquittement, après l'éventuel lot déjà engagé.
Les timers invalidés par pause, annulation ou fermeture ne peuvent plus agir.

Le **nombre de transitions** est scientifique. Le **débit** dépend du matériel,
des règles, de la taille et du délai des lots. La **fréquence des notifications**
est indépendante ; aucune ne décide des transformations. Un intervalle nul
notifie chaque lot. Les changements de statut et les fins de tâches sont toujours
notifiés. Le rendu choisit sa propre fréquence et peut aussi ne pas s'abonner.

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

Le client possède aussi `subscribeErrors(callback)`, avec une fonction de
désabonnement, pour observer une panne fatale même au repos. La fermeture
volontaire ne déclenche pas ce canal. Il est local au client et ne constitue
pas une commande envoyée au Worker.

Le client utilise un identifiant entier sûr positif distinct par requête.
Une requête contient `{ id, command }`, complété uniquement par ses arguments :

- `initialize` : `configuration`, `execution` ; accepté une seule fois.
- `advance` : `count` ; `runUntil` : `targetStep`.
- `setExecutionOptions` : `options` (objet partiel).
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

## Commandes d'édition — lot 07 bis prévu

**Extension prévue, non implémentée.** Les commandes ci-dessous expriment les
capacités à ajouter ; elles ne font pas encore partie de l'API ni du protocole
actuels. Le [lot 07 bis](ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md#07-bis--modifier-manuellement-les-cases)
prévoit l'inversion de cases et le remplissage d'un rectangle noir, blanc ou
aléatoire reproductible, conformément au [contrat du moteur](MOTEUR.md#interventions-manuelles--lot-07-bis-prévu).

Le client transmettra les demandes au Worker avec la corrélation et les erreurs
explicites du protocole existant. Le contrôleur les appliquera entre lots,
après validation avant écriture. Il acquittera chaque intervention avec l'étape
exacte et son ordre d'application à cette étape, issus du moteur et non du Canvas.
Une demande reçue pendant un lot attendra la fin de ce lot ; aucune transition
ne sera interrompue. L'ordre des interventions appliquées à une même étape sera
conservé dans le journal minimal en mémoire pour permettre leur rejeu.

Le rectangle sera une opération atomique après validation de toute sa zone,
avec un maximum de 100 000 cases. Le tracé transmettra progressivement les
nouvelles cases, en garantissant une seule inversion par case et par geste et
un plafond total de 100 000 cases. Terminer le geste ne restaurera pas les
couleurs antérieures ; les écritures déjà appliquées seront conservées. Le refus
d'une demande sera signalé sans masquer l'état atteint ni détruire l'expérience.

Les interventions ne changeront ni compteur, fourmi, règles, cible, ni tâche
de calcul. En marche autorisée, le calcul continuera ; en pause, il restera
suspendu et la cible sera conservée. La progression et les instantanés devront
refléter les nouvelles couleurs même si le compteur ne change pas. Une panne
ne déclenchera ni écriture de secours côté interface ni répétition automatique
d'une inversion dont l'acquittement serait inconnu.

L'autorisation dépendra de la vitesse **demandée**, non du débit observé :
édition à l'arrêt quelle que soit la vitesse choisie, ou en marche à 1, 10 ou
100 pas/s. Les états de préparation, fermeture et erreur ne permettront pas
d'édition. Une reprise ou un changement vers une vitesse supérieure à 100 pas/s
en marche désactivera l'outil et mettra fin au geste selon les
[règles de l'interface](INTERFACE.md#édition-manuelle-des-cases--lot-07-bis-prévu).
Les vérifications d'autorisation devront rester cohérentes entre interface et
contrôleur, y compris si une commande d'édition croise un changement de vitesse.

Réinitialiser remplacera l'expérience et effacera son journal d'interventions.
Les commandes et réponses de l'ancienne session ne devront pas modifier la
nouvelle. Aucun calcul après fermeture, sauvegarde persistante, export ou import
ne sera ajouté dans ce lot.

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

Cet exemple crée une expérience indépendante. Pour afficher la simulation dans
Jeu, utiliser [getGameSession](VISUALISATION.md). La page doit rester utilisable.
Après l'acquittement de pause, le compteur reste
stable jusqu'à reprise ; après annulation, la cible vaut `null` et le monde est
conservé.

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

Les fixtures de pilotage important les sources sont explicitement ignorées
avec `TEST_BASE_URL` vers une image de production. Depuis le lot 06, le Worker
du site et les gestes tactiles possèdent aussi des parcours sans import de
sources, exécutés contre Vite ou Nginx.
