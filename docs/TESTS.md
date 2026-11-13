# Tests et TDD

## Cycle obligatoire

1. Définir un comportement et le résultat attendu.
2. Écrire le test avant le code et constater son échec pour la bonne raison.
3. Implémenter le minimum pour le faire passer.
4. Refactoriser puis relancer les tests pertinents.
5. Lancer les contrôles locaux complets avant la PR.

Vitest exécutera les tests `tests/unit/**/*.test.js` et
`tests/integration/**/*.test.js`. Playwright exécute les tests de `tests/e2e`.
Ne pas dépendre du débit CPU, du temps écoulé ou de l'ordre des tâches parallèles
pour les résultats scientifiques. Tester cas limites, invariants et reproductibilité.

## Tests actuels

Les tests unitaires couvrent le pavage (couverture unique, coordonnées négatives,
limites numériques), le stockage clairsemé (blanc implicite, suppressions,
inversions, validation sans mutation) et la caméra (conversions, déplacements,
ancrage du zoom et limites). `passWithNoTests` a été retiré.

Les tests du panneau vérifient les bornes 15–50 %, le seuil clic/glissement,
l'annulation d'un geste, la restauration de largeur, le clavier et les états
mobile/ordinateur séparés. La caméra teste aussi le recentrage sans changement
d'échelle.

Les tests de cadrage vérifient les modes exclusifs, le suivi de positions
successives, les bornes noires actuelles, leur agrandissement/rétrécissement,
le monde blanc, les marges, le redimensionnement, le zoom inférieur à un pixel
et ses limites numériques. Les fixtures modifient positions et couleurs sans
ajouter de moteur ; le cadrage est vérifié sans mutation du monde.

Les parcours Chromium vérifient le chargement, les couleurs réellement dessinées,
le repère d'origine, la différence d'épaisseur des frontières, le glissement hors
zone, la fin/annulation du geste, le zoom avec retour depuis son minimum de
1 pixel par case, le redimensionnement et une densité
de pixels de 2 sur fenêtre étroite. Ils peuvent cibler Vite ou l'image Nginx.
Les captures `test-results/pavage.png` et `test-results/pavage-densite-2.png`
permettent une inspection visuelle sans figer un instantané de référence.

Les parcours de la [refonte](INTERFACE.md) couvrent aussi les trois pages,
l'historique, le logo/favicon, les réglages visuels, la conservation de la caméra
et du panneau, le défilement des options sans déplacement des commandes, le
panneau à 15 % et le tiroir mobile. Les commandes de simulation sont raccordées au Worker et testées par les
parcours du laboratoire. Les captures `test-results/design-*.png` présentent les pages
sur ordinateur et mobile.

Les corrections du panneau ajoutent les trois modes de grille, les boutons de
cadrage alignés, le double-clic/Maj+Entrée, les états bleus et leur annulation par
navigation manuelle. Une fixture de règles longue vérifie le défilement de la
seule zone des règles ; affichage, vue et commandes restent fixes. Les captures
`test-results/cadrage-*.png` montrent le cadrage actif, le bouton flottant en bas
à droite et la disposition à petite hauteur.

```sh
docker compose run --rm test
```

Cette commande lance ESLint, la vérification Prettier, Vitest, Playwright et le
build. Les outils de vérification ne réécrivent pas le code. Les échecs Playwright
produisent une trace dans `test-results`, consultable avec les outils Playwright.

## Vérifier l'image de production

```sh
docker compose --profile preview up --build --wait preview
docker compose run --rm -e TEST_BASE_URL=http://preview:8080 test npm run test:e2e
docker compose --profile preview down
```

Avec `TEST_BASE_URL`, Playwright ne démarre pas Vite. Le test utilise les fichiers
réellement construits et servis par Nginx. Prévisualisation locale :
<http://localhost:8080>.

## Réception et limites

Ne cocher les critères de roadmap qu'après vérification réelle. Distinguer tests
automatisés, contrôles manuels et limitations de l'environnement. Ne jamais changer
une valeur attendue uniquement pour obtenir un test vert.

Les 25 tests du moteur vérifient le départ standard et les conditions initiales
personnalisées, les huit rotations couleur/orientation, les cinq premiers pas
connus et le retour au blanc, l'inversion simple d'un centre, l'indépendance des
instances et des copies d'état, les entrées invalides et les limites numériques.
Ils comparent une séquence complète répétée et 10 000 transitions calculées
pas à pas, en un lot ou en plusieurs lots depuis deux configurations.
Le calcul s'exécute en environnement Node sans DOM ; les appels à `Date.now`,
`performance.now` et `Math.random` sont rendus interdits dans un test dédié.
L'absence de mutation lors d'un pas refusé et la conservation des pas achevés
dans un lot interrompu sont vérifiées. Le cycle TDD et les résultats figurent
dans la [réception de l'étape 03](RECEPTION_ETAPE_03.md).

Les suites du catalogue couvrent 1 021 tests : neuf de catalogue et validation,
356 d'intégration moteur/règles et 656 consacrés aux majorités. Les quatre transformations centrales initiales et
l'inversion simple combinée à la rotation sont vérifiées pour les 32 motifs
binaires de la croix, à l'origine et sur un centre négatif. Les autres cas
couvrent les branches, les copies de configuration, les incompatibilités,
l'ordre des écritures, la conservation des couleurs des branches lors de la
rotation et les limites numériques sans mutation partielle. Pour chacune des
six configurations sans seuil explicite, répétabilité et équivalence à 10 000 pas sont vérifiées,
avec calcul par pas individuels, en un lot ou en plusieurs lots, sans horloge
ni hasard. Voir la [réception de l'étape 04](RECEPTION_ETAPE_04.md).

Les deux majorités sont aussi testées sur tous les motifs et aux cinq seuils,
à l'origine et sur un centre négatif (640 transformations). Les autres tests
de majorité vérifient les métadonnées, les versions, les copies, la valeur par
défaut et les seuils invalides ; pour les dix couples règle/seuil, ils comparent
10 000 pas individuels à un lot unique et à plusieurs lots.

Le pilotage ajoute 26 tests du contrôleur (timers virtuels et états scientifiques
réels) et dix tests du client (transport simulé, corrélation, erreurs et panne au repos).
Les 19 nouveaux parcours Chromium utilisent un véritable Worker sous Vite :
14 configurations scientifiques comparées au moteur synchrone, paliers exacts
jusqu'au million et cible libre, navigation/zoom pendant calcul continu,
pause/reprise, annulation, erreur partielle et validation du protocole.
Les attentes utilisent les acquittements et le nombre exact de pas atteint,
sans supposer une vitesse de calcul. Voir la [réception de l'étape 05](RECEPTION_ETAPE_05.md).

Le lot 06 ajoute 34 tests unitaires : gestes/caméra (4), scènes et rendu (6),
synchronisation (21), panne au repos du client (1) et aperçu sous-pixel (2).
Les 14 configurations
scientifiques sont comparées à état final exact avec la vue active, ralentie
ou masquée. Les tests de synchronisation utilisent des timers virtuels et des
lectures contrôlées, sans remplacer la fourmi depuis la progression compacte.

Les neuf nouveaux parcours de visualisation vérifient les états effectivement
dessinés, le suivi, les bornes, le million de pas masqué, la visibilité du
document, la fermeture pendant capture et les gestes multitactiles réellement
injectés dans Chromium. L'audit ajoute la navigation après fermeture et le rendu
sans image de Lanto disponible, ainsi que la protection de la cadence minimale.
Les captures `visualisation-*.png` ne sont pas des
instantanés de référence. Voir la [réception du lot 06](RECEPTION_ETAPE_06.md).

L'inspection du premier aperçu au million a détecté la disparition des cases
sous-pixel. Deux tests couvrent leur projection sur les pixels physiques aux
densités 1 et 2 ; le parcours du million vérifie aussi des pixels sombres avant
la capture, après application du cadrage.

Les fixtures qui importent les sources sont ignorées avec `TEST_BASE_URL` sur
Nginx. Les parcours du site, y compris le chargement de son Worker compilé et
la navigation tactile, s'y exécutent sans ces imports. Les futures campagnes
et les KPI restent à vérifier lors de leurs lots.

## Poste de pilotage (lot 07)

Vitest vérifie les six cadences avec timers virtuels et comparaison scientifique,
la modification atomique des options et l’invalidation des timers, les
remplacements de session, les notifications tardives, les pannes et la fermeture.
Le transport du client couvre aussi `setExecutionOptions`.

Les parcours `laboratory.spec.js` utilisent le vrai Worker sans import de sources :
règles et incompatibilités, seuils, verrouillage, premiers pas, cibles exactes,
validation, vitesse, pause/reprise, annulation, reset, clavier, mobile et pannes.
Ils sont également exécutables contre Nginx. Les fixtures de visualisation
demandent explicitement la cadence maximale pour leurs longs calculs via API.
Voir le [bilan du lot 07](RECEPTION_ETAPE_07.md).

## Vérification de l’orientation de Lanto — 12 novembre 2026

Le signalement « Lanto regarde toujours vers le haut » n’est pas reproduit sur
`fix/stages-01-07` sous Chromium/Vite. Le rendu existant transmet l’orientation
de l’instantané au Canvas et tourne le sprite, dont la tête pointe vers le haut,
de 0°, 90°, 180° ou 270°. Aucun correctif de production n’a été nécessaire ;
l’ordre scientifique et les trajectoires restent inchangés.

Le nouveau parcours de `laboratory.spec.js` compare les silhouettes bleues
effectivement dessinées à celles du vrai sprite tourné sur un Canvas de référence.
Il vérifie les cinq premiers pas (les quatre directions), la pause et le retour
au nord après réinitialisation. La comparaison tolère 3 % de différence sur les
pixels bleus pour les contours composités sur fond blanc ou noir ; elle exige
aussi la présence du sprite. Aucun délai ou animation n’est ajouté au produit.
Les captures `test-results/lanto-orientation-1.png` à
`test-results/lanto-orientation-4.png` montrent les quatre orientations ; celles
des deux premiers pas ont été inspectées visuellement.

Le parcours passe sur le code existant. Une désactivation temporaire de la
rotation le fait échouer au premier déplacement (environ 82 % de différence,
pour un seuil de 3 %). La rotation d’origine a ensuite été restaurée intégralement.
Cet échec provoqué vérifie la sensibilité du test ; il ne reproduit pas un défaut
présent dans le code actuel.

Contrôles exécutés via Docker : ESLint et Prettier réussis, 1 187 tests Vitest
réussis, 56 parcours Chromium réussis sur 57, dont le nouveau parcours. Le test
existant « scènes remplacées atomiquement et cadrage des bornes qui grandissent
puis rétrécissent » échoue : zoom obtenu 32 au lieu de 160. Son exécution isolée
échoue également ; ce point de cadrage reste à traiter séparément. Le build Vite,
relancé séparément car le contrôle global s’arrête au test en échec, réussit.

L’utilisateur a validé ce point après la vérification. Aucun test sur le site
déployé ni sur un autre navigateur, aucune publication et aucune modification
des critères de roadmap.

## Stabilité du panneau pendant les calculs — 12 novembre 2026

Le scintillement provenait de la hauteur variable du pied du panneau : la ligne
« Étape affichée » apparaissait lorsque le Canvas était en retard, puis
disparaissait à son rattrapage. La barre de cible ajoutait également de la hauteur,
y compris lors d’un pas unique. Leurs emplacements sont désormais réservés.
Les compteurs possèdent une disposition stable et des chiffres tabulaires ; les
nombres restent sur une ligne jusqu’à `Number.MAX_SAFE_INTEGER`. Le statut est
empilé sous le titre sur panneau étroit et les compteurs sont compacts à faible
hauteur. Le moteur, les messages Worker et les cadences sont inchangés.

Les quatre nouveaux parcours de `panel-stability.spec.js` ont d’abord échoué
avant correction : déplacements des trois sections fixes de 34,94 pixels sur
panneau large, mobile et faible hauteur, et de 58,44 pixels sur panneau étroit.
Ils retiennent une vraie réponse d’instantané du Worker par une promesse de test,
puis la libèrent explicitement : le retard ne dépend pas de la vitesse du CPU.
Les positions sont mesurées à chaque frame, pendant le retard et le rattrapage.

Après correction, les variations sont nulles dans les quatre dispositions :
1440 × 900 à 28 %, 1000 × 800 à 15 %, mobile 390 × 700 et 1000 × 430 à 28 %.
Les mêmes parcours vérifient lecture lente, pause/reprise, annulation et cible
exacte à 5 000 en cadence Maximum. Une fixture modifie uniquement les textes
des compteurs jusqu’à l’entier sûr maximal et vérifie stabilité, absence de
débordement horizontal et maintien des commandes dans le panneau visible.
Les captures `test-results/panneau-stable-*.png` sont produites ; celles du
panneau étroit et de la faible hauteur ont été inspectées visuellement.

Contrôles via Docker : ESLint et Prettier réussis, 1 187 tests Vitest réussis,
60 parcours Chromium réussis sur 61, dont les quatre nouveaux. Le test existant
de scènes/cadrage (`visualization.spec.js:90`), déjà en échec avant ce correctif,
échoue encore : étape affichée 0 au lieu de la scène injectée à 11. Sa fixture
reste à traiter séparément. Le contrôle global s’arrête donc avant le build ;
le build Vite exécuté séparément réussit. Les critères de roadmap sont inchangés.

Vérification manuelle proposée : lancer à 1 pas/s, observer le pied du panneau,
mettre en pause puis reprendre et atteindre une cible en Maximum ; refaire avec
le panneau rétréci et sur téléphone. La validation automatisée porte sur Chromium
sous Vite ; les autres navigateurs et les appareils physiques restent à vérifier.

## Couleur des contours des croix — 12 novembre 2026

Les contours renforcés ont été passés du gris sombre au bleu électrique, puis
ajustés par l’utilisateur à `#064894`, valeur de référence actuelle. Les traits
fins restent gris et les épaisseurs sont conservées.

Le test de pavage a d’abord échoué sur l’absence de composante bleue des contours,
puis les six parcours de `paving.spec.js` ont réussi après modification. Le test
vérifie les pixels du contour et son épaisseur relative ; sa normalisation tient
compte de la couleur. Sa requête de version GitHub est simulée pour éviter qu’un
refus externe HTTP 403 ne fasse échouer ce contrôle graphique. Cette modification
ne change ni les cellules ni les règles scientifiques.

## Quatre boutons d’affichage — 12 novembre 2026

Le sélecteur exclusif et les cases à cocher sont remplacés par quatre boutons
indépendants, tous actifs au départ. Les options visuelles booléennes sont
`grid`, `outlines`, `origin` et `lanto`. Les contours seuls sont désormais
possibles ; la teinte utilisateur `#064894` est conservée.

Le parcours de `display-buttons.spec.js` a d’abord échoué sur l’absence des
quatre boutons. Après implémentation, les deux parcours vérifient les quatre
combinaisons par les pixels gris/bleus, l’activation clavier, les états accessibles,
l’alignement bureau/mobile/faible hauteur, la conservation après navigation et
reset, le refus d’un booléen invalide et l’absence de modification de l’état
scientifique. Les anciens appels et parcours de grille sont adaptés.

Contrôles Docker : lint, format et 1 187 tests Vitest réussis ; 61 parcours
Chromium sur 62 réussis dans la suite complète, dont les quatre de stabilité du
panneau. Le seul échec reste le test de cadrage préexistant (scène injectée à 11
remplacée par l’étape 0). Le test complémentaire de conservation, ajouté ensuite,
et le parcours d’affichage final passent ensemble (2/2). Build Vite séparé réussi.
Captures produites dans `test-results/affichage-*.png`. La validation reste limitée
à Chromium ; confort sur appareils physiques et autres navigateurs à vérifier.
Aucune publication ni modification des critères de roadmap.

## Édition manuelle (lot 07 bis)

Les tests de `manual-editing.test.js` couvrent le moteur et son contrôleur ;
`editing.spec.js` utilise le vrai Worker pour les outils souris et tactiles.
Voir les résultats et limites dans le [bilan du lot 07 bis](RECEPTION_ETAPE_07_BIS.md).
Le test de cadrage historique utilise désormais une source de scènes contrôlée,
sans modifier ses valeurs attendues.
