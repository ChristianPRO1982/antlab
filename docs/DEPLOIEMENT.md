# Docker et déploiement manuel

## Image applicative

Le Dockerfile possède quatre cibles : outillage Node (`tooling`), outillage avec
Chromium (`browser-tools`), build statique (`build`) et Nginx (`production`, cible
finale). Les bases Node 24 et Nginx sans privilèges sont verrouillées par digest.

La production contient les fichiers construits, sans Node, npm, code de test ou
documentation. Nginx s'exécute sous UID/GID 101, écoute sur 8080 et possède un
healthcheck HTTP. Aucun volume de données utilisateur n'est nécessaire.

Les fichiers HTML sont revalidés ; seuls les assets nommés par empreinte reçoivent
un cache long. Les chemins inconnus répondent 404 : le socle n'est pas un routeur SPA.

## Vérification locale

```sh
docker compose --profile preview up --build --wait preview
docker compose run --rm -e TEST_BASE_URL=http://preview:8080 test npm run test:e2e
docker compose --profile preview down
```

La prévisualisation expose uniquement `127.0.0.1:8080`. Elle n'utilise ni Traefik
ni le réseau de production. Les détails des contrôles sont dans [TESTS.md](TESTS.md).

## Construire et pousser vers Docker Hub

Après une release, partir d'un checkout propre du tag publié. La version ci-dessous
est un exemple à remplacer ; le dépôt Docker Hub est `carthographie/antlab`.
L'image doit être accessible au VPS (ou y configurer manuellement l'authentification).

```sh
git fetch --tags origin
git switch --detach v1.0.0
export ANTLAB_VERSION=1.0.0
export ANTLAB_REPOSITORY=carthographie/antlab
docker build --target production -t "$ANTLAB_REPOSITORY:$ANTLAB_VERSION" .
export ANTLAB_PREVIEW_IMAGE="$ANTLAB_REPOSITORY:$ANTLAB_VERSION"
docker compose --profile preview up --no-build --wait preview
docker compose run --rm -e TEST_BASE_URL=http://preview:8080 test npm run test:e2e
```

`--wait` attend le healthcheck de l'image ; `--no-build` garantit que le test
porte sur l'image taguée, sans reconstruction implicite. Vérifier aussi
<http://localhost:8080>. Ne pas pousser avant les vérifications.

```sh
docker compose --profile preview down
unset ANTLAB_PREVIEW_IMAGE
docker login
docker push "$ANTLAB_REPOSITORY:$ANTLAB_VERSION"
git switch -
```

Ne pas écraser un tag déjà publié. Conserver des versions précises et le digest
retourné par le push pour les déploiements. Construire pour l'architecture du VPS ;
si elle diffère de la machine locale, utiliser Docker Buildx et vérifier l'image
sur l'architecture cible avant le déploiement.

## Contrat avec l'infrastructure

Le dépôt propriétaire du VPS et de Traefik est :
`/home/utilisateur/Documents/projects/perso/cARThographie/cARThographie`.

`compose.prod.yaml` est un **modèle applicatif** à intégrer, lors d'une opération
d'infrastructure distincte, dans la stack `/opt/stacks/apps/antlab`.
Ce modèle ne configure aucun serveur ni réseau global.

| Élément                  | Valeur attendue                                       |
| ------------------------ | ----------------------------------------------------- |
| Domaine                  | `antlab.carthographie.fr`                             |
| Réseau Docker existant   | `proxy`                                               |
| Entrée Traefik           | `websecure`                                           |
| Résolveur TLS existant   | `letsencrypt`                                         |
| Port interne             | `8080`                                                |
| Ports publiés sur le VPS | Aucun                                                 |
| Image                    | `ANTLAB_IMAGE` obligatoire, version précise ou digest |

Le domaine DNS doit pointer vers le VPS et Traefik doit pouvoir délivrer son
certificat. Aucun middleware de connexion ni service de base de données n'est requis.

## Déployer et revenir en arrière

Dans la future stack VPS, après intégration validée dans le dépôt d'infrastructure :

```sh
export ANTLAB_IMAGE=carthographie/antlab:1.0.0
docker compose -f compose.prod.yaml config --quiet
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
docker compose -f compose.prod.yaml ps
```

Vérifier ensuite <https://antlab.carthographie.fr>, le healthcheck et les journaux.
Pour revenir en arrière, remettre `ANTLAB_IMAGE` à la version précédente et répéter
`pull` puis `up -d --wait`. Ne pas utiliser `down` pour remplacer une version.

Le nom exact du fichier Compose dépendra de l'intégration dans le dépôt
d'infrastructure ; adapter les commandes à cette convention. Ne jamais créer un
second Traefik, publier un port public ou modifier la configuration globale depuis
AntLab. Aucun push Docker Hub ni déploiement VPS n'est réalisé par les workflows.
