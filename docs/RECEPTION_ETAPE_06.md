# Réception de l'étape 06

Lot du **10 novembre 2026**, sur la branche `feat/world-visualization`.

## Fonctionnalités implémentées

- Session Worker unique créée à l'ouverture du jeu et raccordée au Canvas,
  conservée lors des changements de page ; API `getGameSession()` sous Vite.
- Instantanés cohérents, validés et copiés, avec position, orientation et couleurs
  d'une même étape. Cadence maximale de dix demandes par seconde, une lecture
  en vol et aucune accumulation de requêtes différées.
- Rendu de Lanto dans ses quatre orientations, cases et fourmi hors champ
  écartées, conservation du quadrillage répétitif et des réglages visuels.
- Centrage, suivi et Taille max sur les états successifs. Navigation souris
  conservée ; translation tactile et pincement à deux doigts avec ancrage.
- Masquage sans commande de pause scientifique, retour actualisé, fermeture
  libérant les ressources et signalement des pannes même au repos.
- Les commandes et options scientifiques visibles restent désactivées pour
  l'étape 07, conformément au choix de l'utilisateur.

## TDD et tests

Les trois nouvelles suites unitaires ont d'abord échoué sur les modules absents.
Le parcours navigateur a échoué sur `getGameSession` absent. Deux tests de panne
au repos ont ensuite échoué sur l'absence du canal d'erreurs, avant son ajout.

- **4 tests de gestes/caméra** : translation, milieu et distance de deux
  contacts, contacts ignorés, transitions, distances nulles, validation et
  transformation atomique aux limites.
- **6 tests de scène/rendu** : copies immuables, données invalides et quatre
  orientations ; seules les cases et la fourmi visibles sont dessinées.
- **18 tests de synchronisation** : cadence, requête unique, coalescence,
  cohérence fourmi/couleurs, masquage, fermeture, erreurs et désabonnements.
  Les 14 configurations sont comparées à la référence à 10 000 pas, avec
  affichage actif, ralenti puis masqué (42 calculs pilotés).
- **1 test de client ajouté** : panne observable au repos, sans fausse erreur
  lors d'une fermeture volontaire.
- **7 parcours Chromium** : session unique et premiers pas, changement atomique
  de scène et bornes, million de pas masqué puis affiché, véritables gestes
  tactiles à densité 2, Worker chargé par le site, visibilité du document et
  fermeture pendant une capture. Deux de ces parcours visent aussi Nginx.

Les comparaisons scientifiques portent sur une étape exacte et l'état complet,
indépendamment de la cadence du rendu. Aucune attente de débit CPU ou de nombre
d'images par seconde n'est imposée.

L'inspection initiale de la capture au million a révélé un aperçu uniforme :
les rectangles bien plus petits qu'un pixel disparaissaient par arrondi.
Deux tests de non-régression ont d'abord échoué aux densités 1 et 2, puis réussi
avec un dessin de présence sur les pixels physiques touchés. Le parcours du
million exige maintenant la présence effective de pixels sombres dans l'aperçu.

Résultats de la réception initiale, avant l'audit correctif ci-dessous :

| Vérification                                  | Résultat                                                              |
| --------------------------------------------- | --------------------------------------------------------------------- |
| Vitest complet                                | 1 160 tests réussis dans 15 suites                                    |
| Playwright sous Vite                          | 41 parcours réussis, dont 7 nouveaux                                  |
| ESLint et Prettier                            | Réussis                                                               |
| Contrôle global Docker                        | `docker compose run --rm test` réussi                                 |
| Build Vite                                    | Réussi ; Worker compilé séparément et inclus dans l'image             |
| Image Nginx locale reconstruite               | 17 parcours réussis ; 24 fixtures source ignorées explicitement       |
| Inspection des captures bureau/mobile/million | Réalisée ; trajectoire au million visible après correction sous-pixel |

La prévisualisation locale créée pour ces essais a été arrêtée et supprimée.
Les captures finales sont conservées dans `test-results/visualisation-*.png`.

## Audit correctif de l'étape 06

L'audit porte sur la session et sa fermeture, le client Worker, la synchronisation,
la scène, la caméra, le cadrage, les gestes et le rendu. Aucun défaut critique
n'a été identifié dans ce périmètre. Trois défauts majeurs ont été reproduits
avant correction :

| Défaut                                   | Impact                                                                                                                                                                                 | Correction                                                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadence contournable                     | `intervalMs` acceptait 1 à 99 ms ; un timer arrondi pouvait aussi déclencher une lecture avant l'échéance. Le coût des instantanés complets pouvait dépasser la borne annoncée.        | Minimum de 100 ms, délai arrondi vers le haut et vérification de l'échéance monotone avant chaque lecture.                                                                      |
| Commandes encore actives après fermeture | Des événements du panneau appelaient la vue détruite et provoquaient des erreurs non interceptées. Un retour au jeu tentait sa réactivation ; l'API rendait encore une session fermée. | Destruction des écouteurs du jeu, commandes désactivées, fermeture idempotente affichée et accès API refusé. La navigation entre pages reste utilisable sans recréer de Worker. |
| Rendu dépendant de l'image de Lanto      | Une image lente ou défaillante empêchait tout dessin du monde, malgré les instantanés reçus et les calculs terminés.                                                                   | Dessin des cases indépendant du sprite ; erreur de ressource persistante sans bloquer les actualisations.                                                                       |

Trois tests Vitest et deux parcours Chromium sont ajoutés : refus des intervalles
1/99 ms, timer précoce, événements et navigation après fermeture, image retardée
puis refusée avec vérification des pixels avant/après un nouveau pas réel.
Les échecs fonctionnels ont été constatés avant l'implémentation des corrections.

Validation après correction :

| Vérification                    | Résultat                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose run --rm test`  | Réussi : ESLint, Prettier, 1 163 tests Vitest dans 15 suites, 43 parcours Chromium et build Vite.                               |
| Image Nginx locale reconstruite | 17 parcours réussis, dont le vrai Worker et le tactile ; 26 fixtures source ignorées explicitement, toutes exécutées sous Vite. |
| Diff et dépendances             | `git diff --check` réussi ; manifeste et lockfile inchangés.                                                                    |

Le moteur, les règles et les résultats scientifiques ne sont pas modifiés.
La prévisualisation locale utilisée pour l'audit est arrêtée et supprimée après
les vérifications. Aucun commit, push ou déploiement n'est effectué.

Point mineur laissé en l'état : une tentative de zoom déjà à sa borne peut
libérer le suivi, même si l'échelle ne change pas. Les limites de copies
complètes, de précision visuelle et de validation tactile sur matériel réel
restent celles documentées ci-dessous.

## Limites et vérifications manuelles

Les copies et parcours restent proportionnels au nombre de cases noires. Aucun
index spatial ou protocole différentiel n'est ajouté. Le modèle reste borné par
les entiers sûrs et la mémoire ; la caméra conserve son domaine plus restreint.
À très faible échelle, la fourmi et les détails des croix peuvent devenir
inférieurs à un pixel, sans changement de l'état scientifique.

La [procédure manuelle](VISUALISATION.md) pilote la session depuis la console
sous Vite et décrit les gestes. Les gestes tactiles sont automatisés dans
Chromium ; le confort sur souris, pavé tactile et écran physique reste à
apprécier. Les autres navigateurs ne sont pas validés dans ce lot.

Le panneau de règles, les commandes scientifiques, KPI, campagnes et formats
d'échange restent à leurs étapes respectives. Aucune dépendance, sauvegarde
persistante, publication, modification d'infrastructure ou livraison n'est
ajoutée. Aucun commit, push ou déploiement n'est effectué.

## Alertes d'outillage observées

Le `npm ci` du build a signalé 38 alertes modérées ; l'audit explicite de
l'environnement de développement monté en signale 43 (aucune élevée ou critique).
Les avis publiés à l'origine concernent `glob` et `minimatch`, avec propagation
dans les chaînes ESLint, npm et semantic-release. Le manifeste et le lockfile
n'ont pas changé dans ce lot ; ces dépendances sont de développement et ne
sont pas installées dans l'image Nginx finale. Aucune mise à niveau ni correction
automatique de dépendances n'est entreprise dans cette étape de visualisation.
Références relevées par npm :
[glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) et
[minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).
