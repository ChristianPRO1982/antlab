# Réception du lot 07 bis

Implémentation du 13 novembre 2026 sur `feat/manual-cell-editing`.

## Fonctionnalités

Les outils Case, Tracé continu et Rectangle sont disponibles en dernier dans
la zone défilante. Le rectangle remplit en noir, blanc ou aléatoire reproductible
(probabilité de noir 1–99 %, défaut 50 %, graine uint32, défaut 1).
Le calcul continue jusqu’à 100 pas/s demandés ; en pause, Maximum reste éditable.
Les écritures sont appliquées dans le Worker entre lots, sans transition,
avec acquittement et journal minimal en mémoire. Le plafond est de 100 000 cases.
Le reset revient au blanc et supprime le journal. Le lot 08 n’est pas commencé.

Le tracé interpole les centres des cases entre les positions du pointeur par
pas sur l’axe dominant et arrondi sur l’autre axe ; les diagonales passent par
les coins sans ajouter les deux voisins latéraux. Chaque case est inversée une
seule fois par geste. Une seule commande est envoyée à la fois ; les nouvelles
cases attendent dans une file bornée par le plafond du geste. Les envois d’un
geste annulé et les commandes d’une ancienne session sont ignorés.

## Tests et contrôles

Le premier test a constaté l’absence de `toggleCells`. Un test complémentaire
a reproduit une mutation avant refus d’un argument non clonable ; la copie du
journal est maintenant préparée avant écriture.

La suite dédiée vérifie inversion, invariants, déduplication, rectangle inversé,
coordonnées négatives, seuils 1/50/99, graine zéro, vecteur Mulberry32 v1,
validation sans mutation, opérations sans effet, plafond de 100 000 cases,
rejeu exact et intervention entre lots avec cible conservée.

Les six parcours Chromium ajoutés vérifient les trois outils, le reset,
le verrouillage à zéro, la pause Maximum et la désactivation à la reprise,
Échap, le toucher et l’annulation au second contact, tous les seuils de vitesse,
le gel puis le rétablissement du cadrage et le retour à la navigation.
La fixture de cadrage est isolée en remplaçant sa source d’instantanés par les
scènes contrôlées du test ; les résultats attendus restent inchangés.

Contrôle global `docker compose run --rm test` réussi : ESLint, Prettier,
1 199 tests unitaires, 67 parcours Chromium et build Vite. Après ajout de quatre
cas de rectangles et de deux parcours de réception supplémentaires, les tests
ciblés passent : 16/16 unitaires et 6/6 navigateur. Le code applicatif est inchangé
depuis le contrôle global. `git diff --check` réussit.

Le lot 07 bis est clôturé ; le lot 08 reste non commencé.

## Limites et vérification manuelle

Validation navigateur sur Chromium sous Vite. Le confort du tracé sur matériel
tactile réel, les autres navigateurs et l’inspection visuelle des grands
rectangles restent à vérifier. Aucun débit ni délai maximal n’est garanti.
Le journal grandit avec les interventions ; fermer ou recharger perd la session.
Les interventions sans changement de couleur ne créent pas d’entrée de journal.

Vérification proposée : dessiner au repos, lancer à 100 pas/s et modifier le
monde, mettre en pause puis choisir Maximum et dessiner encore. Reprendre doit
désactiver l’outil. Tester Rectangle avec chaque remplissage, Échap, puis reset.
Vérifier le maintien du cadrage pendant un geste et son rétablissement ensuite.

Aucun push, fusion, release ou déploiement ; aucune dépendance ajoutée.
