# Contexte du projet — Laboratoire de fourmis et de règles émergentes

> **Rôle de ce document :** point d'entrée pour une nouvelle conversation Codex dans le dépôt `antlab`, notamment depuis VSCode. Il rassemble l'intention, les décisions établies et la manière de reprendre le travail. Les périmètres détaillés et leur suivi sont dans la roadmap. **Lire ce document ne constitue pas une demande de développement.**

## 0. Démarrer une conversation dans le dépôt

Ne pas supposer que l'historique des conversations précédentes est disponible.
Commencer par prendre connaissance des fichiers et de l'état réel du dépôt.

### Parcours de lecture

1. Lire [`AGENTS.md`](../AGENTS.md), à la racine : consignes de contribution,
   architecture, TDD et livraison applicables à tout le dépôt.
2. Lire le présent document : vision du laboratoire et décisions de référence.
3. Lire [`docs/README.md`](README.md) et
   [`docs/ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md`](ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md) :
   index documentaire, étapes, périmètres et critères de réception.
4. Consulter le [README racine](../README.md) pour les commandes, puis les documents
   utiles à la tâche : [architecture](ARCHITECTURE.md),
   [développement](DEVELOPPEMENT.md), [tests](TESTS.md),
   [releases](RELEASES.md) et [déploiement](DEPLOIEMENT.md).

### Vérifier le point de départ

- Inspecter la branche courante, les modifications locales et les derniers commits
  avec `git branch --show-current`, `git status --short` et `git log -5 --oneline`.
- Confronter les cases de la roadmap au code et aux tests présents. Une intention
  décrite dans ce contexte ne signifie pas que la fonctionnalité existe déjà.
- Consulter le [changelog](CHANGELOG.md) pour les versions publiées et les bilans
  de réception pour les vérifications réalisées. La valeur `0.0.0-development`
  de `package.json` n'est pas la version de release ; les tags font référence.
- Préserver les modifications existantes. Ne pas changer de branche, créer de
  commit ou publier quoi que ce soit pendant cette prise de connaissance.

À l'issue d'une demande de lecture initiale, fournir une synthèse courte : objectif,
état constaté, prochaine étape non clôturée et contraintes essentielles. Attendre
ensuite la demande de travail ; ne pas déduire de la prochaine case vide une
autorisation de l'implémenter. Le prompt de démarrage réutilisable est dans
[`docs/prompt.txt`](prompt.txt).

Les instructions explicites de l'utilisateur priment. `AGENTS.md` définit les
consignes ; le contexte explique les choix ; la roadmap définit les lots et leur
réception. Si ces sources ou le code se contredisent, signaler l'écart avant de
prendre une décision qui changerait le sens scientifique de l'expérience.

**Repère au 10 novembre 2026 :** le socle technique a été livré en `v1.0.0`.
Les étapes 01 à 07 sont clôturées ; le lot 07 assemble le poste de pilotage sur
`feat/laboratory-interface`, sans nouvelle release. Les pages Accueil, Jeu et
Aide, Lanto, le panneau redimensionnable, la navigation souris/tactile et les
commandes scientifiques sont présents. Le formulaire choisit les cinq règles
centrales, les seuils et la rotation compatible à zéro, puis se verrouille.
Pas, lecture/pause/reprise, vitesse, annulation, reset et cibles exactes pilotent
le même moteur dans le Worker. Une réinitialisation conserve règles, vitesse et
vue et recrée une expérience à zéro ; aucune continuation avec nouvelle règle
n’est encore disponible. La prochaine étape est le changement de règles avec
dialogue et journal (08). Voir [l’interface](INTERFACE.md), les
[conventions du moteur](MOTEUR.md), le [catalogue](REGLES.md), le
[pilotage](EXECUTION.md), la [visualisation](VISUALISATION.md) et le
[bilan du lot 07](RECEPTION_ETAPE_07.md). Ce repère est une
photographie : revérifier Git, le code et la roadmap lors de toute reprise.

## 1. Origine et intention

Le projet est inspiré de la **fourmi de Langton** : un automate très simple dont les déplacements et les modifications d'un damier produisent des comportements parfois inattendus.

L'objectif n'est pas de reproduire uniquement cet automate, ni de complexifier artificiellement ses règles. Il est de créer un **petit laboratoire d'expérimentation** permettant de choisir, combiner et comparer des **règles élémentaires** pour observer les comportements qui émergent de leur répétition.

L'ambition est exploratoire : expérimenter librement, découvrir des motifs ou des dynamiques intéressants, et pouvoir les reproduire. L'originalité d'une règle ou d'un résultat ne doit pas être présumée sans recherche documentaire. Le projet ne vise pas à formuler d'emblée des théories mathématiques avancées.

Principes directeurs : **simplicité, déterminisme, lisibilité, reproductibilité et extensibilité progressive**. Éviter l'« usine à gaz ».

### Mascotte et identité visuelle

La mascotte d'AntLab s'appelle **Lanto**, un nom formé à partir de **Langton**
et **Ant** (« fourmi » en anglais). Lanto est une **fourmi bleu électrique**,
retenue comme référence pour la conception visuelle du site.

Les images de référence sont regroupées dans `src/assets/lanto/` :
[`Lanto.png`](../src/assets/lanto/Lanto.png) et
[`Lanto-top.webp`](../src/assets/lanto/Lanto-top.webp). Le PNG sert de logo, de
favicon et d'illustration d'accueil ; le WebP représente la fourmi affichée dans
la grille. Le fichier `Lanto-top.origin.png` reste la source originale de la vue
de dessus. Les ressources utilisées sont importées par Vite lors du build.

## 2. Monde expérimental initial

Le premier monde envisagé est un **plan théoriquement infini**, composé de cases carrées structurées en **croix de cinq cases** (un centre et quatre branches). Ces croix constituent le pavage du monde.

- Chaque case possède initialement l'une de deux couleurs : **blanc ou noir** ; le blanc est la couleur par défaut.
- Une seule fourmi est présente au départ.
- La fourmi dispose d'une position et d'une orientation et avance selon des règles de déplacement inspirées de Langton.
- La distinction entre **case centrale** et **case périphérique** permet de déclencher des transformations différentes.
- Le plan n'a pas de bord dans le modèle : l'interface n'en montre qu'une portion. Une implémentation informatique restera nécessairement limitée par les ressources disponibles.

Le choix du pavage en croix est un **point de départ**, pas une interdiction d'étudier ultérieurement d'autres géométries.

La roadmap propose comme convention géométrique qu'une case entière `(x, y)` soit
un centre si `x + 2y` est multiple de 5. La convention retenue doit être formalisée
et testée à l'étape 02 : chaque case appartient à une unique croix, y compris aux
coordonnées négatives. Le monde ne stocke que les cases noires ; une case redevenue
blanche est retirée du stockage. Les limites numériques doivent être explicites.

## 3. Philosophie des règles

Le système doit permettre de **sélectionner les règles d'une expérience** via une interface accessible, sans programmation par l'utilisateur.

Certaines règles sont **mutuellement exclusives** : une seule règle peut être choisie dans une catégorie donnée. D'autres sont **facultatives** et combinables si elles ne se contredisent pas. Les incompatibilités doivent être explicites. Le catalogue est destiné à s'enrichir progressivement, sans activer toutes les règles à la fois.

Les cinq règles pour une visite sur la **case centrale** d'une croix
sont alternatives : une seule est active à la fois. Leurs définitions de référence,
précisées dans la roadmap, sont :

- **Inversion collective** : les cinq cases inversent individuellement leur couleur.
- **Centre maître** : les cinq cases prennent la couleur opposée à l'ancienne couleur du centre.
- **Majorité inversée** : si le nombre de cases noires atteint le seuil choisi, les cinq deviennent blanches ; sinon, elles deviennent noires.
- **Majorité l'emporte** : si le nombre de cases noires atteint le seuil choisi, les cinq deviennent noires ; sinon, elles deviennent blanches.
- **Inversion simple** : seule la case visitée change de couleur, comme point de comparaison.

Les deux règles de majorité comptent le centre et les quatre branches avant
transformation. Leur seuil est sélectionnable parmi **1, 2, 3, 4 et 5**, avec
**3 par défaut**. Atteindre exactement le seuil suffit à déclencher la décision.

Sur une branche, le comportement de base est l'inversion de la case visitée.
Les décisions utilisent les couleurs observées **avant** la transformation.

D'autres mécanismes élémentaires ont été imaginés, par exemple faire tourner les couleurs des quatre branches ou appliquer des transformations conditionnelles. Il s'agit de **pistes exploratoires**, pas d'une liste définitivement arrêtée.

Toute nouvelle règle ou combinaison devra définir sans ambiguïté l'état observé,
les seuils, l'ordre des effets et ses incompatibilités. Une évolution qui change
le sens d'une règle existante nécessite un nouvel identifiant ou une nouvelle
version ; elle ne doit pas altérer silencieusement les anciennes expériences.

## 4. Philosophie de la simulation

Une **étape** correspond à une transition élémentaire complète de l'automate. Le nombre d'étapes est la référence scientifique de toute expérience.

La transition de référence est : lire la couleur de la case visitée, tourner,
transformer les couleurs selon la règle active, avancer d'une case et incrémenter
le compteur. Par défaut, blanc signifie tourner à droite et noir tourner à gauche.
Les décisions de rotation et de transformation portent sur l'état avant modification.

Le laboratoire doit permettre :

- L'observation animée de la fourmi et des cases ;
- La pause, la reprise et le pas à pas ;
- Des vitesses de simulation variables ;
- Le calcul jusqu'à une **étape cible** (par exemple 10 000, 100 000 ou 1 000 000), avec possibilité d'indiquer une valeur précise ;
- Le zoom, le déplacement de la caméra et idéalement le suivi de la fourmi.

**Le calcul des étapes et l'affichage sont deux activités distinctes.** Pour aller vite, on peut calculer de nombreuses transitions entre deux rafraîchissements graphiques. Atteindre une étape future implique normalement de calculer les étapes intermédiaires, sauf reprise d'un état déjà enregistré.

Deux modes utiliseront **le même moteur JavaScript** :

- **Interactif** : observation animée, commandes et indicateurs.
- **Campagne en série** : configurations compatibles et uniques, calculées sans
  animation avec des conditions initiales et un nombre de transitions explicites.
  Leur nombre et le volume total de calcul sont annoncés avant lancement ;
  progression, annulation et erreurs restent visibles. Chaque expérience conserve
  un résultat distinct, comparable et exportable, même après interruption de la campagne.

Les résultats scientifiques doivent être identiques en mode interactif, accéléré
ou campagne pour une même configuration et un même nombre de transitions.
Un Worker reste lié à la durée de vie de la page ; aucun calcul après fermeture
de l'onglet n'est garanti.

### Changement des règles en cours d'expérience

Un changement de règle **met automatiquement la simulation en pause**. L'interface demande alors si l'utilisateur souhaite :

1. **Poursuivre depuis l'état actuel**, avec la nouvelle règle appliquée aux étapes suivantes ;
2. **Recommencer depuis les conditions initiales**, avec la nouvelle configuration ;
3. **Annuler la modification**.

La poursuite conserve notamment les couleurs du monde, la position et l'orientation de la fourmi et le numéro de l'étape. Tout changement effectif de règle doit être **daté par son numéro d'étape**, afin que l'expérience reste compréhensible et reproductible.

Un changement validé à l'étape `N` prend effet sur la transition `N → N+1`.

Les paramètres purement visuels (zoom, caméra, fréquence d'affichage) ne constituent pas des changements de règles scientifiques.

## 5. Observations et indicateurs

Un **tableau de bord actualisé pendant la simulation** doit accompagner l'exploration. L'objectif est de faire apparaître les évolutions et ruptures de comportement sans imposer d'analyse mathématique avancée.

Indicateurs prioritaires envisagés :

- **Nombre actuel de cases noires** (le blanc étant l'état par défaut) ;
- **Dimensions de la région englobant les cases noires**, en particulier le côté du plus petit carré englobant aligné sur le quadrillage ;
- **Valeurs maximales historiques** des indicateurs pertinents, avec l'étape à laquelle elles ont été atteintes ;
- **Taux de remplissage** de la région englobante ;
- **Distance de la fourmi à son point de départ**.

Autres indicateurs possibles : nombre de cases distinctes visitées, nombre de passages sur un centre, dimensions du rectangle englobant, etc. Leurs coûts de calcul et de mémoire devront être évalués.

Il est souhaité de disposer de **courbes d'évolution en fonction du numéro d'étape**, notamment pour le nombre de cases noires et la taille de la région englobante. Les changements de règles devraient apparaître comme des **événements repérables sur ces courbes**.

Les indicateurs, leurs maxima et les points de graphique sont trois notions à
distinguer. Les mesures et maxima exacts doivent tenir compte de chaque transition,
y compris entre deux affichages. Les courbes utilisent un échantillonnage
déterministe en nombre d'étapes, dont la politique est documentée et exportée.
Les bornes courantes peuvent rétrécir lorsque des cases extrêmes redeviennent
blanches ; le cas d'un monde entièrement blanc doit être défini.

Une possibilité ultérieure est de **marquer manuellement des étapes remarquables** et de leur associer une courte observation.

## 6. Reproductibilité, export et partage

Le projet privilégie les **fichiers portables**, pas un dispositif de comptes et de sauvegardes côté serveur.

Deux besoins doivent être distingués :

- **Rapport lisible** : Markdown, avec contexte, règles, historique des changements, observations et résultats ;
- **Données exploitables** : JSON structuré, pour retrouver les paramètres, les mesures et, lorsqu'il s'agit d'une reprise complète, l'état du monde et de la fourmi.

Le format de sauvegarde de référence est un **Markdown contenant un bloc JSON versionné intégré**, pour réunir rapport humain et données dans un même fichier `.md` réimportable. Le JSON embarqué fait foi pour les données structurées ; un JSON seul peut être proposé comme export complémentaire.

La **réimportation** et la **reprise d'expérience** sont souhaitées. Une simple configuration permet de rejouer depuis le début ; une reprise instantanée à une étape avancée nécessite également un instantané complet de l'état correspondant.

Une configuration légère pourra être **partagée par URL** ; les mondes volumineux
s'échangent par fichier. La comparaison de deux expériences est prévue avec les
campagnes à l'étape 13. La création de différentes continuations depuis un même
état reste une perspective d'évolution.

## 7. Orientation produit et technique

Le laboratoire doit être **consultable sur un site web public**, accessible sans installation et simple à partager.

L'architecture retenue est une application légère **côté navigateur**, sans
authentification, base de données applicative ni backend applicatif :

- HTML / CSS / JavaScript en modules ES pour l'interface, sans framework ;
- Canvas 2D pour la visualisation ;
- Un moteur de simulation déterministe indépendant de l'interface ;
- Un Web Worker pour isoler les calculs intensifs de l'affichage ;
- Une représentation **clairsemée** du monde, ne mémorisant pas une grille géante de cases blanches.

Vite sert au développement et au build. **Un seul moteur JavaScript** couvre
l'animation et les campagnes ; aucun moteur Python parallèle n'est prévu. Node
est un outil de développement, de test et de release, absent de l'image finale.

Les sessions désignent l'état en mémoire de l'onglet, sans connexion ni cookie de
session serveur. Fermer ou recharger la page peut perdre cet état avant export.
Pas de sauvegarde automatique en localStorage, IndexedDB ou base de données.

Le code doit rester modulaire, robuste, simple et lisible, avec validation des
entrées et erreurs compréhensibles. Les bibliothèques sont bienvenues lorsque leur
utilité, maintenance, licence, dépendances et alertes connues ont été examinées.
Verrouiller les versions et conserver le lockfile ; ne pas imposer une architecture
complexe à des besoins qui n'existent pas encore.

L'interface devra rester abordable pour une personne découvrant Langton, tout en donnant un contrôle précis à quelqu'un souhaitant mener des expériences répétables.

### Développement et vérification

- **Docker** pour les commandes locales ; aucun Node/npm requis sur l'hôte.
  Suivre les commandes et la préparation UID/GID du README et de
  [`docs/DEVELOPPEMENT.md`](DEVELOPPEMENT.md).
- **TDD obligatoire** : test en échec pour la bonne raison, implémentation minimale,
  puis refactorisation. Vitest pour les tests unitaires/intégration, Playwright pour
  les comportements navigateur ; tester les cas limites et invariants scientifiques.
- Exécuter les contrôles localement avec `docker compose run --rm test` avant une PR.
  Documenter les résultats, limites et éventuelles vérifications manuelles restantes.
  Ne cocher que les critères réellement vérifiés et ne pas commencer le lot suivant.
- Toute documentation détaillée sur le fonctionnement et le développement reste
  dans `docs`. Le README racine présente les commandes et `AGENTS.md` les consignes.

### Git, versions et exploitation

- Une branche de développement par lot, une PR vers `main` et des Conventional
  Commits. Ne pas publier une branche, fusionner ou déclencher une livraison à la
  seule lecture de ce contexte ; ces actions suivent la demande de l'utilisateur.
- Seul `semantic-release` est automatisé sur `main` : tag `vX.Y.Z`, GitHub Release
  et `docs/CHANGELOG.md`. Aucun workflow de tests, de build/push Docker ou de déploiement.
- Build, vérification de l'image, push **Docker Hub `carthographie/antlab`** et
  déploiement restent manuels, depuis un tag de release.
- La production est une image **Nginx statique sans privilèges**, derrière Traefik,
  prévue sur `https://antlab.carthographie.fr`. Le modèle Compose utilise le réseau
  externe `proxy` et n'expose aucun port hôte en production.
- Le VPS et Traefik global sont gérés dans le dépôt
  `/home/utilisateur/Documents/projects/perso/cARThographie/cARThographie`.
  AntLab fournit son image et un modèle de stack ; ne pas modifier l'infrastructure
  depuis une tâche applicative. Voir [`docs/DEPLOIEMENT.md`](DEPLOIEMENT.md).

## 8. Évolution envisagée

Le projet est volontairement **incrémental**. Le socle initial doit rester petit, mais ne pas empêcher de futurs ajouts :

- Enrichissement du catalogue des règles et de leurs combinaisons ;
- Autres pavages ou géométries ;
- Nouveaux indicateurs ;
- Exports plus complets et réimports ;
- Instantanés et retour à des étapes antérieures ;
- Comparaison de plusieurs expériences ;
- Éventuellement d'autres couleurs ou plusieurs fourmis, sans en faire une priorité actuelle.

À court terme, **une fourmi, deux couleurs et le pavage en croix** constituent le terrain d'exploration de référence.

## 9. Ce que le projet ne cherche pas à devenir

- Une plateforme collaborative complexe avec comptes utilisateurs et stockage serveur ;
- Un langage de programmation universel permettant à chacun d'écrire des règles arbitraires ;
- Un outil nécessitant l'IA pour faire fonctionner l'automate ;
- Un simulateur qui sacrifie la reproductibilité à des effets graphiques ;
- Un programme prétendant prouver la nouveauté scientifique des motifs simplement parce qu'ils paraissent inédits.

**En résumé :** construire un laboratoire web sobre et rigoureux où des règles locales très simples, appliquées sur un monde structuré en croix, peuvent être expérimentées, observées, mesurées, modifiées en cours de simulation et partagées. Le moteur doit rester suffisamment clair pour accueillir de nouvelles idées sans bouleverser l'ensemble.
