# Interface d'AntLab

## Identité et navigation

L'interface utilise un fond blanc, du texte noir, des séparateurs gris et des
halos bleu électrique `#087bff` discrets. La typographie utilise les polices
disponibles sur le système, sans chargement externe.

Le bandeau commun mesure 52 pixels. Lanto ouvre l'accueil ; les liens Accueil,
Jeu et Aide suivent, avec un contour noir et `aria-current="page"` sur la page
active. `Lanto.png` sert aussi de favicon et d'illustration d'accueil.

Les adresses `#/accueil`, `#/jeu` et `#/aide` utilisent le même document statique.
L'absence de fragment ou un fragment inconnu affiche l'accueil. Les boutons
précédent/suivant fonctionnent sans réinitialiser la vue. Aucun changement Nginx
ou d'infrastructure n'est nécessaire.

L'accueil présente le laboratoire et Lanto ; l'aide décrit la géométrie, le point
d'origine, la navigation et les limites actuelles. La page Jeu remplit la fenêtre
sous le bandeau. Les trois sections partagent le même menu.

## Panneau du jeu

Sur ordinateur, la grille et le panneau sont côte à côte. La largeur totale du
panneau, poignée comprise, vaut initialement 28 % de la fenêtre. Elle est ajustable
entre 15 et 50 %. Une poignée de 14 pixels affiche un grip, des chevrons et des
flèches horizontales.

- Cliquer sur la poignée replie ou rouvre le panneau à sa dernière largeur valide.
- Glisser redimensionne avec capture du pointeur. Un déplacement d'au moins
  4 pixels distingue le glissement du clic. Passer sous 15 % replie le panneau ;
  dépasser 50 % borne sa largeur. Annuler le geste restaure son état initial.
- Entrée/Espace bascule l'ouverture. Flèche gauche agrandit et flèche droite
  réduit, par pas de deux points de pourcentage. Flèche gauche rouvre un panneau
  replié. Le focus reste sur la poignée.
- Les options défilent indépendamment. Le bloc vitesse, lecture/pause et
  réinitialisation reste fixé en bas du panneau.
- Une fois replié, seule la poignée subsiste, avec un bouton lecture/pause
  flottant au-dessus de la grille. Le bouton disparaît quand le panneau s'ouvre.

Sous 768 pixels, le panneau devient un tiroir superposé de largeur
`min(88vw, 400px)`, initialement fermé. Son ouverture ne réduit pas la grille.
La poignée bascule son ouverture ; Échap ferme le tiroir et rend le focus à la
poignée. Les états d'ouverture mobile et ordinateur sont mémorisés séparément
en mémoire, comme la largeur choisie sur ordinateur.

## Réglages visuels et Lanto

Les options fonctionnelles sont le zoom de 1 à 160 pixels CSS par case, le
recentrage sans changer l'échelle et quatre interrupteurs activés par défaut :
quadrillage, contours renforcés, repère d'origine et Lanto. Le zoom affiché est
synchronisé avec la molette. Désactiver le quadrillage peut conserver les seuls
contours des croix ; désactiver leur renforcement laisse des traits fins si le
quadrillage reste activé.

`Lanto-top.webp` est dessiné au centre de la case `(0, 0)`, tête vers le nord,
sur 90 % du côté d'une case. Le repère gris est dessiné ensuite, afin de rester
visible. Lanto ne suit pas le pointeur et ne se déplace pas encore.

Les couleurs du monde restent dans `SparseWorld`. Les réglages, le panneau et
la caméra ne font aucun appel en écriture sur ce monde. Le contrôleur de vue
fournit `setActive`, `setZoom`, `recenter` et `updateOptions`, avec un rappel
`onScaleChange` pour l'interface. Le masquage du jeu annule le rendu en attente
et termine le glissement éventuel ; le retour reprend la même caméra.

## Périmètre et vérification

Ce lot est une refonte visuelle demandée après l'étape 02. Il anticipe des
éléments des étapes 06 et 07 **sans les clôturer**. Vitesse, lecture/pause,
réinitialisation et bouton flottant sont désactivés avec la mention
« Simulation à venir ». Il n'existe ni moteur, ni Worker, ni règles configurables,
ni export/import. La prochaine étape scientifique demeure l'étape 03.

Les tests TDD ont d'abord échoué sur l'absence du panneau, du recentrage et de
la navigation. Vitest couvre les transitions et limites du panneau ainsi que
le recentrage conservant le zoom. Playwright couvre navigation/historique,
ressources graphiques, rendu, réglages, conservation de la caméra et du panneau,
glissements, clavier, défilement indépendant, petit panneau et tiroir mobile.
Les captures des trois pages sont enregistrées dans `test-results/design-*.png`
pour inspection visuelle, sans instantanés de référence.

Contrôle local : `docker compose run --rm test`. Le bilan final et les limites
doivent distinguer les contrôles Chromium des essais sur du matériel réel.
Aucune publication, modification d'infrastructure ou persistance n'est ajoutée.

### Réception du 10 novembre 2026

Le contrôle global Docker est réussi : ESLint, Prettier, **39 tests unitaires**
(dont quatre sur le panneau et six sur la caméra), **12 parcours Chromium** et
build Vite. Les captures des trois pages ont été inspectées sur ordinateur et
mobile. Les originaux de Lanto sont conservés sans altération ; le build inclut
le PNG utilisé et le WebP, sans embarquer le PNG source de la vue de dessus.

Restent à vérifier sur du matériel réel : confort du redimensionnement, du zoom
et du panneau tactile. Les autres navigateurs, l'image Nginx de production et
le déploiement n'ont pas été testés dans ce lot. Les commandes de simulation
restent désactivées et aucune étape scientifique supplémentaire n'est clôturée.
