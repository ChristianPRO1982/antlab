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

## 3. Construire et pousser l'image

Après les contrôles locaux, construire une seule image depuis le code à livrer,
puis la publier sur Docker Hub :

```sh
docker build -t carthographie/antlab:latest .
docker push carthographie/antlab:latest
```

Effectuer `docker login` une première fois si nécessaire. L'image doit cibler
`linux/amd64`, l'architecture du VPS actuel. Ces commandes supposent une machine
de build de même architecture ; voir [Déploiement](docs/DEPLOIEMENT.md).
Le tag Docker `latest` est mis à jour manuellement ; les releases GitHub restent
indépendantes. La prévisualisation Nginx est disponible en vérification complémentaire.

## 4. Mettre à jour la production

Sur le VPS, le modèle `compose.prod.yaml` est intégré sous le nom
`docker-compose.yml` dans `/opt/stacks/apps/antlab`, via le dépôt d'infrastructure
`cARThographie`. L'image `carthographie/antlab:latest` est fixée dans le YAML.

```sh
cd /opt/stacks/apps/antlab
docker compose pull antlab
docker compose up -d --no-build antlab
```

Le VPS télécharge l'image déjà construite et remplace le conteneur si elle a
changé. Aucun build, variable d'image ou arrêt préalable avec `down` n'est requis.
Vérifier <https://antlab.carthographie.fr>. En cas de problème :

```sh
docker compose ps
docker compose logs --tail=50 antlab
```

DNS, réseau `proxy` et Traefik doivent déjà être configurés par l'infrastructure.
La préparation initiale et le retour à une image précédente sont décrits dans
[Déploiement](docs/DEPLOIEMENT.md).

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
