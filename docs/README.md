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
les commandes de simulation restent désactivées en attendant l'étape 07.
L'étape 05 fournit un contrôleur asynchrone et une API Worker testée sous Vite,
avec calcul par lots, pause, reprise, annulation et progression compacte.
La session du jeu se pilote par API sous Vite et son Worker est inclus dans le
build statique. Les commandes graphiques, les campagnes et les formats
d'échange restent à développer dans les lots correspondants de la roadmap.

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
