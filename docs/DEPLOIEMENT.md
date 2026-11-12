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

## Construire et pousser vers Docker Hub

Après les tests et contrôles locaux, depuis le code à livrer :

```sh
docker build -t carthographie/antlab:latest .
docker push carthographie/antlab:latest
```

Effectuer `docker login` une première fois si nécessaire. Le dépôt Docker Hub
est `carthographie/antlab` ; l'image doit être accessible au VPS, avec une
authentification sur celui-ci si elle est privée.

Le VPS actuel utilise `linux/amd64`. Les commandes ci-dessus supposent une
machine de build de même architecture. Depuis une autre architecture, utiliser
un builder Buildx configuré pour `linux/amd64` :

```sh
docker buildx build --platform linux/amd64 -t carthographie/antlab:latest --push .
```

Cette commande remplace les deux commandes build/push précédentes. Aucun build
n'est effectué sur le VPS. Les releases GitHub et les tags Git restent indépendants
de la publication manuelle du tag Docker `latest`.

## Vérification complémentaire de l'image Nginx

La prévisualisation n'est pas une étape obligatoire de chaque mise à jour.
Elle permet notamment de vérifier un changement de Dockerfile ou de configuration
Nginx. Après le build local, démarrer exactement l'image construite :

```sh
docker compose --profile preview up --no-build --wait preview
docker compose run --rm -e TEST_BASE_URL=http://preview:8080 test npm run test:e2e
docker compose --profile preview down
```

Pour construire une image destinée uniquement à cet aperçu :

```sh
docker compose --profile preview build preview
```

Le service utilise lui aussi `carthographie/antlab:latest`. La prévisualisation
expose uniquement `127.0.0.1:8080`, sans Traefik ni réseau de production. Elle ne
publie aucune image sur Docker Hub. Voir [TESTS.md](TESTS.md).

## Contrat avec l'infrastructure

Le dépôt propriétaire du VPS et de Traefik est :
`/home/utilisateur/Documents/projects/perso/cARThographie/cARThographie`.

`compose.prod.yaml` est un **modèle applicatif** à intégrer, lors d'une opération
d'infrastructure distincte, dans la stack `/opt/stacks/apps/antlab`.
Ce modèle ne configure aucun serveur ni réseau global.

| Élément                  | Valeur attendue                                  |
| ------------------------ | ------------------------------------------------ |
| Domaine                  | `antlab.carthographie.fr`                        |
| Réseau Docker existant   | `proxy`                                          |
| Entrée Traefik           | `websecure`                                      |
| Résolveur TLS existant   | `letsencrypt`                                    |
| Port interne             | `8080`                                           |
| Ports publiés sur le VPS | Aucun                                            |
| Image                    | `carthographie/antlab:latest`, fixé dans le YAML |

Le domaine DNS doit pointer vers le VPS et Traefik doit pouvoir délivrer son
certificat. Aucun middleware de connexion ni service de base de données n'est requis.

## Déployer sur le VPS

Après intégration du modèle dans le dépôt d'infrastructure, le fichier installé
sur le VPS est `/opt/stacks/apps/antlab/docker-compose.yml`. Il référence
`carthographie/antlab:latest` en dur, sans variable `ANTLAB_IMAGE` ni fichier `.env`
pour sélectionner l'image.

Lors de la préparation initiale, valider la configuration :

```sh
cd /opt/stacks/apps/antlab
docker compose config --quiet
```

Pour le premier démarrage et les mises à jour suivantes :

```sh
cd /opt/stacks/apps/antlab
docker compose pull antlab
docker compose up -d --no-build antlab
```

Docker récupère l'image publiée et remplace le conteneur si elle a changé.
Ne pas utiliser `down` pour mettre à jour. Vérifier ensuite
<https://antlab.carthographie.fr>. Pour examiner l'état et les journaux :

```sh
docker compose ps
docker compose logs --tail=50 antlab
```

## Retour à une image précédente

Le tag `latest` est mutable. Avant une mise à jour, relever le digest de l'image
actuellement exécutée et le conserver dans le suivi de déploiement :

```sh
docker inspect "$(docker compose ps -q antlab)" --format '{{.Image}}'
docker image inspect "$(docker inspect "$(docker compose ps -q antlab)" --format '{{.Image}}')" --format '{{json .RepoDigests}}'
```

Pour revenir à cette image, remplacer temporairement la ligne `image` de la stack
par `carthographie/antlab@sha256:...`, avec le digest conservé, puis répéter `pull`
et `up -d --no-build`. Rétablir `carthographie/antlab:latest` pour reprendre les
mises à jour courantes.

Ces modifications de stack relèvent du dépôt d'infrastructure `cARThographie`.
Ne jamais créer un second Traefik, publier un port public ou modifier la
configuration globale depuis AntLab. Aucun push Docker Hub ni déploiement VPS
n'est réalisé par les workflows.
