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
panneau à 15 % et le tiroir mobile. Les commandes de simulation sont vérifiées
comme désactivées. Les captures `test-results/design-*.png` présentent les pages
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
réels) et neuf tests du client (transport simulé, corrélation et erreurs).
Les 19 nouveaux parcours Chromium utilisent un véritable Worker sous Vite :
14 configurations scientifiques comparées au moteur synchrone, paliers exacts
jusqu'au million et cible libre, navigation/zoom pendant calcul continu,
pause/reprise, annulation, erreur partielle et validation du protocole.
Les attentes utilisent les acquittements et le nombre exact de pas atteint,
sans supposer une vitesse de calcul. Voir la [réception de l'étape 05](RECEPTION_ETAPE_05.md).

Les fixtures Worker importent les sources sous Vite : elles sont explicitement
ignorées avec `TEST_BASE_URL` sur une image de production tant que le client
n'est pas raccordé au site. Les parcours de l'interface existante continuent
à viser Vite ou Nginx. L'équivalence des futures campagnes et les KPI restent
à vérifier lors de leurs lots.
