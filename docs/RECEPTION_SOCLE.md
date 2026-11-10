# Réception du socle

Préparation du dépôt le **10 novembre 2026**. Aucun développement de simulation,
de règle, de Worker scientifique ou de format de sauvegarde n'est inclus.

## Vérifications réalisées

Le bilan final ci-dessous concerne uniquement le socle technique.

| Vérification                  | Résultat                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| TDD navigateur avant la page  | Échec attendu : HTTP 404 au lieu de 200                                     |
| Page après implémentation     | Test Chromium réussi : HTML, JS, CSS, absence d'erreurs                     |
| Installation verrouillée      | `npm ci` réussi dans Docker sous UID/GID utilisateur                        |
| ESLint                        | Réussi                                                                      |
| Compose local et production   | Configurations valides ; image de production obligatoire                    |
| Build statique et image Nginx | Construits ; conteneur sain                                                 |
| Utilisateur de production     | UID/GID 101, sans Node ni npm                                               |
| Configuration de release      | Plugins résolus, options changelog/Git validées sans préparation de release |
| Analyse de commits            | Patch, mineure, majeure et absence de release pour docs/chore vérifiées     |

Le contrôle global `docker compose run --rm test` est passé : ESLint, Prettier,
Vitest (suite vide signalée), un test Chromium et build Vite. Le même test passe
sur l'image construite avec `TEST_BASE_URL=http://preview:8080`.

Les options du plugin GitHub ont été validées sans jeton : seule l'absence de
jeton est signalée. La génération des notes a été vérifiée sur un message
synthétique, sans appel réseau ni publication.

Le rechargement Vite a été vérifié dans Chromium en modifiant uniquement la date
du module source : la page est rechargée et le statut réapparaît. Le contenu du
fichier est resté identique et sa date a été restaurée.

Environnement de contrôle : Linux amd64, Docker Engine 29.8.2, Compose 5.6.0,
Node 24.22.2 dans les conteneurs. Les fichiers générés appartiennent à l'utilisateur
local. Le prompt utilisateur a été préservé à l'identique. Les critères de l'étape
01 sont cochés ; aucune étape scientifique suivante n'est clôturée.

Vitest est configuré, mais **aucun test unitaire scientifique n'existe**. Son
autorisation temporaire de suite vide est explicite et devra être retirée au
premier test unitaire ou d'intégration.

## Dépendances examinées

Les dépendances directes sont verrouillées et limitées aux outils de développement :
Vite/Vitest, ESLint, Prettier et semantic-release (MIT), Playwright (Apache-2.0).
Les plugins sont ceux du projet semantic-release. Les digests des images Node et
Nginx sans privilèges, ainsi que les SHA des actions officielles GitHub, sont fixés.

L'audit npm du lot signale **43 alertes modérées, aucune haute ou critique**,
issues de deux avis et de leur propagation dans les dépendances d'outillage :

- [minimatch : amplification de motifs glob](https://github.com/advisories/GHSA-g3hv-75wg-m249),
  notamment via ESLint et le npm transitif de semantic-release ;
- [glob : annulation AbortSignal incomplète](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4),
  via ce npm transitif.

Ces composants manipulent les fichiers et motifs du dépôt pendant les contrôles
ou la livraison. Ils ne sont pas embarqués dans les fichiers statiques ni dans
l'image finale. Le plugin de publication npm, installé transitivement par
semantic-release, n'est pas activé. Aucun motif fourni par un utilisateur du site
n'est envoyé à ces outils dans le socle.

Les versions directes récentes ne corrigent pas encore toutes ces chaînes.
Pas de rétrogradation majeure ou d'override incompatible appliqué pour masquer
les alertes ; suivre les correctifs amont et réévaluer lors des mises à jour.
`npm audit --omit=dev` ne signale aucune alerte. Cela ne constitue pas un audit
de sécurité des paquets système de l'image Nginx ; aucun scanner d'image n'a été lancé.

## Prérequis externes et limites

- La vraie release GitHub attend une fusion autorisée et les droits d'écriture
  du robot sur le changelog et les tags ; aucune publication n'a été exécutée.
- Le dépôt Docker Hub retenu est `carthographie/antlab` ; sa visibilité et les
  droits de push/pull restent à configurer.
- DNS, routage TLS et activation de la stack VPS restent à réaliser depuis le
  dépôt d'infrastructure ; aucun fichier de celui-ci n'a été modifié.
- Aucun push Git, push Docker Hub ou déploiement distant n'a été effectué.
- Les comportements scientifiques et l'import/export ne sont pas encore testables.

Le mode opératoire pour rejouer les vérifications se trouve dans
[DEVELOPPEMENT.md](DEVELOPPEMENT.md) et [TESTS.md](TESTS.md).
