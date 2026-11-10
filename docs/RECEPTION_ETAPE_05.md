# Réception de l'étape 05

Lot du **10 novembre 2026**, sur la branche `feat/worker-execution`.

## Fonctionnalités implémentées

- Contrôleur asynchrone sans DOM ou Canvas et véritable Worker module utilisant
  le même moteur scientifique, avec client de messages corrélés.
- Calcul d'un pas, N pas, cible absolue ou continu ; pause et reprise entre
  lots. Annuler conserve l'état atteint et abandonne uniquement la tâche/cible.
- Validation des commandes, refus du passé et des tâches concurrentes,
  invalidation des timers périmés et fermeture libérant les ressources.
- Lots bornés, paramètres de débit distincts de la fréquence des notifications,
  progression compacte et copies complètes uniquement sur demande.
- Erreurs scientifiques avec compteur réellement atteint et état partiel
  consultable ; erreurs de transport explicites sans calcul de secours.

## TDD et vérifications

Les suites unitaires du contrôleur puis du client ont d'abord échoué sur les
modules manquants. Le parcours navigateur des paliers a ensuite échoué sur
l'import du client absent, avant implémentation du transport et du Worker.
Après implémentation, les suites ciblées passent.

- **26 tests du contrôleur** : progression sans copie du monde, cible courante,
  zéro et un pas, passé refusé, lots incomplets, pause/reprise, annulation,
  concurrence, callbacks périmés et interruption depuis un abonné, fréquence
  des notifications, validation, erreur partielle et fermeture.
- Les 14 configurations scientifiques (dont les deux majorités aux cinq seuils)
  sont comparées au pas à pas pour 10 000 transitions et deux réglages de lots.
  Les paliers 10 000, 100 000 et 1 000 000, puis la cible libre 1 000 007, sont
  atteints et comparés à l'état complet de référence.
- **9 tests du client** : corrélation de réponses reçues dans un ordre différent,
  commandes publiques, abonnements, erreurs typées, pannes `error`/`messageerror`,
  message invalide, fermeture et échec d'initialisation/transfert.
- **19 parcours Chromium avec un vrai Worker** : équivalence des 14
  configurations, mêmes paliers, page réactive pendant le calcul continu,
  zoom/navigation, pause/reprise, annulation, erreur scientifique et protocole.

Les tests unitaires pilotent les timers virtuels ; les parcours navigateur
utilisent des acquittements et le compteur effectivement atteint. Aucune
assertion ne dépend d'un débit CPU ou d'un nombre de pas atteint après un temps
réel fixé. Les comparaisons portent sur la fourmi, toutes les cases noires,
leur ordre, le compteur et les règles normalisées.

| Vérification                  | Résultat                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| Vitest ciblé du contrôleur    | 26 tests réussis                                            |
| Vitest ciblé du client        | 9 tests réussis                                             |
| Playwright ciblé du Worker    | 19 parcours réussis                                         |
| Vitest complet                | 1 129 tests réussis dans 11 suites                          |
| Playwright complet Chromium   | 34 parcours réussis, dont 19 avec Worker                    |
| ESLint et Prettier            | Réussis                                                     |
| Build Vite                    | Réussi                                                      |
| Contrôle global Docker        | `docker compose run --rm test` réussi                       |
| Exemple Docker sans affichage | Trois cibles exactes atteintes ; état au million concordant |

## Limites et vérifications manuelles

L'interface du jeu reste inchangée : commandes scientifiques désactivées et
pavage indépendant de l'expérience pilotée par API. Les fixtures importent les
modules source sous Vite. L'assemblage du client dans le build du site, le rendu
des états et les options graphiques restent aux lots suivants ; les fixtures
Worker sont ignorées pour `TEST_BASE_URL` pointant sur une image de production.

Le monde et le compteur restent limités par la mémoire et les entiers sûrs.
Les lots ne sont pas préemptibles et aucune durée de réponse maximale n'est
garantie. Une copie complète reste coûteuse. Le navigateur peut ralentir les
timers en arrière-plan ; fermeture de page ou panne fatale perdent le Worker.
Les campagnes, KPI, changements de règles en cours d'expérience et formats
d'échange ne sont pas développés.

La [procédure de vérification manuelle](EXECUTION.md) fournit les trois paliers
via Docker et une session Worker depuis la console du navigateur. La navigation
et le zoom pendant calcul sont vérifiés automatiquement ; le confort subjectif
sur le matériel réel de l'utilisateur reste à apprécier. Aucun nouvel affichage
scientifique n'est à valider visuellement dans ce lot.

Aucune dépendance, aucun workflow ni stockage persistant n'est ajouté.
Aucun commit, push, release, déploiement ou changement d'infrastructure n'est
effectué ; aucune nouvelle image Nginx de production n'est construite ou validée.
