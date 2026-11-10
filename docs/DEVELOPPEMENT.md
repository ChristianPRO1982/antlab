# Développement

## Prérequis et installation

Utiliser Docker Engine et Docker Compose avec accès au démon local.
Node 24 LTS (au moins 24.15), npm et Chromium s'exécutent dans des conteneurs.

Depuis la racine du dépôt, sur Linux :

```sh
export LOCAL_UID=$(id -u)
export LOCAL_GID=$(id -g)
docker compose build tools dev test
docker compose run --rm tools npm ci
docker compose --profile dev up dev
```

La page est disponible sur <http://localhost:5173>. Le serveur écoute dans son
conteneur, mais son port hôte est lié à la boucle locale. Les modifications
du code sont prises en compte par Vite. Arrêter avec Ctrl+C, puis :

```sh
docker compose --profile dev down
```

Les services de développement et de test montent le dépôt et utilisent l'UID/GID
de l'utilisateur (1000:1000 par défaut). Conserver les deux variables dans chaque
terminal pour éviter les fichiers appartenant à root. `node_modules`, `dist` et
les rapports sont locaux, exclus de Git. Ne pas partager le même répertoire de
dépendances avec un Node natif d'un autre système.

## Commandes

| Besoin                            | Commande                                             |
| --------------------------------- | ---------------------------------------------------- |
| Tous les contrôles                | `docker compose run --rm test`                       |
| Tous les tests                    | `docker compose run --rm test npm test`              |
| Tests unitaires                   | `docker compose run --rm tools npm run test:unit`    |
| TDD en continu                    | `docker compose run --rm tools npm run test:watch`   |
| Tests navigateur                  | `docker compose run --rm test npm run test:e2e`      |
| Analyse JavaScript                | `docker compose run --rm tools npm run lint`         |
| Vérifier le format                | `docker compose run --rm tools npm run format:check` |
| Appliquer le format               | `docker compose run --rm tools npm run format`       |
| Construire les fichiers statiques | `docker compose run --rm tools npm run build`        |

Playwright démarre son propre serveur Vite dans le conteneur de test. Il peut
donc s'exécuter pendant que le service `dev` reste ouvert. Le service `test`
utilise la même version de Node et installe Chromium dans son image.

## Contributions

Créer une branche de développement ; travailler en TDD ; vérifier le résultat
et mettre à jour la documentation ; lancer tous les contrôles avant la PR.
Le titre de la PR doit être un Conventional Commit si la fusion se fait par squash.

Les tests ne sont pas exécutés dans GitHub Actions : leur exécution locale est
une responsabilité du contributeur. Un modèle de PR rappelle les vérifications.

## Dépendances et mises à jour

Les outils sont des dépendances de développement exclusivement. Les versions
directes sont exactes et `package-lock.json` verrouille les dépendances transitives.
L'image finale ne contient ni dépendances npm ni gestionnaire de paquets JavaScript.

Avant un ajout : examiner l'utilité, le dépôt officiel, la maintenance, la licence,
les dépendances transitives et les alertes connues. Préférer une bibliothèque
maintenue à une réimplémentation fragile, sans ajouter de dépendance sans besoin.

```sh
docker compose run --rm tools npm outdated
docker compose run --rm tools npm audit
docker compose run --rm tools npm ls --depth=0
```

Pour modifier une version : utiliser `docker compose run --rm tools npm install
--save-dev --save-exact nom@version`, puis examiner le diff du manifeste/lockfile.
Reconstruire `tools`, `dev` et `test`, relancer `npm ci` et tous les contrôles,
puis reconstruire et tester la production. Ne pas utiliser `npm audit fix --force`
sans analyse. Toute alerte non corrigée doit être expliquée dans le compte rendu.

Les bases Docker sont épinglées par digest dans le Dockerfile. Pour une mise à
jour, tirer une version officielle compatible, relever son RepoDigest, remplacer
le digest, reconstruire et vérifier. Mettre à jour régulièrement les images et
les actions GitHub épinglées ; le verrouillage ne remplace pas leur maintenance.
