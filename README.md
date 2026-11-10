# AntLab

Laboratoire web d'expérimentation autour de la fourmi de Langton.

**État actuel :** pages Accueil, Jeu et Aide, pavage navigable et panneau d'options
autour de Lanto. Le moteur déterministe et son catalogue de règles sont utilisables
sans affichage ou avec le Canvas raccordé au Worker. Le suivi de Lanto et les
gestes tactiles sont disponibles ; les commandes de simulation et le choix des
règles sont accessibles dans Jeu. Les changements en cours d’expérience, KPI,
campagnes et formats d’échange restent aux lots suivants.

## Préparer les commandes locales

Prérequis : Docker Engine et Docker Compose, sans Node ni npm sur l'hôte.
Depuis la racine du dépôt, après le clonage ou une mise à jour des dépendances :

```sh
export LOCAL_UID=$(id -u)
export LOCAL_GID=$(id -g)
docker compose build tools dev test
docker compose run --rm tools npm ci
```

Conserver les variables `LOCAL_UID` et `LOCAL_GID` dans chaque terminal local.

## 1. Lancer les tests automatiques

Tests unitaires et tests navigateur :

```sh
docker compose run --rm test npm test
```

Tous les contrôles avant une PR : analyse JavaScript, formatage, tests et build.

```sh
docker compose run --rm test
```

## 2. Lancer l'interface en local

```sh
docker compose --profile dev up --build dev
```

Ouvrir <http://localhost:5173>. Les modifications sont rechargées automatiquement.
Pour arrêter : Ctrl+C, puis :

```sh
docker compose --profile dev down
```

## 3. Construire et pousser une nouvelle image Docker Hub

Après une release sur `main`, utiliser un dépôt de travail propre et remplacer
`1.0.0` par la version publiée. Exécuter sur la machine locale :

```sh
git fetch --tags origin
export ANTLAB_VERSION=1.0.0
git switch --detach "v$ANTLAB_VERSION"

docker compose build tools test
docker compose run --rm tools npm ci
docker compose run --rm test

docker build --pull --target production -t "carthographie/antlab:$ANTLAB_VERSION" .
export ANTLAB_PREVIEW_IMAGE="carthographie/antlab:$ANTLAB_VERSION"
docker compose --profile preview up --no-build --wait preview
docker compose run --rm -e TEST_BASE_URL=http://preview:8080 test npm run test:e2e
```

Si les vérifications passent, publier l'image :

```sh
docker compose --profile preview down
unset ANTLAB_PREVIEW_IMAGE
docker login
docker push "carthographie/antlab:$ANTLAB_VERSION"
git switch -
```

Construire pour l'architecture du VPS. Chaque release utilise un tag distinct ;
conserver les anciennes images pour pouvoir revenir à la version précédente.

## 4. Mettre à jour et relancer en production

Sur le VPS, après intégration du modèle `compose.prod.yaml` dans
`/opt/stacks/apps/antlab` via le dépôt d'infrastructure `cARThographie` :

```sh
cd /opt/stacks/apps/antlab
export ANTLAB_VERSION=1.0.0
export ANTLAB_IMAGE="carthographie/antlab:$ANTLAB_VERSION"

docker compose -f compose.prod.yaml config --quiet
docker compose -f compose.prod.yaml pull antlab
docker compose -f compose.prod.yaml up -d --no-build --force-recreate --wait antlab
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=50 antlab
```

Remplacer `1.0.0` par la version poussée à l'étape 3 et adapter le nom du fichier
Compose si l'intégration utilise une autre convention. Le build de l'image est
réalisé à l'étape 3 ; ici, Docker récupère cette image et recrée le conteneur.

Vérifier <https://antlab.carthographie.fr>. Pour revenir en arrière, définir
`ANTLAB_IMAGE` avec la version précédente, puis répéter `pull` et `up`.
DNS, réseau `proxy` et Traefik doivent déjà être configurés par l'infrastructure.

## Documentation

- [Index et décisions du projet](docs/README.md)
- [Développement](docs/DEVELOPPEMENT.md) et [tests TDD](docs/TESTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Moteur déterministe et exemple Docker](docs/MOTEUR.md)
- [Catalogue de règles et compatibilités](docs/REGLES.md)
- [Pilotage asynchrone et Worker](docs/EXECUTION.md)
- [Visualisation et navigation tactile](docs/VISUALISATION.md)
- [Releases](docs/RELEASES.md) et [déploiement Docker](docs/DEPLOIEMENT.md)
- [Contexte](docs/CONTEXTE_LABORATOIRE_FOURMIS.md) et [roadmap](docs/ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md)

Les consignes de contribution applicables au dépôt sont dans [AGENTS.md](AGENTS.md).
