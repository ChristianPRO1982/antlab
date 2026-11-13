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
  rules: { central: 'single-flip', optional: [] },
});
engine.step(); // 1
engine.advance(4); // 5
engine.getState();
```

Les trois propriétés du constructeur sont facultatives : leur omission (ou
`undefined`) utilise les valeurs de cet exemple. Si `ant` est fourni, ses trois
champs sont obligatoires. Le compteur commence toujours à zéro ; il n'y a pas de
restauration d'un état avancé dans ce lot.

| Opération                                       | Comportement                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `new LangtonEngine({ ant, blackCells, rules })` | Copie la fourmi, les cases noires et la configuration des règles ; les doublons de cases noires désignent une seule case. |
| `step()`                                        | Effectue une transition complète et renvoie le compteur atteint.                                                          |
| `advance(count)`                                | Effectue exactement `count` transitions supplémentaires et renvoie le compteur atteint ; zéro ne change rien.             |
| `getState()`                                    | Renvoie `{ ant: { x, y, orientation }, stepCount, blackCells }`, une copie complète indépendante de l'état courant.       |
| `getRules()`                                    | Renvoie une copie de la sélection `{ central, optional }`, fixée à la construction.                                       |

Chaque instance possède son monde et son état privés. Modifier les données
initiales ou une copie retournée n'altère pas la simulation. `getProgress()`
retourne `{ ant, stepCount, blackCellCount }` en coût constant, sans copier les
cases noires ; sa fourmi est également une copie indépendante. Les cases noires
sont énumérées dans l'ordre d'insertion du monde, sans tri spatial ; un même
état initial et une même séquence produisent le même ordre. `getState()` copie
toutes les cases noires : son coût dépend de leur nombre. Ce n'est ni un format
d'export versionné ni une API d'import.

## Transition de Langton

X augmente vers la droite, Y vers le haut. Les orientations sont `north`, `east`,
`south` et `west`. Une étape est une transition complète :

1. Lire la couleur de la case sous la fourmi **avant** toute transformation.
2. Tourner de 90° : à droite sur blanc, à gauche sur noir.
3. Transformer les couleurs selon les règles sélectionnées, à partir de l'état initial du pas.
4. Avancer d'une case dans la nouvelle orientation.
5. Incrémenter le compteur d'une unité.

Par défaut, centres et branches utilisent l'inversion simple, sans autre effet.
Le [catalogue de règles](REGLES.md) permet de choisir une autre transformation
centrale et une permutation facultative des couleurs des branches.
Les deux règles de majorité acceptent `rules.threshold` parmi 1, 2, 3, 4 ou 5,
avec 3 par défaut ; `getRules()` retourne aussi leur seuil effectif.
Sur une branche, seule la case visitée s'inverse. Toutes les décisions, les
écritures et la destination sont calculées et validées avant de modifier l'état
du pas. Une case d'arrivée peut être modifiée comme voisine d'un centre ; le
déplacement lui-même ne déclenche pas de nouvelle application de règle.

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
d'incrémenter : une destination ou une croix nécessaire hors domaine laisse le
pas intact. Si cette erreur arrive après des transitions réussies dans un lot, celles-ci restent
acquises ; `getState()` donne l'étape réellement atteinte. Aucun arrondi ni
bouclage n'est effectué aux limites.

Le monde reste limité par la mémoire disponible. Le calcul est synchrone ;
`advance` sur un grand nombre de pas peut monopoliser son thread. Le
[contrôleur asynchrone et son Worker](EXECUTION.md) calculent par lots et
permettent les interruptions entre lots. Le Worker alimente maintenant le
[Canvas synchronisé](VISUALISATION.md). Les commandes et règles sont maintenant
accessibles dans le [poste de pilotage](INTERFACE.md).

## Interventions manuelles — lot 07 bis prévu

**Contrat prévu, non implémenté.** L'API actuelle décrite ci-dessus reste inchangée.
Le [lot 07 bis](ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md#07-bis--modifier-manuellement-les-cases)
prévoit des opérations d'inversion d'un ensemble de cases et de remplissage d'un
rectangle noir, blanc ou aléatoire. Elles modifieront le monde dans le moteur,
sans appliquer les transformations du catalogue de règles. L'interface ne fera
aucune écriture directe ; le [pilotage](EXECUTION.md#commandes-dédition--lot-07-bis-prévu)
les exécutera dans le Worker entre deux lots de transitions.

### Invariants et validation

Une intervention ne sera pas une transition : compteur, position et orientation
de la fourmi, sélection de règles et cible de calcul resteront inchangés. Les
transitions suivantes liront les couleurs résultantes, y compris lorsque la
case sous la fourmi aura été modifiée. Une intervention appliquée à l'étape N
prendra effet pour la transition N → N+1, après les interventions précédentes
à cette même étape.

Les coordonnées suivront les entiers sûrs du monde. Les données et l'étendue
seront validées avant toute écriture ; une commande invalide ne modifiera rien.
Le rectangle couvrira les deux cases extrêmes et toutes les cases entre elles,
bornes incluses ; ses dimensions et son aire seront vérifiées sans débordement
numérique. Il sera appliqué atomiquement. Le blanc restera implicite dans le
stockage clairsemé, avec suppression des cases redevenues blanches.

Chaque rectangle ou tracé sera limité à **100 000 cases**. Un rectangle excessif
sera refusé sans écriture. Le tracé sera transmis progressivement, sans trous,
avec une seule inversion par case sur tout le geste ; arrivé au plafond, il
s'arrêtera en conservant ses écritures précédentes. Chaque commande progressive
sera validée avant ses écritures ; elle n'annulera pas les commandes déjà appliquées.

### Aléatoire reproductible

Pour chaque case du rectangle, le remplissage aléatoire choisira noir avec la
probabilité entière demandée de 1 à 99 % (défaut 50 %), et blanc sinon,
indépendamment de l'ancienne couleur. La graine sera visible et modifiable dans
l'interface, initialement 1. Chaque remplissage repartira de la graine indiquée :
les mêmes rectangle, probabilité et graine produiront exactement le même motif.

Le générateur pseudo-aléatoire sera déterministe et versionné, avec un ordre de
parcours stable et documenté des coordonnées. Ni l'horloge ni `Math.random`
n'interviendront. L'algorithme, le domaine de la graine et les vecteurs de
référence seront formalisés et testés lors du développement du lot, avant sa
réception ; aucun générateur n'est ajouté par cette préparation documentaire.

### Journal et réinitialisation

Un journal minimal restera en mémoire pour les interventions appliquées. Chaque
entrée conservera l'étape exacte, l'ordre d'application à étape égale, l'opération
et les données nécessaires au rejeu : cases pour l'inversion, bornes et mode
pour le rectangle, probabilité, graine et version du générateur pour l'aléatoire.
Le rejeu aux mêmes étapes et dans le même ordre devra retrouver le même état
scientifique complet. Ce journal sera distinct des changements de règles du
lot 08 ; il n'ajoutera aucun export, import ou mécanisme d'annulation historique.

À zéro, la première modification effective verrouillera la sélection des règles
dans le poste de pilotage. Réinitialiser effacera les interventions et leur
journal, y compris le dessin à zéro : nouvelle expérience au monde blanc, fourmi
au départ et compteur zéro. Les règles choisies resteront conservées comme dans
le comportement actuel. Aucun stockage persistant ne sera introduit.

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
