# Documentation AntLab

## État du projet

Le dépôt prépare le laboratoire ; seule une page technique de démarrage existe.
Le moteur, les règles, le Worker, les graphiques, les campagnes et les formats
d'échange restent à développer dans les lots correspondants de la roadmap.

| Document                                           | Usage                                   |
| -------------------------------------------------- | --------------------------------------- |
| [Contexte](CONTEXTE_LABORATOIRE_FOURMIS.md)        | Intention et principes scientifiques    |
| [Roadmap](ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md) | Lots et critères de réception           |
| [Architecture](ARCHITECTURE.md)                    | Responsabilités et décisions techniques |
| [Développement](DEVELOPPEMENT.md)                  | Commandes Docker et conventions         |
| [Tests](TESTS.md)                                  | Cycle TDD et contrôles disponibles      |
| [Releases](RELEASES.md)                            | Branches, Conventional Commits et robot |
| [Déploiement](DEPLOIEMENT.md)                      | Image, Docker Hub et contrat VPS        |
| [Changelog](CHANGELOG.md)                          | Historique produit par semantic-release |
| [Réception du socle](RECEPTION_SOCLE.md)           | Vérifications réalisées et limites      |

## Décisions validées

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
