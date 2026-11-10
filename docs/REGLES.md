# Catalogue de règles élémentaires

## Catalogue et versions

`getRuleCatalog()` dans `src/rules.js` retourne les six règles disponibles,
dans l'ordre du tableau ci-dessous. Chaque entrée contient `id`, `version`,
`name`, `description` et `category`. La règle optionnelle contient aussi
`compatibleCentralRules`, la liste de ses règles centrales compatibles.
Les deux règles de majorité exposent aussi
`parameters.threshold: { choices: [1, 2, 3, 4, 5], default: 3 }`.
Les objets et tableaux retournés sont indépendants du catalogue interne et
ne contiennent aucune fonction de calcul.

| Identifiant                 | Version | Catégorie  | Effet lors d'une visite du centre                                                            |
| --------------------------- | ------- | ---------- | -------------------------------------------------------------------------------------------- |
| `single-flip`               | 1       | `central`  | Inverser uniquement le centre.                                                               |
| `cross-flip`                | 1       | `central`  | Inverser individuellement chacune des cinq cases.                                            |
| `center-master`             | 1       | `central`  | Donner aux cinq cases la couleur opposée à l'ancienne couleur du centre.                     |
| `inverted-majority`         | 2       | `central`  | Si le seuil de cases noires est atteint, donner du blanc aux cinq cases ; sinon, du noir.    |
| `majority-wins`             | 1       | `central`  | Si le seuil de cases noires est atteint, donner du noir aux cinq cases ; sinon, du blanc.    |
| `rotate-branches-clockwise` | 1       | `optional` | Transférer les anciennes couleurs des branches dans le sens nord → est → sud → ouest → nord. |

La catégorie `central` est exclusive : exactement une règle est active.
La rotation est facultative et compatible uniquement avec `single-flip`.
Les quatre autres règles centrales transforment déjà les branches ; leur
combinaison avec cette permutation est refusée, sans priorité implicite entre
effets concurrents. La rotation ne change pas la couleur du centre et conserve
le nombre de branches noires.

Sur une branche, toutes les configurations inversent uniquement la case visitée.
La règle facultative ne s'applique que lors d'une visite du centre.

Les identifiants et la version décrivent les définitions ci-dessus. Une évolution
qui change leur sens scientifique devra introduire un nouvel identifiant ou une
nouvelle version, sans réinterpréter silencieusement une ancienne expérience.
Ce lot n'implémente ni format d'échange versionné ni chargement d'anciennes versions.
`inverted-majority` passe de la version 1 (seuil fixe à 3) à la version 2 (seuil
configurable). Sans seuil explicite, son comportement reste identique.

## Configuration du moteur

```js
import { LangtonEngine } from './src/engine.js';
import { getRuleCatalog } from './src/rules.js';

const engine = new LangtonEngine({
  rules: {
    central: 'single-flip',
    optional: ['rotate-branches-clockwise'],
  },
});
console.log(getRuleCatalog());
console.log(engine.getRules());
```

Sans `rules`, ou avec `rules: {}`, le moteur utilise
`{ central: 'single-flip', optional: [] }` : les trajectoires de Langton du lot 03
restent identiques. Les propriétés omises ou `undefined` utilisent
leur valeur par défaut. `rules` accepte uniquement `central`, `optional` et
le paramètre `threshold` réservé aux deux règles de majorité ;
`central` est un identifiant de règle centrale, `optional` un tableau sans doublon
d'identifiants de règles optionnelles.

Pour les deux règles de majorité, `threshold` est le nombre minimal de cases
noires, **centre inclus**, qui déclenche la décision : `nombreNoires >= threshold`.
Il accepte uniquement les nombres entiers **1, 2, 3, 4 ou 5**, avec **3 par défaut**.
Un seuil de 1 signifie qu'une seule case noire suffit ; un seuil de 5 exige que
les cinq soient noires. La décision utilise toujours les anciennes couleurs.

```js
const engine = new LangtonEngine({
  rules: { central: 'majority-wins', threshold: 2 },
});
engine.getRules(); // { central: 'majority-wins', optional: [], threshold: 2 }
```

`getRules()` inclut le seuil effectif pour les deux majorités. Un seuil fourni
pour une autre règle est refusé avec une `TypeError`. Pour une majorité, un
seuil d'un autre type provoque une `TypeError` ; un nombre hors des cinq choix
provoque une `RangeError`. Il n'y a aucune conversion implicite.

Les structures, champs et identifiants incorrects, les catégories incorrectes,
les doublons et les combinaisons incompatibles provoquent une `TypeError`
explicite dès la construction. La configuration est copiée. `getRules()` renvoie
une nouvelle copie normalisée : la modifier ne change aucune transition.
La configuration est fixe pendant la vie du moteur ; le changement de règles
en cours d'expérience relève de l'étape 08.

`getState()` conserve sa forme `{ ant, stepCount, blackCells }`. La configuration
se lit séparément par `getRules()` ; les versions se trouvent dans le catalogue.

## État observé, ordre et atomicité

Le [pavage existant](GEOMETRIE_MONDE.md) définit les centres et l'ordre des cases :
centre, nord, est, sud, ouest. Les déplacements restent ceux de Langton : blanc
→ droite, noir → gauche, selon la couleur de la case visitée avant transformation.

Lorsqu'une transformation a besoin de la croix, le moteur valide ses cinq
coordonnées et lit ses cinq anciennes couleurs. La règle centrale et la rotation
éventuelle utilisent ce même état initial : aucun effet ne relit une couleur
déjà transformée. Pour la rotation, la nouvelle couleur du nord est l'ancienne
couleur de l'ouest, celle de l'est vient du nord, celle du sud de l'est, et celle
de l'ouest du sud. Le centre conserve le résultat de l'inversion simple.

Toutes les écritures et la destination sont préparées avant mutation. Ensuite,
le moteur tourne la fourmi, applique les couleurs dans l'ordre centre, nord,
est, sud, ouest, avance et incrémente le compteur. Les blancs sont retirés du
stockage clairsemé. Une destination peut déjà avoir changé de couleur comme
voisine du centre ; l'arrivée ne déclenche aucune seconde application de règle.

Une croix complète n'est calculée que lorsque nécessaire : sur une branche, ou
avec l'inversion simple sans option, seuls la case visitée et le déplacement
sont requis. Une croix hors domaine numérique est refusée sans mutation d'un
pas qui en a besoin. Les pas précédemment terminés dans un lot restent acquis.
Voir les [limites numériques du moteur](MOTEUR.md).

## Exemple Docker et vérification manuelle

Après la [préparation Docker](DEVELOPPEMENT.md), lancer cette comparaison depuis
la racine du dépôt. Chaque moteur démarre sur un centre blanc dont les branches
nord, est et sud sont noires ; l'ouest est blanc.

```sh
docker compose run --rm tools node --input-type=module <<'JS'
import { LangtonEngine } from './src/engine.js';
const configurations = [
  { central: 'single-flip' },
  { central: 'cross-flip' },
  { central: 'center-master' },
  { central: 'inverted-majority' },
  { central: 'majority-wins' },
  { central: 'single-flip', optional: ['rotate-branches-clockwise'] },
];
for (const rules of configurations) {
  const engine = new LangtonEngine({
    blackCells: [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
    rules,
  });
  engine.step();
  console.log(JSON.stringify({ rules: engine.getRules(), state: engine.getState() }));
}
JS
```

Dans les six cas, le compteur vaut `1` et la fourmi est en `(1, 0)` orientée
`east` : le centre était blanc. Les cases noires attendues sont :

| Configuration                | Cases noires après le pas | Nombre |
| ---------------------------- | ------------------------- | ------ |
| Inversion simple             | Centre, nord, est, sud    | 4      |
| Inversion collective         | Centre, ouest             | 2      |
| Centre maître                | Les cinq cases            | 5      |
| Majorité inversée            | Aucune                    | 0      |
| Majorité l'emporte (seuil 3) | Les cinq cases            | 5      |
| Inversion simple + rotation  | Centre, est, sud, ouest   | 4      |

Relancer la commande doit donner le même état complet et le même ordre
d'énumération. Pour vérifier une incompatibilité, remplacer la règle centrale
du dernier cas par `cross-flip` : la construction doit lever une `TypeError`
indiquant l'incompatibilité.

Tests ciblés :

```sh
docker compose run --rm tools npm run test:unit -- tests/unit/rules.test.js tests/unit/engine-rules.test.js tests/unit/majority.test.js
```
