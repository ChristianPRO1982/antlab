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
- Seule la zone supérieure des règles défile. En l'absence de catalogue, elle
  indique que les règles seront disponibles avec la simulation. Tous les
  réglages sont fixes en bas, dans l'ordre affichage, zoom/cadrage puis
  vitesse/lecture/pause/réinitialisation.
- Une fois replié, seule la poignée subsiste, avec un bouton lecture/pause
  flottant de 56 × 56 pixels en bas à droite, à 20 pixels des bords de la grille.
  Le bouton disparaît quand le panneau s'ouvre.

Sous 768 pixels, le panneau devient un tiroir superposé de largeur
`min(88vw, 400px)`, initialement fermé. Son ouverture ne réduit pas la grille.
La poignée bascule son ouverture ; Échap ferme le tiroir et rend le focus à la
poignée. Les états d'ouverture mobile et ordinateur sont mémorisés séparément
en mémoire, comme la largeur choisie sur ordinateur.

## Réglages visuels et Lanto

Le sélecteur Grille propose trois modes exclusifs : **Pas de grille**, **Grille
simple** (tous les traits fins) et **Grille simple + grille « + »** (contours des
croix renforcés), choisi par défaut. Le repère d'origine et Lanto disposent de
deux interrupteurs indépendants, activés par défaut.

Les trois boutons de cadrage restent sur une seule ligne, au-dessus des commandes
de simulation. Sur un panneau étroit ou une petite hauteur, leurs icônes restent
visibles et leurs noms sont accessibles avec une infobulle.

| Bouton                | Action                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| Centrer le monde      | Centre la case de départ sans modifier le zoom et arrête tout suivi     |
| Centrer sur la fourmi | Centre sa case ; double-clic ou Maj+Entrée pour la suivre en permanence |
| Taille max            | Cadre en permanence les cases actuellement noires                       |

Les deux modes automatiques sont exclusifs : bouton bleu et `aria-pressed=true`
pour le mode actif. Choisir un autre cadrage l'annule. Cliquer de nouveau sur un
mode automatique actif le conserve. Un glissement effectif ou un zoom manuel
(molette ou curseur) rend la caméra libre ; un clic sans déplacement sur la grille
ne désactive pas le suivi. Le mode reste mémorisé entre les pages et au repli du
panneau. Les redimensionnements le conservent et réappliquent son cadrage.

Taille max utilise le rectangle des carrés noirs entiers, avec une marge de
24 pixels CSS par côté, limitée au quart de la largeur/hauteur sur une petite
fenêtre. Il exclut la fourmi, l'origine et les anciennes bornes. Le zoom diminue
quand le monde grandit et augmente quand il rétrécit, jusqu'à 160 pixels par case.
Sans case noire, il revient à la vue initiale (case `(0, 0)`, 32 pixels par case)
en restant actif. Aucun maximum historique ni KPI n'est calculé.

Le minimum du zoom manuel vaut initialement 1 pixel par case. Taille max peut
descendre plus bas ; la plus petite échelle atteinte est alors conservée comme
borne basse pour le reste de la session, afin qu'une reprise manuelle ne saute
pas à un pixel. Le curseur et le zoom affiché sont synchronisés avec la caméra,
avec un pas libre et une notation scientifique sous 0,01 pixel par case.

`Lanto-top.webp` est dessiné au centre de la case de la fourmi, tête vers le nord,
sur 90 % du côté d'une case. Sa position est commune au dessin et au cadrage ;
elle reste `(0, 0)` dans l'application actuelle, sans liaison au moteur. Le repère gris
est dessiné ensuite, afin de rester visible. Lanto ne suit pas le pointeur.

Les couleurs du monde restent dans `SparseWorld`. Les réglages, le panneau et
la caméra ne font aucun appel en écriture sur ce monde. Le contrôleur de vue
fournit `setActive`, `setZoom`, `selectFraming`, `updateOptions` et `refresh`, avec
les rappels `onScaleChange(scale, minimumScale)` et `onFramingChange(mode)`.
`refresh` déclenche le rendu après une actualisation du monde ou de la position
de fourmi passée au montage. `view-framing.js` calcule les cadrages sans DOM ni
écriture du monde ; les états de suivi sont `free`, `ant` et `world`.
Le masquage du jeu annule le rendu en attente et termine le glissement éventuel ;
le retour reprend la même caméra et son mode. Il n'y a aucune boucle au repos.
Les limites numériques sont conservées ; un cadrage refusé affiche son erreur.

## Périmètre et vérification

Ce lot est une refonte visuelle demandée après l'étape 02. Il anticipe des
éléments des étapes 06 et 07 **sans les clôturer**. Vitesse, lecture/pause,
réinitialisation et bouton flottant sont désactivés avec la mention
« Simulation à venir ». Le [moteur autonome de l'étape 03](MOTEUR.md) est désormais
disponible, sans intégration à l'interface. Il n'existe ni Worker, ni règles
configurables, ni export/import. La prochaine étape scientifique est le catalogue
de règles (04).

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

### Réception initiale du 10 novembre 2026

Le contrôle global Docker est réussi : ESLint, Prettier, **39 tests unitaires**
(dont quatre sur le panneau et six sur la caméra), **12 parcours Chromium** et
build Vite. Les captures des trois pages ont été inspectées sur ordinateur et
mobile. Les originaux de Lanto sont conservés sans altération ; le build inclut
le PNG utilisé et le WebP, sans embarquer le PNG source de la vue de dessus.

Restent à vérifier sur du matériel réel : confort du redimensionnement, du zoom
et du panneau tactile. Les autres navigateurs, l'image Nginx de production et
le déploiement n'ont pas été testés dans ce lot. Les commandes de simulation
restent désactivées et aucune étape scientifique supplémentaire n'est clôturée.

### Correctifs de cadrage du 10 novembre 2026

Le TDD a constaté l'absence du module de cadrage et des trois boutons avant
implémentation. Les neuf nouveaux tests unitaires vérifient les bornes actuelles,
les modes exclusifs, des positions successives de fourmi, l'agrandissement et le
rétrécissement du monde, le retour au blanc, les petites fenêtres et les limites
numériques. Ils vérifient aussi que le cadrage ne modifie pas les cases noires.

Le contrôle global `docker compose run --rm test` est réussi : **48 tests
unitaires**, **15 parcours Chromium**, ESLint, Prettier et build Vite. Les nouveaux
parcours contrôlent les trois grilles, l'alignement des boutons, le suivi par
double-clic et Maj+Entrée, la couleur du mode actif, son arrêt par glissement,
molette ou curseur, sa conservation entre pages et au redimensionnement, ainsi
que le bouton flottant de 56 pixels à 20 pixels des bords inférieur et droit.

Les captures du panneau ouvert, replié, mobile, du mode actif et de la petite
hauteur ont été inspectées. L'essai du recentrage vérifie la conservation exacte
du zoom avant/après, sans supposer un arrondi du delta de molette du navigateur.
Le défilement est testé avec du contenu long ajouté seulement dans une fixture
de règles ; aucun catalogue fictif n'est présent dans l'application.

Lanto reste à l'origine et le monde reste blanc dans l'interface sans moteur.
Les variations de position et de couleurs sont vérifiées dans les tests de
cadrage, sans animation scientifique. Le confort sur souris et écran tactile
réels et les autres navigateurs restent à vérifier. Aucune publication ni
clôture d'étape scientifique supplémentaire n'a été effectuée.
