# Documentation AntLab

## État du projet

Le socle (étape 01), la géométrie avec monde clairsemé (étape 02) et le moteur
déterministe de Langton (étape 03) sont implémentés. Le moteur calcule un ou N pas
sans affichage depuis des conditions initiales configurables. Le catalogue
de l'étape 04 ajoute cinq règles centrales exclusives et la rotation horaire
facultative des branches, avec validation des compatibilités.
Les règles « Majorité l'emporte » et « Majorité inversée » ont un seuil
configurable de 1 à 5, fixé à 3 par défaut.
La vue de l'étape 06 est raccordée au Worker : position et orientation de Lanto,
cases noires, suivi, cadrage du monde et navigation souris/tactile.
Les pages Accueil, Jeu et Aide partagent une identité minimaliste autour de Lanto.
Le jeu possède un panneau redimensionnable et des réglages visuels fonctionnels ;
les commandes de simulation pilotent le Worker depuis le lot 07.
L'étape 05 fournit un contrôleur asynchrone et une API Worker testée sous Vite,
avec calcul par lots, pause, reprise, annulation et progression compacte.
La session du jeu se pilote par interface ou API sous Vite et son Worker est inclus dans le
build statique. Les campagnes et les formats
d'échange restent à développer dans les lots correspondants de la roadmap.

### Lot 07 bis : édition manuelle des cases

**Implémenté et clôturé sur `feat/manual-cell-editing`.** Le [lot 07 bis](ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md#07-bis--modifier-manuellement-les-cases)
complète les étapes 01 à 07 avant le lot 08, sans renumérotation. Il prévoit
trois outils exclusifs : inversion au clic, tracé continu et rectangle noir,
blanc ou aléatoire reproductible (1 à 99 % de noir, défaut 50 %, graine visible
initialement 1). L'édition sera possible à l'arrêt quelle que soit la vitesse
sélectionnée, ou en marche à 1, 10 ou 100 pas/s demandés, sans suspendre le calcul.
Les écritures seront appliquées dans le Worker entre lots, avec journal minimal
à étape exacte et plafond de 100 000 cases par rectangle ou tracé.

Spécifications : [Interface](INTERFACE.md#édition-manuelle-des-cases--lot-07-bis),
[Moteur](MOTEUR.md#interventions-manuelles--lot-07-bis) et
[Pilotage](EXECUTION.md#commandes-dédition--lot-07-bis).
Le bilan est dans [Réception du lot 07 bis](RECEPTION_ETAPE_07_BIS.md).
Le lot 08 reste hors périmètre.

### Correctifs des étapes 01 à 07

Sur `fix/stages-01-07`, les compléments suivants sont documentés :

- Orientation de Lanto vérifiée dans les quatre directions avec le vrai sprite ;
  aucun changement de l’ordre scientifique ni animation supplémentaire.
- Suppression des sauts du panneau par réservation de l’étape affichée et de la
  barre de cible ; compteurs et statut disposés de façon stable.
- Contours renforcés des croix en bleu `#064894`, teinte ajustée par l’utilisateur ;
  quadrillage fin toujours gris.
- Quatre boutons d’affichage indépendants, tous actifs par défaut, sur une seule
  rangée : grille simple, grille « + », origine et Lanto. Les libellés s’adaptent
  à la place disponible et les choix sont conservés en mémoire.

Le comportement actuel est décrit dans [Interface](INTERFACE.md), les validations
et limites dans [Tests](TESTS.md). Le dernier contrôle global a réussi pour les
1 187 tests unitaires et 61 parcours navigateur sur 62 ; le test complémentaire
de conservation ajouté ensuite a aussi réussi en exécution ciblée. Le seul échec
global concerne la fixture de scènes/cadrage déjà identifiée, à traiter séparément.
Lint, format et build ont réussi. Ces correctifs ne clôturent aucune nouvelle
étape de roadmap et n’ont donné lieu à aucune publication dans cette session.

| Document                                           | Usage                                    |
| -------------------------------------------------- | ---------------------------------------- |
| [Contexte](CONTEXTE_LABORATOIRE_FOURMIS.md)        | Intention et principes scientifiques     |
| [Roadmap](ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md) | Lots et critères de réception            |
| [Architecture](ARCHITECTURE.md)                    | Responsabilités et décisions techniques  |
| [Géométrie et monde](GEOMETRIE_MONDE.md)           | Conventions, API et navigation           |
| [Moteur déterministe](MOTEUR.md)                   | API, transitions et limites numériques   |
| [Catalogue de règles](REGLES.md)                   | Définitions, versions et compatibilités  |
| [Pilotage et Worker](EXECUTION.md)                 | API asynchrone, protocole et limites     |
| [Visualisation](VISUALISATION.md)                  | Session, cache, rendu et gestes tactiles |
| [Développement](DEVELOPPEMENT.md)                  | Commandes Docker et conventions          |
| [Tests](TESTS.md)                                  | Cycle TDD et contrôles disponibles       |
| [Releases](RELEASES.md)                            | Branches, Conventional Commits et robot  |
| [Déploiement](DEPLOIEMENT.md)                      | Image, Docker Hub et contrat VPS         |
| [Changelog](CHANGELOG.md)                          | Historique produit par semantic-release  |
| [Réception du socle](RECEPTION_SOCLE.md)           | Vérifications réalisées et limites       |
| [Réception de l'étape 02](RECEPTION_ETAPE_02.md)   | Géométrie, monde et pavage navigable     |
| [Réception de l'étape 03](RECEPTION_ETAPE_03.md)   | Moteur et reproductibilité               |
| [Réception de l'étape 04](RECEPTION_ETAPE_04.md)   | Règles et combinaisons testées           |
| [Réception de l'étape 05](RECEPTION_ETAPE_05.md)   | Calculs longs et interruptions           |
| [Réception de l'étape 06](RECEPTION_ETAPE_06.md)   | Monde simulé et navigation tactile       |
| [Réception de l'étape 07](RECEPTION_ETAPE_07.md)   | Poste de pilotage et commandes réelles   |

## Décisions validées

Le fonctionnement des trois pages et du panneau est décrit dans
[Interface](INTERFACE.md).

- Mascotte : **Lanto**, une **fourmi bleu électrique**, dont le nom associe
  **Langton** et **Ant** ; référence pour l'identité visuelle du site.
- HTML/CSS/JavaScript sans framework ; Vite est un outil de développement/build.
- Un moteur JavaScript unique, indépendant du rendu, pour les deux modes futurs.
- Calcul navigateur dans un Web Worker ; aucun développement Python parallèle.
- Aucune authentification ni sauvegarde serveur ou navigateur persistante.
- État de session en mémoire ; sauvegarde future par export volontaire `.md`
  contenant du JSON versionné, réimportable dans une nouvelle session.
- Docker pour le développement, les tests, le packaging et la production.
- TDD obligatoire et contrôles locaux avant une PR vers `main`.
- Seule la release est automatique ; build, push Docker Hub et déploiement manuels.
- Publication prévue sur `https://antlab.carthographie.fr`.
- Le VPS et le Traefik global appartiennent au dépôt voisin `cARThographie`.

Toutes les explications détaillées sur le fonctionnement et le développement
restent ici. Le README racine est un point d'entrée ; `AGENTS.md` contient les
instructions pour les contributeurs et agents.

Le [poste de pilotage du lot 07](INTERFACE.md#poste-de-pilotage--étape-07)
propose les règles à zéro, pas/lecture/pause/reprise, annulation, réinitialisation,
vitesses et cibles exactes. Voir sa [réception](RECEPTION_ETAPE_07.md).
