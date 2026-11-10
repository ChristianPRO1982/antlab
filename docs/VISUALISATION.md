# Visualisation du monde simulé

## Session et scène affichée

La première ouverture de la page Jeu crée une unique session Worker avec la
configuration de Langton par défaut, à 100 pas/s demandés. Elle est conservée pendant la navigation
entre Accueil, Jeu et Aide. Les commandes et les règles sont disponibles dans le
[poste de pilotage](INTERFACE.md#poste-de-pilotage--étape-07).

Sous Vite, après ouverture du jeu, `getGameSession()` exporté par `src/main.js`
renvoie une promesse donnant `{ simulation, view, dispose }`. `simulation` est
le [client Worker](EXECUTION.md). Appeler cette fonction plusieurs fois donne
accès à la même expérience ; avant la première ouverture du jeu, elle est refusée.
`simulation` est un accesseur vers le client courant : un changement de règles
à zéro ou `reset(rules?)` remplace ce client, sans remplacer la vue. Ne pas garder
une référence détachée au client après reset. `rules` est la sélection normalisée ;
`progress`, `error`, `busy` et `closed` décrivent la session, et `subscribe(callback)`
notifie leurs changements avec désabonnement.
`setExecutionOptions(options)` ajuste et conserve la cadence pour les resets.
`reset()` reprend les règles courantes et le départ standard ; une sélection
invalide est refusée avant destruction. Une panne conserve le dernier état connu
ou des compteurs inconnus à l’initialisation ; une reprise exige un reset explicite.
`dispose()` ferme la synchronisation, la vue et le Worker. Aucune nouvelle
expérience n'est recréée silencieusement après une panne ou cette fermeture.
La fermeture retire aussi les écouteurs des commandes visuelles et de visibilité,
désactive ces commandes et affiche un état fermé. La navigation entre les pages
reste disponible ; `getGameSession()` refuse ensuite l'accès à la session fermée.

`connectSimulationView(simulation, view, options)` dans `src/simulation-view.js`
relie une nouvelle expérience à sa vue avant lancement. Les options sont
`intervalMs` (100 par défaut, entier entre 100 et 2 147 483 647) et `onError`.
Le connecteur fournit `setActive`, `refresh` et `dispose` ; sa destruction
détache les notifications et timers sans arrêter elle-même le moteur.

Une seule requête `getState()` peut être en vol. Les demandes sont regroupées
avec un intervalle minimal de 100 ms dans le site, soit au maximum dix demandes
par seconde. Cette borne ne peut pas être abaissée par la configuration ;
l'échéance monotone est revérifiée avant chaque demande, même si un timer se
déclenche trop tôt. Pendant un calcul, la scène est actualisée à cette cadence ; après
pause, fin, annulation ou erreur scientifique, une dernière actualisation est
demandée. Il n'y a pas de requêtes périodiques au repos une fois la scène à jour.
Une requête déjà engagée ne peut pas être retirée du Worker ; ses réponses
devenues inutiles après masquage ou fermeture sont ignorées.

La progression compacte déclenche des demandes, mais ne remplace jamais la
fourmi isolément. `view.updateScene({ ant, stepCount, blackCells })` valide et
copie toutes les données avant de remplacer la scène entière. La fourmi et les
couleurs appartiennent ainsi à la même étape. `scene.js` construit un cache
immuable ne proposant que la lecture des cases noires.

`view.stepCount` est l'étape de la dernière scène acceptée, ou `null` avant la
première réception. `view.drawnStepCount` donne l’étape effectivement dessinée,
ou `null` avant le premier dessin de scène ; le panneau signale son retard
par rapport au compteur calculé. Le dessin est ensuite regroupé par `requestAnimationFrame`.
`setError(message)` affiche une erreur persistante de session ; `null` la retire.
Une erreur de navigation ne modifie ni les données du Worker ni sa tâche.
Le client fournit aussi `subscribeErrors(callback)`, avec désabonnement, pour
signaler une panne de transport même lorsqu'aucune requête n'est en attente.
Une fermeture volontaire du client ne déclenche pas cette notification de panne.

## Rendu et navigation

Le dessin conserve le [pavage, les couleurs, les limites et le zoom](GEOMETRIE_MONDE.md).
Seules les cases noires et la fourmi intersectant la fenêtre sont dessinées.
Le motif de quadrillage reste une petite tuile répétitive, indépendamment du
nombre de cases blanches visibles. Lanto occupe 90 % de sa case et tourne
autour de son centre : nord 0°, est 90°, sud 180°, ouest 270°.
Le chargement de son image ne bloque pas le dessin des cases : une image en
attente ou indisponible suspend uniquement le dessin de Lanto. Un échec reste
signalé sans empêcher les nouvelles scènes ou la navigation.

En dessous d'un pixel physique par case, l'aperçu couvre les pixels touchés par
chaque case noire (bords arrondis vers l'extérieur). Cela évite leur disparition
par arrondi de l'anticrénelage. Ce dessin de présence grossit les cases à la
résolution de l'écran ; les dimensions et couleurs du modèle restent exactes.

Le pan/zoom utilise le dernier cache reçu, sans demander un instantané à chaque
mouvement. Centrage ponctuel, suivi de la fourmi et Taille max utilisent les
scènes successives. Taille max calcule les bornes noires actuelles : elles
peuvent grandir ou rétrécir ; un monde blanc retrouve la vue initiale.

`PointerGestures` calcule les gestes sans DOM. Le Canvas accepte :

- Souris : glisser avec le bouton gauche, molette pour zoomer sous le pointeur.
- Un doigt : déplacer la vue avec capture du pointeur.
- Deux doigts : déplacer et zoomer simultanément, en conservant sous leur
  nouveau milieu le point du monde situé sous leur ancien milieu.

`Camera.panZoomAt(from, to, factor)` applique cette transformation en une
opération validée. Les bornes de zoom et de navigation restent identiques ;
un dépassement est refusé sans modification partielle. Deux contacts confondus
ne provoquent aucune division par zéro : seule leur translation est appliquée.
Les contacts supplémentaires sont ignorés. Ajouter, relâcher ou annuler un
contact remet à jour la référence du geste sans saut. Une perte de capture,
un redimensionnement, une perte de focus ou un masquage libère les contacts
concernés. `touch-action: none` reste limité au Canvas ; le reste de la page
et le panneau conservent leur défilement.

Une navigation manuelle libère les modes automatiques. Les boutons de cadrage,
leurs double-clics et raccourcis clavier conservent leur comportement existant.
Le panneau mobile, les options visuelles et les trois modes de grille restent
décrits dans [Interface](INTERFACE.md).

## Visibilité et ressources

Lorsque le jeu ou le document est masqué, les dessins, demandes d'instantanés
et gestes sont suspendus. Aucune commande scientifique n'est envoyée : un
calcul déjà lancé continue dans le Worker, sous réserve des politiques du
navigateur en arrière-plan. Au retour, le cache est actualisé et la caméra,
son zoom et son mode de cadrage sont conservés.

`view.dispose()` libère les captures, annule le dessin en attente, déconnecte
le `ResizeObserver` et retire les écouteurs du Canvas, de fenêtre, de densité
de pixels et de chargement de Lanto. La session complète détruit d'abord le
connecteur pour ignorer les lectures restantes, puis la vue et le Worker.

Les instantanés restent complets : copie, transfert, validation et parcours
des cases sont proportionnels à la taille du monde. La cadence bornée et la
requête unique limitent leur coût ; il n'y a ni index spatial ni protocole
différentiel. Une fluidité ou une fréquence d'images fixe n'est pas garantie
pour un monde arbitrairement volumineux. Le domaine scientifique des entiers
sûrs reste indépendant de la limite visuelle ±2^40.

## Vérification manuelle

Pour une vérification sans console, suivre le parcours décrit dans
[Interface](INTERFACE.md#poste-de-pilotage--étape-07). Pour vérifier l’API,
lancer Vite selon [Développement](DEVELOPPEMENT.md), ouvrir Jeu, puis utiliser
la console du navigateur :

```js
const { getGameSession } = await import('/src/main.js');
const { simulation, view } = await getGameSession();
view.selectFraming('follow-ant');
await simulation.setExecutionOptions({ batchSize: 1000, batchDelayMs: 0 });
await simulation.runUntil(10000);
await simulation.start();
// Naviguer entre les pages, déplacer la vue et essayer le zoom.
await simulation.pause();
await simulation.getProgress();
```

Observer la position et l'orientation de Lanto, les cases noires, le suivi puis
son arrêt par navigation manuelle. Choisir Taille max pour voir toutes les
cases, notamment après `await simulation.runUntil(1000000)`. Pendant un calcul,
aller sur Aide puis revenir sur Jeu : le monde doit se remettre à jour.
Sur un appareil tactile, essayer translation, pincement et reprise à un doigt.
Le confort sur matériel réel et les autres navigateurs restent à apprécier.

Le Worker est désormais inclus par Vite dans le build du site. Les parcours de
chargement du Worker et de gestes tactiles fonctionnent aussi avec Nginx via
`TEST_BASE_URL`. Les fixtures nécessitant les imports `/src/...` restent limitées
au serveur Vite ; elles sont explicitement ignorées sur l'image de production.
