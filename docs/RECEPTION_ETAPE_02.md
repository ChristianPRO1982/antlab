# Réception de l'étape 02

Lot vérifié le **10 novembre 2026**, sur la branche `feat/geometry-world`.

## Fonctionnalités

- Pavage de croix : X vers la droite, Y vers le haut, centres définis par
  `x + 2y ≡ 0 mod 5`, propriétaire unique et positions explicites.
- Monde blanc implicite ; seules les cases noires sont stockées. Lecture,
  écriture, inversion et compteur sans dépendance graphique.
- Validation stricte des coordonnées et couleurs, limites numériques explicites,
  sans mutation partielle en cas d'erreur.
- Extension visuelle demandée : Canvas navigable par glissement gauche,
  zoom à la molette ancré au pointeur, contours des croix de 2 pixels contre
  1 pixel en interne, repère gris à l'intérieur du coin inférieur gauche de `(0, 0)`.
- Rendu limité à la fenêtre visible, redimensionnement et densité de pixels gérés.
  Aucun calcul scientifique ne dépend de la caméra.

## Tests et résultats

Le cycle TDD a été suivi : les trois suites unitaires ont d'abord échoué sur
l'absence des modules, puis les quatre premiers parcours navigateur sur
l'absence de la nouvelle page et de son Canvas. Après implémentation, les suites
passent. Les contrôles complémentaires couvrent aussi la perte de capture et
les écrans à densité double.

Un jeu de coordonnées de dépassement du test initial a été corrigé après calcul
des résidus : `(MAX_SAFE_INTEGER, 1)` appartient au centre représentable
`(MAX_SAFE_INTEGER, 2)` ; `(MAX_SAFE_INTEGER, 4)` nécessite au contraire un centre
hors domaine. Les deux situations sont désormais testées explicitement.

| Vérification           | Résultat                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Vitest                 | 32 tests réussis : géométrie (24), monde (4), caméra (4)                                                              |
| Couverture géométrique | Une seule croix par case sur une fenêtre de 41 × 41 cases, incluant les négatifs ; preuve par résidus documentée      |
| Limites numériques     | Congruences comparées à un oracle BigInt ; dépassements refusés                                                       |
| Playwright Chromium    | 5 parcours réussis : rendu, glissement hors zone, zoom/redimensionnement, annulation/perte de capture, densité double |
| ESLint et Prettier     | Réussis                                                                                                               |
| Build Vite             | Réussi                                                                                                                |
| Contrôle global        | `docker compose run --rm test` réussi                                                                                 |
| Inspection visuelle    | Captures bureau et fenêtre étroite à densité double inspectées ; contours et repère présents                          |

Les tests s'exécutent exclusivement via Docker. `passWithNoTests` a été retiré.
Les captures non suivies sont dans `test-results/pavage.png` et
`test-results/pavage-densite-2.png` ; les tests inspectent aussi les pixels du
Canvas sans instantané de référence. Aucun test n'impose un débit CPU ou un
nombre d'images par seconde.

## Limites et vérifications restantes

- Monde limité aux entiers sûrs JavaScript et aux ressources mémoire disponibles.
  La caméra utilise une limite plus conservatrice de ±2^40 pour préserver la
  précision sous-pixel. Zoom entre 1 et 160 pixels CSS par case.
- Contrôles automatisés exécutés sur Chromium ; autres navigateurs et gestes
  tactiles complets non validés. L'étape 06 reste ouverte.
- Fluidité subjective avec une souris physique, pavé tactile et écran réel
  à confirmer manuellement ; aucun benchmark de performance n'est revendiqué.
- Pas de moteur, de fourmi, de Worker ou d'export/import. L'équivalence des modes
  de simulation ne peut pas encore être vérifiée.
- Le build statique a été vérifié ; aucune nouvelle image Nginx n'a été construite
  ou testée pour ce lot. Aucun commit, push, release ou déploiement réalisé.

Pour une vérification manuelle, lancer l'interface selon
[DEVELOPPEMENT.md](DEVELOPPEMENT.md), glisser le pavage, sortir de la zone avant
de relâcher le bouton, puis zoomer autour d'un point choisi. Vérifier le repère
et les contours à plusieurs échelles. Les conventions détaillées sont dans
[GEOMETRIE_MONDE.md](GEOMETRIE_MONDE.md).

## Ajustement du dézoom après essai utilisateur

Les premiers essais utilisateur sont validés, avec un dézoom jugé trop limité.
Le minimum passe de 8 à 1 pixel CSS par case : huit fois plus de largeur et de
hauteur visibles, soit 64 fois plus de surface. Un motif répétitif mis en cache
remplace l'énumération du quadrillage blanc ; les cases noires sont parcourues
par un itérateur dédié. Sous huit pixels par case, les traits s'affinent.

Les nouveaux tests ont d'abord constaté la borne précédente de 8 pixels et
l'absence de l'itérateur. Le contrôle global passe ensuite avec **34 tests
unitaires et 6 parcours Chromium**, dont le dézoom maximal puis le retour à
l'échelle initiale. La capture `test-results/pavage-dezoom.png` a été inspectée.
À un pixel par case, les détails des croix et du repère ne sont plus discernables
individuellement ; zoomer à nouveau les restitue. Le nouveau minimum reste à
apprécier manuellement sur le matériel de l'utilisateur.
