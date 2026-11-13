# Réception de l’étape 07

Lot du **10 novembre 2026**, sur `feat/laboratory-interface`.

## Fonctionnalités

- Formulaire issu du catalogue : cinq règles centrales exclusives, seuils 1 à 5,
  rotation horaire compatible seulement avec l’inversion simple. Une rotation
  retirée lors d’un choix incompatible est annoncée.
- Configuration à zéro, verrouillage pendant une tâche et après le premier pas.
  Réinitialiser conserve règles, vitesse, caméra et affichage, recrée le Worker
  et revient au monde blanc, `(0, 0)`, nord, sans lancement automatique.
- Lecture/pause/reprise, pas exact, annulation, cibles libres et paliers jusqu’au
  million. Le bouton flottant utilise les mêmes actions et le même état.
- Six cadences, dont Maximum, modifiables dans le Worker entre lots. Nouvelle
  API `setExecutionOptions(options)` sur contrôleur et client, sans changement
  de l’état scientifique, de la cible ou de la promesse de calcul.
- Statut acquitté, étape calculée, cases noires, progression et étape dessinée
  distincte en cas de retard. Erreurs de saisie, scientifiques et de transport
  visibles ; compteurs inconnus à l’initialisation présentés par `—`.
- Session extraite avec client courant remplaçable, désabonnements et protection
  contre les réponses et rejets périmés. Aucune recréation après panne sans reset.
- Clavier sur les commandes et le Canvas, tiroir mobile et disposition compacte
  à faible hauteur. Règles/cible défilent ; transport et cadrage restent fixes.
- Accueil et Aide actualisés. Aucun changement des transitions, nouveau KPI,
  dialogue de changement de règles, journal, campagne ou format de sauvegarde.

## TDD et tests créés

Les tests ont d’abord constaté l’absence de `setExecutionOptions`, du module de
session et du bouton Un pas. Après implémentation, les parcours ont révélé une
case à cocher rétablie trop tôt pendant le remplacement et un débordement à
faible hauteur ; ces comportements ont été corrigés avant validation.

Un test supplémentaire a reproduit la destruction de la vue lors d’une panne
d’initialisation. La vue et Réinitialiser restent maintenant accessibles.
Un parcours de reset pendant une cible active a aussi reproduit un message
« Le client de simulation est fermé » résiduel ; le rejet de l’ancienne commande
est désormais ignoré après changement de génération de session.

- **7 tests de cadence** : validation atomique, options conservées, timer périmé,
  pause/reprise et comparaison des six cadences avec le même moteur de référence.
- **5 tests de session** : remplacement, sélection validée avant destruction,
  fermeture pendant création, anciennes notifications et pannes ignorées,
  panne initiale avec reprise explicite, conservation de la vitesse acquittée.
- Test de transport existant étendu à la nouvelle commande et à ses données copiées.
- **8 parcours Chromium** : règles/incompatibilités, seuils, pas et reset,
  cibles et erreurs, pause/reprise/annulation/vitesse, bouton flottant, navigation,
  clavier/mobile, panne initiale ou au repos, reset actif et états scientifiques
  complets produits par le formulaire pour cinq configurations représentatives.

Les tests scientifiques comparent des étapes et états exacts. Les timers virtuels
vérifient les cadences sans imposer de débit CPU réel. Les parcours du million
attendent la cible, sans exiger un nombre d’images par seconde.

## Vérifications exécutées

| Vérification                                   | Résultat                                                                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Contrôle global `docker compose run --rm test` | Réussi : ESLint, Prettier, 1 175 tests Vitest dans 16 suites, 51 parcours Chromium et build Vite                                         |
| Image Nginx locale                             | Construite et démarrée avec succès ; 25 parcours Chromium réussis, 26 fixtures source ignorées explicitement (toutes réussies sous Vite) |
| Captures                                       | Bureau, faible hauteur et mobile inspectés ; commandes fixes et région de configuration défilante                                        |
| Diff et dépendances                            | `git diff --check` réussi ; manifeste et lockfile inchangés, aucun ajout de dépendance                                                   |

La prévisualisation Nginx créée pour ces contrôles a été arrêtée et supprimée.
Les captures sont conservées dans `test-results/laboratoire-*.png`.

## Limites et vérifications manuelles

- Validation navigateur automatisée sur Chromium. Les autres navigateurs et le
  confort clavier, souris, pavé tactile et écran tactile physiques restent à apprécier.
- Cadences demandées, sans garantie de débit. Pause et annulation s’appliquent
  entre les lots ; un lot commencé n’est pas préemptible.
- Instantanés complets et rendu restent proportionnels au nombre de cases noires,
  avec au plus dix demandes par seconde. Le monde et le compteur restent bornés
  par les entiers sûrs et la mémoire ; la caméra conserve ses limites propres.
- Une panne fatale perd l’état privé du Worker ; le dernier compteur et la dernière
  scène connus restent consultables. Réinitialiser recommence depuis zéro.
- Aucun export ni sauvegarde persistante : fermer ou recharger perd la session.
- Aucun commit, push, release ou déploiement effectué. L’image est exclusivement locale.

Pour vérifier sans console : ouvrir Jeu, choisir une majorité et son seuil,
faire Un pas, puis Réinitialiser. Choisir Inversion simple et Maximum, le palier
10 000 et Atteindre ; constater l’arrêt exact. Lancer ensuite un calcul continu,
mettre en pause, reprendre, annuler et tester le bouton flottant après repli.
Sur téléphone, ouvrir le tiroir et faire défiler règles et cible. Le parcours
complet et les conventions se trouvent dans [Interface](INTERFACE.md).
