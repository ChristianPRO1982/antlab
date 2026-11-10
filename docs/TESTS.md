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

Les parcours Chromium vérifient le chargement, les couleurs réellement dessinées,
le repère d'origine, la différence d'épaisseur des frontières, le glissement hors
zone, la fin/annulation du geste, le zoom avec retour depuis son minimum de
1 pixel par case, le redimensionnement et une densité
de pixels de 2 sur fenêtre étroite. Ils peuvent cibler Vite ou l'image Nginx.
Les captures `test-results/pavage.png` et `test-results/pavage-densite-2.png`
permettent une inspection visuelle sans figer un instantané de référence.

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

Le lot présent ne valide aucune trajectoire de fourmi ni résultat de KPI.
Les scénarios scientifiques arriveront avec leurs implémentations.
