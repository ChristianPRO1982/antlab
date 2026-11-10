# Géométrie, monde et navigation

## Coordonnées et pavage

La case entière `(x, y)` occupe le carré `[x, x+1] × [y, y+1]` : X va vers la
droite, Y vers le haut. Les cases voisines partagent leur bord. Un centre vérifie
`x + 2y ≡ 0 mod 5`. Sa croix comprend ce centre et ses quatre voisins orthogonaux.
L'origine `(0, 0)` est un centre.

Les cinq positions relatives au centre ont les résidus suivants :

| Position | Décalage `(dx, dy)` | Résidu de `x + 2y` modulo 5 |
| -------- | ------------------- | --------------------------- |
| centre   | `(0, 0)`            | 0                           |
| nord     | `(0, 1)`            | 2                           |
| est      | `(1, 0)`            | 1                           |
| sud      | `(0, -1)`           | 3                           |
| ouest    | `(-1, 0)`           | 4                           |

Ces résidus distincts prouvent l'appartenance unique : soustraire le décalage
associé donne un centre, et aucun autre décalage ne peut donner un centre.
Le calcul réduit chaque coordonnée modulo 5 avant combinaison et normalise le
résultat dans `[0, 4]`, y compris pour les coordonnées négatives.

## API discrètes

Les fonctions suivantes sont des modules ES utilisables sans DOM, Canvas,
horloge ou Worker. Elles ne conservent aucun cache global.

| Module            | Opération                         | Résultat                                                    |
| ----------------- | --------------------------------- | ----------------------------------------------------------- |
| `src/geometry.js` | `isCenter(x, y)`                  | booléen                                                     |
|                   | `getCellGeometry(x, y)`           | `{ center: { x, y }, position }`                            |
|                   | `getCrossCells(centerX, centerY)` | cinq objets `{ x, y }`, ordre centre, nord, est, sud, ouest |
| `src/world.js`    | `new SparseWorld()`               | monde entièrement blanc                                     |
|                   | `getColor(x, y)`                  | `white` ou `black`                                          |
|                   | `setColor(x, y, color)`           | couleur écrite                                              |
|                   | `toggleColor(x, y)`               | couleur après inversion                                     |
|                   | `blackCellCount`                  | nombre d'entrées noires, lecture seule                      |

`position` vaut `center`, `north`, `east`, `south` ou `west`. Les objets retournés
sont indépendants ; leur modification n'affecte aucun autre appel.
`getCrossCells` refuse une origine qui n'est pas un centre (`RangeError`).

Chaque monde contient un `Set` privé de clés `x,y`. Le blanc est l'absence d'une
clé ; écrire du blanc retire l'entrée. Le compteur reflète directement la taille
du `Set`. Les instances ne partagent aucun stockage ; lire une case blanche ou
réécrire sa couleur ne crée pas d'entrée inutile.

`blackCells()` fournit un itérateur des coordonnées noires sous forme d'objets
`{ x, y }` indépendants du stockage. Il permet au rendu de parcourir les cases
existantes sans énumérer les cases blanches du champ visible.

### Domaine numérique et erreurs

Les deux coordonnées doivent être des `Number` entiers sûrs, dans
`[-9007199254740991, 9007199254740991]`. `-0` représente `0`. Une valeur d'un autre
type provoque une `TypeError` ; fraction, `NaN`, infini ou entier hors domaine
provoquent une `RangeError`. Aucune conversion implicite n'est effectuée.

Un centre propriétaire ou un voisin hors domaine provoque aussi une `RangeError` :
aucun arrondi, bouclage ou bord artificiel. Aux extrêmes numériques, certaines
cases peuvent donc être stockées mais leur croix complète ne peut être calculée.
Les couleurs autres que `white` et `black` provoquent une `TypeError`. Toute
mutation est validée avant modification du stockage.

Le monde est virtuellement infini ; sa capacité effective dépend de la mémoire
disponible et de cette représentation numérique. Aucune persistance n'est ajoutée.

## Vue du pavage

La vue utilise un Canvas 2D et une caméra distincte du monde. `Camera(width,
height, { x, y })` reçoit les dimensions CSS et éventuellement le centre du monde
affiché (par défaut `(0.5, 0.5)`). Ses opérations sont `screenToWorld`,
`worldToScreen`, `moveBy(dx, dy)`, `zoomAt(x, y, factor)`, `resize(width, height)`
et `recenter()` (retour au centre de `(0, 0)` sans changer l'échelle).
`frame(x, y, scale)` fixe un cadrage validé en une opération. `scale`, `width`,
`height` et `minimumScale` sont en lecture seule. Les [modes automatiques](INTERFACE.md)
calculent le cadrage sans modifier l'état du monde.

- Vue initiale : 32 pixels CSS par case, centrée sur la case `(0, 0)`.
- Bouton gauche maintenu et déplacement : translation du pavage avec capture du
  pointeur. Relâchement, annulation et perte de capture terminent le geste.
- Molette : zoom continu, initialement entre 1 et 160 pixels par case, ancré sous le pointeur.
  La page ne défile pas pendant le zoom dans le Canvas. Les deltas exprimés en
  lignes sont convertis à raison de 16 pixels ; ceux en pages utilisent la hauteur
  de la vue. Le facteur vaut `exp(-deltaPixels × 0.001)`, avec delta borné à ±10000.
  Après un cadrage automatique sous un pixel, `minimumScale` conserve la plus petite
  échelle atteinte pendant la session ; le zoom manuel utilise cette borne.
- Fond blanc ; séparations internes gris clair `#cccccc`, 1 pixel ; frontières
  entre croix gris foncé `#555555`, 2 pixels. Chaque arête n'est dessinée qu'une fois.
  Sous 8 pixels par case, les épaisseurs diminuent proportionnellement à l'échelle
  pour laisser apparaître le fond : `min(1, scale/8)` et `min(2, scale/4)`.
- Repère `#666666` (60 % de noir) dans le coin inférieur gauche de `(0, 0)` :
  décalage `min(6, scale/4)` et rayon `min(3, scale/8)` pixels CSS.

La caméra accepte des nombres finis et des dimensions strictement positives.
Pour conserver une précision sous-pixel, la région visible, augmentée d'une marge
de trois cases, reste dans `[-2^40, 2^40]` sur chaque axe. Une opération hors
limites provoque une `RangeError` sans changer la caméra ; l'interface affiche
le message. Cette limite visuelle ne limite pas le stockage du monde.

Le quadrillage est dessiné avec un motif Canvas de 5 × 5 cases, répétitif sur les
deux axes et mis en cache à l'échelle et à la densité courantes. Son coût ne dépend
pas du nombre de cases blanches visibles, même au dézoom maximal. Seules les cases
noires intersectant la fenêtre sont dessinées. Les demandes de rendu sont
regroupées avec `requestAnimationFrame`, sans boucle au repos. Les changements
de taille et de densité de pixels reconstruisent le tampon Canvas ; le centre
du monde affiché est conservé lors du redimensionnement.

Cette vue ne change aucune couleur. La [refonte de l'interface](INTERFACE.md)
ajoute les trois modes de grille, les centrages et suivis, et Lanto, dessiné au
centre de sa case à 90 % de son côté. Lanto reste à l'origine dans l'application
actuelle. Le moteur, l'édition des cases, le déplacement effectif de la fourmi
et les gestes tactiles complets restent à développer.
