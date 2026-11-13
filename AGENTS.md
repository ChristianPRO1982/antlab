# Consignes de développement AntLab

Ces consignes s'appliquent à tout le dépôt. Lire le contexte, la roadmap et
`docs/README.md` avant de travailler. Les instructions explicites de l'utilisateur
priment. Ne développer que le lot demandé.

## Architecture et qualité

- HTML, CSS et JavaScript en modules ES, sans framework imposé.
- Un seul moteur JavaScript pour les modes interactif et campagne ; calcul dans
  un Web Worker, indépendant du DOM, du Canvas et du temps réel.
- Aucun backend applicatif, authentification, cookie de connexion, base de données,
  localStorage ou IndexedDB de sauvegarde. L'état de session reste en mémoire.
- Sauvegarde future : export volontaire `.md` avec JSON versionné intégré,
  réimportable. Ne pas implémenter ce format avant le lot correspondant.
- Préférer de petits modules aux responsabilités claires et des noms explicites.
  Ne pas créer d'abstractions ou de modules vides pour des besoins futurs.
- Valider les entrées aux frontières ; signaler les erreurs sans les masquer.
- Écrire du code robuste, simple et lisible ; documenter les conventions utiles.
- Une bibliothèque est bienvenue si son utilité, sa maintenance, sa licence et
  ses dépendances ont été examinées. Verrouiller les versions et le lockfile.
- Toute la documentation détaillée reste dans `docs`. Le README racine et ce
  fichier sont des points d'entrée. Ne pas modifier les fichiers utilisateur
  non suivis sans demande.
- Les commandes de développement, tests et qualité s'exécutent via Docker.
  Voir `docs/DEVELOPPEMENT.md` ; ne pas nécessiter Node sur l'hôte.
- Ne jamais modifier le VPS, Traefik global ou le dépôt d'infrastructure depuis
  une tâche AntLab. Leur propriétaire est le dépôt voisin `cARThographie`.

## Stratégie de tests du projet

Le laboratoire est un simulateur scientifique déterministe. La fiabilité et la reproductibilité de ses calculs sont prioritaires.

### Principes

- Utiliser Vitest pour les tests unitaires et d'intégration.
- Utiliser Playwright pour les principaux parcours de l'interface web.
- Le TDD est obligatoire : écrire un test qui échoue, implémenter le minimum,
  puis refactoriser. Il s'applique notamment à la géométrie, aux règles, au moteur,
  aux KPI et aux mécanismes de reproductibilité.
- Pour les interfaces graphiques, tester principalement les comportements observables plutôt que les détails de présentation.
- Tester les cas limites et les invariants mathématiques.
- Garantir l'équivalence des résultats entre exécution interactive, exécution accélérée et exécution par lots.
- Ne jamais modifier un résultat attendu uniquement pour faire passer un test.
- Toute correction de bug doit être accompagnée d'un test de non-régression lorsque cela est pertinent.
- Les tests ne doivent jamais dépendre de la vitesse du processeur ou de l'ordre d'exécution des tâches parallèles.

### Déroulement de chaque étape

1. Analyser les critères de réception de la roadmap.
2. Identifier les comportements testables et les résultats attendus.
3. Écrire et exécuter les tests avant le code ; constater l'échec pertinent.
4. Développer les fonctionnalités.
5. Exécuter les nouveaux tests et les tests de non-régression.
6. Corriger les erreurs avant de clôturer l'étape.
7. Cocher uniquement les critères réellement vérifiés.

### Compte rendu

À la fin de chaque étape, préciser :

- les fonctionnalités implémentées ;
- les tests créés ;
- les résultats des tests exécutés ;
- les limites connues ;
- les éventuelles vérifications manuelles restantes.

Ne pas ajouter de mécanismes complexes uniquement pour faciliter les tests.

## Git et livraison

- Travailler sur une branche de développement ; lancer les contrôles locaux
  avant une PR vers `main`. Utiliser Conventional Commits et un titre de PR
  compatible si elle est fusionnée par squash.
- Uniquement `semantic-release` est automatisé sur `main` : tag, GitHub Release
  et `docs/CHANGELOG.md`. Ne pas lancer une vraie release pour la tester.
- Build, push Docker Hub et déploiement sont manuels, avec l’image Docker `latest`.
- Ne pas créer de workflows de tests, de build/push Docker ou de déploiement
  sans nouvelle demande.
