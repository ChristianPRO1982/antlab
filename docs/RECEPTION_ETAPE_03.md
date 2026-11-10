# Réception de l'étape 03

Lot du **10 novembre 2026**, sur la branche `feat/deterministic-engine`.

## Fonctionnalités implémentées

- Moteur autonome de Langton avec position, orientation et compteur exact,
  conditions initiales configurables et stockage clairsemé privé.
- Transition atomique documentée : lire, tourner, inverser la case visitée,
  avancer, incrémenter. Blanc signifie droite, noir signifie gauche.
- Calcul synchrone d'un ou N pas par la même transition, sans DOM, Canvas,
  Worker, horloge ou hasard. Aucun traitement particulier des centres.
- Validation stricte et refus des dépassements sans mutation partielle d'un
  pas ; conservation des transitions déjà achevées dans un lot interrompu.
- Copies indépendantes des entrées et de l'état complet courant.

## Tests créés et résultats

Les tests du moteur ont d'abord échoué sur l'absence de `src/engine.js`
(import introuvable), puis les **25 tests** ont réussi après implémentation.
Ils couvrent les conditions initiales, les huit rotations couleur/orientation,
les cinq premiers pas explicitement attendus, la double inversion de l'origine,
les branches inchangées lors d'une visite du centre, l'indépendance des données,
les entrées invalides et les limites numériques.

La répétabilité compare à chaque étape les états complets de deux simulations
identiques. L'équivalence compare 10 000 pas individuels, un lot unique et
plusieurs lots, depuis un monde blanc puis un départ personnalisé avec des
cases noires. Un test sans DOM interdit les appels à `Date.now`,
`performance.now` et `Math.random` pendant le calcul.

| Vérification                         | Résultat                              |
| ------------------------------------ | ------------------------------------- |
| Tests ciblés du moteur via Docker    | 25 tests réussis                      |
| Vitest complet                       | 73 tests réussis dans 6 suites        |
| Playwright Chromium                  | 15 parcours réussis                   |
| ESLint et Prettier                   | Réussis                               |
| Build Vite                           | Réussi                                |
| Contrôle global Docker               | `docker compose run --rm test` réussi |
| Exemple Docker des cinq premiers pas | Exécuté, état attendu obtenu          |

## Limites et vérification manuelle

- Coordonnées et compteur limités aux entiers sûrs JavaScript ; monde limité
  par la mémoire disponible. Aucun débit de calcul n'est garanti ou testé.
- Calcul synchrone : les lots longs monopoliseront le thread appelant. Le
  Worker, la pause et la progression relèvent de l'étape 05.
- Le moteur n'est pas relié à l'interface : Lanto y reste à l'origine et les
  commandes de simulation sont désactivées. Aucun nouveau parcours UI n'est
  ajouté pour ce lot sans changement d'interface.
- Les copies complètes du monde ne sont pas un format d'export/import.
  Aucun catalogue de règles, KPI, campagne ou stockage persistant n'est ajouté.
- L'équivalence des lots du moteur est vérifiée ; le pilotage interactif par
  Worker et les campagnes devront être vérifiés lors de leurs étapes.
- Aucune image Nginx de production, release ou livraison n'est réalisée.
  Aucun commit, push ou changement d'infrastructure n'est effectué.

La procédure de vérification manuelle est l'[exemple Docker du moteur](MOTEUR.md) :
exécuter cinq pas et vérifier la fourmi en `(-1, 0)` orientée `west`, le compteur
`5` et les trois cases noires attendues. Relancer la commande pour constater le
même résultat. Aucun essai graphique nouveau n'est nécessaire pour recevoir
ce moteur autonome ; son intégration visuelle restera à vérifier ultérieurement.
