# Réception de l'étape 04

Lot du **10 novembre 2026**, sur la branche `feat/rule-catalog`.

## Fonctionnalités de la réception initiale

- Quatre règles centrales exclusives versionnées : inversion simple, inversion
  collective, centre maître et majorité inversée ; inversion simple des branches.
- Rotation horaire optionnelle des anciennes couleurs des branches, lors d'une
  visite du centre, combinable uniquement avec l'inversion simple.
- Catalogue de métadonnées indépendant, sélection validée et copiée à la
  construction, lecture par `getRules()`, état courant `getState()` inchangé.
- Virages décidés sur l'ancienne couleur, état initial commun aux transformations,
  ordre stable des écritures et validation avant toute mutation du pas.
- Préservation du comportement par défaut, de son domaine numérique et de la
  conservation des pas achevés dans un lot interrompu.

## TDD, tests créés et résultats

Avant implémentation, la suite du catalogue a échoué sur l'absence de `rules.js`.
Les deux cas d'inversion collective sur une croix blanche, à l'origine et sur
un centre négatif, ont aussi échoué sur le résultat : seul le centre devenait
noir alors que les cinq cases étaient attendues. Après implémentation, les
nouvelles suites et les tests existants passent, sans modifier les attentes
du lot 03.

- **8 tests de catalogue/configuration** : métadonnées et versions, copies
  indépendantes, valeurs par défaut, erreurs de structure, champs et identifiants,
  catégories, doublons et trois incompatibilités explicites.
- **350 tests d'intégration moteur/règles**, dont 320 transformations couvrant
  les 32 motifs binaires pour les quatre règles centrales et la combinaison
  autorisée, à l'origine et sur un centre aux coordonnées négatives.
- Les motifs couvrent les majorités de zéro à cinq cases noires et les deux
  couleurs du centre. Ils vérifient les virages avant transformation, les
  couleurs attendues et l'absence d'effet hors de la croix.
- Les autres tests couvrent les quatre branches sur blanc et noir pour chaque
  configuration, la permutation et sa conservation des couleurs des branches,
  l'ordre des écritures, les limites numériques et les erreurs sans mutation.
- Pour chacune des cinq configurations, comparaison des 100 premiers états
  répétés et de l'état à 10 000 pas, puis équivalence entre pas individuels,
  un lot et plusieurs lots. Calcul sans DOM, horloge ou hasard vérifié.

| Vérification                        | Résultat                              |
| ----------------------------------- | ------------------------------------- |
| Vitest complet via Docker           | 431 tests réussis dans 8 suites       |
| Playwright Chromium                 | 15 parcours réussis                   |
| ESLint et Prettier                  | Réussis                               |
| Build Vite                          | Réussi                                |
| Contrôle global Docker              | `docker compose run --rm test` réussi |
| Exemple Docker comparatif           | Cinq états attendus obtenus           |
| Exemple de combinaison incompatible | `TypeError` explicite obtenue         |

## Limites et vérification manuelle

Le calcul reste synchrone, limité aux entiers sûrs JavaScript et aux ressources
mémoire disponibles. Seules les croix nécessaires aux transformations choisies
doivent être représentables intégralement. Une croix invalide laisse le pas
intact ; les pas déjà terminés du lot restent acquis.

Le moteur n'est pas relié à l'interface : la sélection des règles et les commandes
de simulation ne sont pas activées. Le Worker, le changement de règles en cours
d'expérience, les KPI, les campagnes et les formats d'échange restent futurs.
Les versions du catalogue ne constituent pas un mécanisme d'import d'anciennes
règles. Aucune dépendance, sauvegarde persistante ou infrastructure n'est ajoutée.

La procédure manuelle est l'[exemple Docker comparatif](REGLES.md) : observer les
cinq résultats d'un même motif, répéter pour obtenir les mêmes états et essayer
une combinaison incompatible. L'intégration graphique ne fait pas partie de
ce lot ; aucun nouvel essai visuel n'est requis pour le recevoir.

Aucun commit, push, release, déploiement ou changement d'infrastructure n'est
effectué. Aucune nouvelle image Nginx de production n'est construite ou validée.

## Extension demandée : majorité l'emporte et seuils configurables

Le 10 novembre 2026, ajout de **Majorité l'emporte** (`majority-wins`, version 1) :
si le nombre de cases noires atteint le seuil, les cinq cases deviennent noires ;
sinon elles deviennent blanches. **Majorité inversée** réalise l'effet opposé.
Les deux règles acceptent `rules.threshold` parmi **1, 2, 3, 4 et 5**, avec
**3 par défaut**, et `getRules()` conserve le seuil effectif. Les métadonnées
exposent les choix et la valeur par défaut, avec des copies indépendantes.
Majorité inversée passe en version 2 pour cette extension paramétrable ; au seuil
3, les résultats de sa version précédente sont conservés.

Le TDD a d'abord constaté trois échecs : métadonnées de la nouvelle règle absentes,
identifiant inconnu et seuil normalisé absent pour la majorité inversée.
La nouvelle suite comporte **656 tests**, dont **640 transformations** pour les
32 motifs × 5 seuils × 2 règles × 2 centres (origine et centre négatif).
Elle couvre aussi valeurs par défaut, égalité au seuil, copies, erreurs de type
et de domaine, refus d'un seuil sur une autre règle et équivalence à 10 000 pas
pour les dix couples règle/seuil. Les suites existantes sont étendues à la
nouvelle règle pour les branches, l'atomicité, les lots et les incompatibilités.

| Vérification de l'extension                     | Résultat                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Vitest complet via Docker                       | 1 094 tests réussis dans 9 suites                                |
| Playwright Chromium                             | 15 parcours réussis                                              |
| ESLint, Prettier et build Vite                  | Réussis                                                          |
| Contrôle global Docker                          | `docker compose run --rm test` réussi                            |
| Exemple des seuils 1 à 5 sur trois cases noires | Majorité : 5, 5, 5, 0, 0 cases noires ; inversée : 0, 0, 0, 5, 5 |

La sélection reste disponible par API, sans ajout d'interface anticipant les
lots suivants. Les limites de calcul synchrone et de représentation restent
celles de la réception initiale. Pour une vérification manuelle, utiliser
l'exemple comparatif du [catalogue](REGLES.md), puis fixer `threshold` à 1 et à 5
sur les deux majorités : pour trois branches noires et un centre blanc, majorité
l'emporte donne respectivement cinq cases noires et zéro ; majorité inversée
donne respectivement zéro et cinq.
