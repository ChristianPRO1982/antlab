# AntLab

**FR —** Laboratoire web d'expérimentation autour de la fourmi de Langton : explorer des règles élémentaires, des géométries et les comportements émergents qu'elles produisent.

**EN —** A web-based laboratory inspired by Langton's ant, for exploring elementary rules, grid geometries and the emergent behaviors they produce.

> **État du projet / Project status:** conception et développement initial (*early development*). Les fonctionnalités décrites ci-dessous sont des **objectifs**, pas nécessairement des fonctions déjà disponibles.

## L'idée / The idea

**FR** — À partir d'une fourmi, de cases noires ou blanches et de règles locales très simples, AntLab propose d'observer, mesurer et comparer des phénomènes qui apparaissent après des milliers ou des millions d'étapes. Il ne s'agit pas de prouver qu'un comportement est inédit, mais de rendre son exploration rigoureuse et reproductible.

Le premier terrain d'expérimentation est un plan virtuellement infini pavé de **croix de cinq cases** : une case centrale et quatre branches. Une visite au centre peut déclencher une règle collective sur toute la croix. Le damier classique de Langton et d'autres géométries pourront être ajoutés par la suite.

**EN** — Starting with one ant, black-and-white cells and simple local rules, AntLab aims to observe, measure and compare patterns emerging after thousands or millions of steps. The goal is not to claim scientific novelty, but to make experiments reproducible and easy to explore.

The first experimental world is a virtually infinite plane tiled with **five-cell crosses**: one center and four arms. Visiting a center may trigger a rule affecting the entire cross. Classic Langton grids and other geometries may follow.

## Fonctionnalités envisagées / Planned features

- **Règles configurables / Configurable rules:** choix de règles exclusives et de modificateurs compatibles ; démarrage en noir et blanc.
- **Simulation pilotable / Controllable simulation:** pas à pas, lecture, pause, vitesse réglable, calcul jusqu'à une étape cible (10 000, 100 000, 1 000 000 ou valeur libre).
- **Visualisation / Visualization:** vue déplaçable et zoomable d'un monde sans bord prédéfini ; calcul indépendant de l'affichage.
- **Changement de règles / Rule changes:** mise en pause et choix entre poursuivre l'expérience ou repartir de zéro, avec historique des changements.
- **Mesures / Metrics:** nombre de cases noires, dimensions de la zone englobante, maxima historiques, distance à l'origine et courbes d'évolution.
- **Campagnes / Batch experiments:** exécuter automatiquement toutes les combinaisons de règles compatibles sur un nombre d'étapes choisi, sans animation, puis comparer les résultats.
- **Export et reprise / Export and resume:** fichiers JSON pour les données et états, rapports Markdown lisibles, import et partage de configurations.

## Principes / Principles

- **Simplicité / Simplicity:** une fourmi, deux couleurs et des règles élémentaires pour commencer.
- **Déterminisme / Determinism:** à conditions et règles identiques, résultats identiques.
- **Reproductibilité / Reproducibility:** numéros d'étapes, historique des changements et formats documentés.
- **Extensibilité / Extensibility:** séparer géométrie, règles, moteur, observations et interface.
- **Sobriété / Lightweight design:** pas de compte utilisateur, de base de données ni de sauvegarde serveur prévus pour la première version.

## Orientation technique / Technical direction

Application web légère, avec **HTML / CSS / JavaScript**, **Canvas 2D** pour le rendu et **Web Workers** pour les calculs intensifs. Le moteur sera indépendant de l'interface afin de pouvoir aussi exécuter des campagnes sans affichage. Le monde sera représenté de manière clairsemée : seules les cases utiles seront stockées.

*Lightweight browser app; an independent deterministic engine, Canvas rendering, Web Workers for computation, and sparse world storage. No backend is required for the initial version.*

Les outils de test envisagés sont **Vitest** (moteur et règles) et **Playwright** (parcours navigateur), avec une priorité aux tests de reproductibilité.

## Documentation / Documentation

Documents de conception destinés à accompagner le dépôt :

- `CONTEXTE_LABORATOIRE_FOURMIS.md` — vision, principes et périmètre du projet.
- `ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md` — roadmap en 15 étapes, cases à cocher et prompts de développement pour Codex.

*These design documents describe the intended system; implementation progress should be tracked separately from planned features.*

## Démarrage / Getting started

Le projet est en cours de préparation. Les instructions d'installation et de lancement seront ajoutées dès qu'une première version exécutable sera disponible.

*The project is in early development. Installation and usage instructions will be added when a runnable version is available.*

---

**AntLab** — Des règles simples, des résultats inattendus.  
*Simple rules, unexpected outcomes.*
