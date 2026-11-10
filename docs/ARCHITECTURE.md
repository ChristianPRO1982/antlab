# Architecture

## Socle actuel

Le point d'entrée HTML charge un module JavaScript et une feuille CSS dans `src`.
Il affiche le pavage en croix dans un Canvas 2D navigable. La géométrie et le monde
clairsemé sont implémentés. Le moteur de Langton peut simuler une fourmi sans
affichage ; il n'est pas encore relié à cette interface.

`geometry.js` définit les croix, `world.js` stocke les cases noires et
`coordinates.js` valide leur domaine numérique commun. Ces modules ne dépendent
ni du navigateur ni du rendu. `camera.js` calcule les conversions et la navigation
sans DOM ; `renderer.js` dessine la fenêtre visible et `paving-view.js` relie
les événements du navigateur au rendu. `view-framing.js` calcule les bornes noires
courantes et les modes de centrage/suivi sans DOM, horloge ou écriture du monde.
L'interface ne modifie pas le monde.

`engine.js` expose `LangtonEngine` : état privé de la fourmi, monde clairsemé,
compteur exact, transition atomique et calcul de N pas. Il réutilise `world.js`
et `coordinates.js`, sans dépendance au rendu, au temps ou au Worker. Les
conditions initiales et les copies d'état sont indépendantes du stockage privé.
Voir l'[API et les conventions du moteur](MOTEUR.md).

`rules.js` définit le catalogue versionné et valide la sélection fixe du moteur.
Il prépare les écritures sans modifier le monde : toutes les transformations
lisent les couleurs initiales communes. Le moteur valide sa destination puis
applique les écritures préparées avant d'avancer et d'incrémenter le compteur.
Les métadonnées du [catalogue](REGLES.md) sont exposées sans les fonctions de
calcul. Les centres utilisent la règle sélectionnée ; les branches conservent
l'inversion simple. Aucun langage de règles ni chargement de code externe
n'est introduit.

`execution-controller.js` pilote ce moteur par lots séparés par des timers.
Il ne dépend ni du DOM ni du Worker et peut être appelé sans affichage.
`simulation-worker.js` héberge un contrôleur et reçoit les commandes ;
`simulation-client.js` offre la même API asynchrone par messages corrélés,
gère les abonnements et libère le Worker à la fermeture. La progression utilise
`LangtonEngine.getProgress()` en coût constant, sans copier le monde.
Voir le [contrat de pilotage](EXECUTION.md). Le raccordement à `main.js` et au
Canvas reste futur : les fixtures Playwright sous Vite exercent cette API
sans l'ajouter au build du site avant l'assemblage de l'interface.

`main.js` pilote trois sections via les fragments `#/accueil`, `#/jeu` et `#/aide`,
sans routeur ni rechargement de page. Le Canvas est monté à la première visite
du jeu puis conservé en mémoire ; son contrôleur suspend les rendus hors de cette
page. Les réglages et la caméra restent intacts lors de la navigation.
`panel-state.js` contient les transitions du panneau sans DOM ; `options-panel.js`
relie son redimensionnement, son repli et le mode mobile aux événements.

La vue souris et le zoom anticipent une partie de l'étape 06 à la demande de
l'utilisateur, sans clôturer ce lot. La refonte visuelle ajoute le recentrage et
une représentation de Lanto à l'origine et des modes de suivi côté vue. L'intégration
du moteur à la vue et la navigation tactile complète restent à réaliser.
Voir les [conventions et API](GEOMETRIE_MONDE.md)
et le [périmètre de l'interface](INTERFACE.md).

Vite lance le serveur de développement et construit `dist`. Nginx sert ce dossier
dans l'image de production, sur le port interne 8080, sous l'utilisateur 101.
Node et les outils npm ne sont pas présents dans l'image finale.

Le dépôt sépare le code (`src`), les tests (`tests`), les fichiers de déploiement
(`docker`, Dockerfile et Compose), la documentation (`docs`) et le workflow
de release (`.github`). Aucun module scientifique vide n'est créé.

## Responsabilités futures

| Ensemble           | Responsabilité et dépendances permises                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| Géométrie et monde | Coordonnées, croix et état clairsemé ; sans DOM                                 |
| Règles et moteur   | Transitions déterministes, état et versions ; sans horloge ni rendu             |
| Mesures            | Indicateurs et maxima exacts ; courbes échantillonnées par étape                |
| Pilotage et Worker | Commandes, lots de calcul, pause, progression ; même moteur dans les deux modes |
| Rendu et interface | Canvas, caméra, formulaires ; aucune décision scientifique                      |
| Formats            | Validation, rapport Markdown et JSON embarqué ; import/export explicites        |

Les ensembles encore absents seront créés au moment des lots concernés. Les modules communiquent
par des données explicites ; leurs interfaces seront définies par les tests.
Il n'y a pas de moteur Python ou de calcul serveur à maintenir en parallèle.

Un Web Worker calcule sans bloquer l'affichage. Il reste lié à la durée de vie
de la page : fermer l'onglet arrête le calcul. Les navigateurs peuvent ralentir
les onglets masqués ; aucun calcul permanent après fermeture n'est promis.

## Session et fichiers

La session désigne l'état en mémoire de l'onglet. Aucun compte ni identifiant de
session serveur n'est nécessaire. Recharger ou fermer la page peut perdre l'état.

La sauvegarde de référence sera un fichier `.md` lisible avec un bloc JSON
versionné contenant les données nécessaires à la reprise. Le JSON reste la
représentation structurée faisant foi ; un export JSON seul pourra être proposé
en complément. Ces fonctions seront développées aux étapes 11 et 12.

## Infrastructure

AntLab fournit une image statique et un modèle de stack applicative. Le réseau
externe `proxy`, Traefik, TLS et DNS sont gérés par l'infrastructure existante.
L'application ne dépend d'aucune base de données ni autre application du VPS.
