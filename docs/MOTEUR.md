# Moteur déterministe

## Conditions initiales et API

`src/engine.js` expose `LangtonEngine`, un module ES autonome qui utilise
`SparseWorld` et la validation des coordonnées existante. Il ne dépend ni du DOM,
du Canvas, d'un Worker, d'une horloge ou d'un générateur aléatoire.

```js
import { LangtonEngine } from './src/engine.js';

const engine = new LangtonEngine({
  ant: { x: 0, y: 0, orientation: 'north' },
  blackCells: [],
});
engine.step(); // 1
engine.advance(4); // 5
engine.getState();
```

Les deux propriétés du constructeur sont facultatives : leur omission (ou
`undefined`) utilise les valeurs de cet exemple. Si `ant` est fourni, ses trois
champs sont obligatoires. Le compteur commence toujours à zéro ; il n'y a pas de
restauration d'un état avancé dans ce lot.

| Opération                                | Comportement                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `new LangtonEngine({ ant, blackCells })` | Copie la fourmi et un tableau de cases noires `{ x, y }` ; les doublons désignent une seule case noire.             |
| `step()`                                 | Effectue une transition complète et renvoie le compteur atteint.                                                    |
| `advance(count)`                         | Effectue exactement `count` transitions supplémentaires et renvoie le compteur atteint ; zéro ne change rien.       |
| `getState()`                             | Renvoie `{ ant: { x, y, orientation }, stepCount, blackCells }`, une copie complète indépendante de l'état courant. |

Chaque instance possède son monde et son état privés. Modifier les données
initiales ou une copie retournée n'altère pas la simulation. Les cases noires
sont énumérées dans l'ordre d'insertion du monde, sans tri spatial ; un même
état initial et une même séquence produisent le même ordre. `getState()` copie
toutes les cases noires : son coût dépend de leur nombre. Ce n'est ni un format
d'export versionné ni une API d'import.

## Transition de Langton

X augmente vers la droite, Y vers le haut. Les orientations sont `north`, `east`,
`south` et `west`. Une étape est une transition complète :

1. Lire la couleur de la case sous la fourmi **avant** toute transformation.
2. Tourner de 90° : à droite sur blanc, à gauche sur noir.
3. Inverser uniquement la couleur de la case visitée.
4. Avancer d'une case dans la nouvelle orientation.
5. Incrémenter le compteur d'une unité.

La même règle s'applique aux centres et aux branches. La case d'arrivée n'est
transformée qu'à la transition suivante. Toutes les décisions et la destination
sont calculées et validées avant de modifier l'état du pas.

Depuis le départ standard, les états de la fourmi sont :

| Étape | X   | Y   | Orientation | Cases noires |
| ----- | --- | --- | ----------- | ------------ |
| 0     | 0   | 0   | north       | 0            |
| 1     | 1   | 0   | east        | 1            |
| 2     | 1   | -1  | south       | 2            |
| 3     | 0   | -1  | west        | 3            |
| 4     | 0   | 0   | north       | 4            |
| 5     | -1  | 0   | west        | 3            |

À l'étape 5, l'origine a été inversée deux fois et est redevenue blanche.

## Validation et limites

Les coordonnées suivent le [domaine du monde](GEOMETRIE_MONDE.md) : des `Number`
entiers sûrs entre `-9007199254740991` et `9007199254740991`, sans conversion
implicite ; `-0` est normalisé en `0`. Le compteur et le nombre de transitions
sont des entiers sûrs positifs ou nuls. Les types incorrects, orientations
inconnues et structures invalides provoquent une `TypeError` ; les nombres hors
domaine provoquent une `RangeError`.

Avant un lot, `advance` vérifie que le compteur final demandé reste représentable.
Un nombre invalide ou ce dépassement est refusé sans calcul ni mutation. Chaque
pas vérifie aussi sa destination avant d'inverser une case, de tourner ou
d'incrémenter : une destination hors domaine laisse le pas intact. Si cette
erreur arrive après des transitions réussies dans un lot, celles-ci restent
acquises ; `getState()` donne l'étape réellement atteinte. Aucun arrondi ni
bouclage n'est effectué aux limites.

Le monde reste limité par la mémoire disponible. Le calcul est synchrone ;
`advance` sur un grand nombre de pas peut monopoliser son thread. Le Worker et
le pilotage des calculs longs viendront à l'étape 05. Le moteur n'est pas encore
relié à l'interface ; le catalogue de règles relève de l'étape 04.

## Vérification via Docker

Après la préparation décrite dans [Développement](DEVELOPPEMENT.md), exécuter :

```sh
docker compose run --rm tools node --input-type=module <<'JS'
import { LangtonEngine } from './src/engine.js';
const engine = new LangtonEngine();
console.log('Étape atteinte :', engine.advance(5));
console.log(JSON.stringify(engine.getState(), null, 2));
JS
```

Le résultat attendu est l'étape `5`, une fourmi en `(-1, 0)` orientée `west`,
et les cases noires `(1, 0)`, `(1, -1)`, `(0, -1)` dans cet ordre.
Relancer la commande doit produire exactement le même résultat.

Tests du moteur seuls :

```sh
docker compose run --rm tools npm run test:unit -- tests/unit/engine.test.js
```
