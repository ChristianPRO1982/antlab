## Stratégie de tests du projet

Le laboratoire est un simulateur scientifique déterministe. La fiabilité et la reproductibilité de ses calculs sont prioritaires.

### Principes

- Utiliser Vitest pour les tests unitaires et d'intégration.
- Utiliser Playwright pour les principaux parcours de l'interface web.
- Privilégier le TDD pour la géométrie, les règles, le moteur, les KPI et les mécanismes de reproductibilité.
- Pour les interfaces graphiques, tester principalement les comportements observables plutôt que les détails de présentation.
- Tester les cas limites et les invariants mathématiques.
- Garantir l'équivalence des résultats entre exécution interactive, exécution accélérée et exécution par lots.
- Ne jamais modifier un résultat attendu uniquement pour faire passer un test.
- Toute correction de bug doit être accompagnée d'un test de non-régression lorsque cela est pertinent.
- Les tests ne doivent jamais dépendre de la vitesse du processeur ou de l'ordre d'exécution des tâches parallèles.

### Déroulement de chaque étape

1. Analyser les critères de réception de la roadmap.
2. Identifier les comportements testables et les résultats attendus.
3. Écrire les tests avant le code pour les composants scientifiques.
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