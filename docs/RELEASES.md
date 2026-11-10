# Releases

## Circuit

1. Développer sur une branche dédiée.
2. Exécuter les contrôles et tests localement via Docker.
3. Ouvrir une PR vers `main` et y indiquer les résultats.
4. Fusionner : le workflow GitHub de release analyse les commits sur `main`.
5. Si une version est justifiée, le robot met à jour le changelog, crée le tag
   et publie les notes GitHub. Construire, pousser et déployer ensuite manuellement.

Il n'y a ni branche de prérelease imposée ni automatisation des tests, des images
ou du déploiement. Une modification de documentation ou d'outillage seule peut
ne produire aucune release : c'est normal.

## Conventional Commits et versions

| Message                                | Effet                     |
| -------------------------------------- | ------------------------- |
| `fix: corriger une transition`         | Patch                     |
| `feat: ajouter une règle`              | Mineure                   |
| Corps contenant `BREAKING CHANGE: ...` | Majeure                   |
| `docs: ...`, `test: ...`, `chore: ...` | Aucune version par défaut |

Pour exprimer une rupture, utiliser le marqueur `BREAKING CHANGE:` dans le corps
du commit, reconnu par le preset de l'analyseur. Le titre retenu lors d'un squash
doit respecter ces conventions ; préserver aussi le corps en cas de rupture.

La version de livraison est le tag `vX.Y.Z`. `package.json` conserve
`0.0.0-development` : le robot ne modifie pas les manifestes et ne publie rien sur npm.
Sans tag antérieur, la première release calculée commence normalement à `1.0.0`.

## Fonctionnement du robot

Un seul workflow s'exécute sur les pushes de `main`, après fusion des PR selon la
convention du projet. Il installe les dépendances verrouillées puis exécute
`semantic-release`. Aucun test ni build n'est implicitement ajouté à ce workflow.

L'ordre des plugins est : analyse des commits, notes, changelog, commit Git,
publication GitHub. Le seul fichier commité automatiquement est `docs/CHANGELOG.md`.
Le commit `chore(release): ... [skip ci]` évite les boucles. Les commentaires
automatiques sur PR/issues, les issues d'échec et les labels sont désactivés.

Le jeton intégré `GITHUB_TOKEN` reçoit uniquement `contents: write`. Les actions
sont épinglées par SHA ; aucune information Docker Hub ou VPS n'est nécessaire.

## Prérequis GitHub à configurer manuellement

- Autoriser GitHub Actions et l'écriture de contenu pour ce workflow.
- Organiser les règles de branche pour imposer les PR aux contributeurs.
- Le robot doit pouvoir pousser son commit de changelog et ses tags. Si les règles
  de `main` l'interdisent, configurer une exception ciblée pour un robot autorisé
  ou un jeton d'application avec ces droits ; ne pas désactiver globalement la
  protection. Adapter alors le jeton du checkout et de semantic-release ensemble.
- La préparation du dépôt ne change aucun de ces paramètres. Sans droits adéquats,
  la release échoue ; elle ne contourne pas la protection.

La première exécution complète ne sera confirmée qu'après une fusion et une
release autorisées. Les vérifications locales doivent rester sans publication :
chargement de la configuration, résolution des plugins et analyse de messages
représentatifs. Ne pas lancer une release réelle pour vérifier le socle.

Références : [semantic-release](https://semantic-release.org/usage/configuration/),
[plugin changelog](https://github.com/semantic-release/changelog),
[plugin Git](https://github.com/semantic-release/git).
