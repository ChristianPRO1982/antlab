# Contexte du projet — Laboratoire de fourmis et de règles émergentes

> **Nature de ce document :** contexte général du projet, destiné à être partagé avec Codex. Il expose l'intention, les choix de principe et les perspectives d'évolution. **Ce n'est ni un cahier des charges détaillé, ni un plan d'implémentation, ni une demande de codage.**

## 1. Origine et intention

Le projet est inspiré de la **fourmi de Langton** : un automate très simple dont les déplacements et les modifications d'un damier produisent des comportements parfois inattendus.

L'objectif n'est pas de reproduire uniquement cet automate, ni de complexifier artificiellement ses règles. Il est de créer un **petit laboratoire d'expérimentation** permettant de choisir, combiner et comparer des **règles élémentaires** pour observer les comportements qui émergent de leur répétition.

L'ambition est exploratoire : expérimenter librement, découvrir des motifs ou des dynamiques intéressants, et pouvoir les reproduire. L'originalité d'une règle ou d'un résultat ne doit pas être présumée sans recherche documentaire. Le projet ne vise pas à formuler d'emblée des théories mathématiques avancées.

Principes directeurs : **simplicité, déterminisme, lisibilité, reproductibilité et extensibilité progressive**. Éviter l'« usine à gaz ».

## 2. Monde expérimental initial

Le premier monde envisagé est un **plan théoriquement infini**, composé de cases carrées structurées en **croix de cinq cases** (un centre et quatre branches). Ces croix constituent le pavage du monde.

- Chaque case possède initialement l'une de deux couleurs : **blanc ou noir** ; le blanc est la couleur par défaut.
- Une seule fourmi est présente au départ.
- La fourmi dispose d'une position et d'une orientation et avance selon des règles de déplacement inspirées de Langton.
- La distinction entre **case centrale** et **case périphérique** permet de déclencher des transformations différentes.
- Le plan n'a pas de bord dans le modèle : l'interface n'en montre qu'une portion. Une implémentation informatique restera nécessairement limitée par les ressources disponibles.

Le choix du pavage en croix est un **point de départ**, pas une interdiction d'étudier ultérieurement d'autres géométries.

## 3. Philosophie des règles

Le système doit permettre de **sélectionner les règles d'une expérience** via une interface accessible, sans programmation par l'utilisateur.

Certaines règles sont **mutuellement exclusives** : une seule règle peut être choisie dans une catégorie donnée. D'autres sont **facultatives** et combinables si elles ne se contredisent pas. Les incompatibilités doivent être explicites. Le catalogue est destiné à s'enrichir progressivement, sans activer toutes les règles à la fois.

Exemples de règles évoquées pour une visite sur la **case centrale** d'une croix :

- **Inversion collective** : les cinq cases inversent individuellement leur couleur.
- **Centre maître** : la couleur du centre détermine la nouvelle couleur de l'ensemble de la croix.
- **Seuil / majorité inversée** : selon le nombre de cases noires dans la croix, les cinq cases deviennent toutes blanches ou toutes noires.
- **Inversion simple** : seule la case visitée change de couleur, comme point de comparaison.

D'autres mécanismes élémentaires ont été imaginés, par exemple faire tourner les couleurs des quatre branches ou appliquer des transformations conditionnelles. Il s'agit de **pistes exploratoires**, pas d'une liste définitivement arrêtée.

Le comportement exact des règles devra être défini sans ambiguïté avant leur implémentation, notamment : l'état observé avant transformation, les seuils (y compris le cas d'égalité, s'il existe), l'ordre des effets et les interactions entre règles.

## 4. Philosophie de la simulation

Une **étape** correspond à une transition élémentaire complète de l'automate. Le nombre d'étapes est la référence scientifique de toute expérience.

Le laboratoire doit permettre :

- L'observation animée de la fourmi et des cases ;
- La pause, la reprise et le pas à pas ;
- Des vitesses de simulation variables ;
- Le calcul jusqu'à une **étape cible** (par exemple 10 000, 100 000 ou 1 000 000), avec possibilité d'indiquer une valeur précise ;
- Le zoom, le déplacement de la caméra et idéalement le suivi de la fourmi.

**Le calcul des étapes et l'affichage sont deux activités distinctes.** Pour aller vite, on peut calculer de nombreuses transitions entre deux rafraîchissements graphiques. Atteindre une étape future implique normalement de calculer les étapes intermédiaires, sauf reprise d'un état déjà enregistré.

### Changement des règles en cours d'expérience

Un changement de règle **met automatiquement la simulation en pause**. L'interface demande alors si l'utilisateur souhaite :

1. **Poursuivre depuis l'état actuel**, avec la nouvelle règle appliquée aux étapes suivantes ;
2. **Recommencer depuis les conditions initiales**, avec la nouvelle configuration ;
3. **Annuler la modification**.

La poursuite conserve notamment les couleurs du monde, la position et l'orientation de la fourmi et le numéro de l'étape. Tout changement effectif de règle doit être **daté par son numéro d'étape**, afin que l'expérience reste compréhensible et reproductible.

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

Les indicateurs, leurs maxima et les points de graphique sont trois notions à distinguer : on peut tenir des compteurs exacts tout en n'enregistrant qu'un échantillon de points pour les courbes. La manière d'échantillonner reste à préciser.

Une possibilité ultérieure est de **marquer manuellement des étapes remarquables** et de leur associer une courte observation.

## 6. Reproductibilité, export et partage

Le projet privilégie les **fichiers portables**, pas un dispositif de comptes et de sauvegardes côté serveur.

Deux besoins doivent être distingués :

- **Rapport lisible** : Markdown, avec contexte, règles, historique des changements, observations et résultats ;
- **Données exploitables** : JSON structuré, pour retrouver les paramètres, les mesures et, lorsqu'il s'agit d'une reprise complète, l'état du monde et de la fourmi.

Le format de sauvegarde de référence est un **Markdown contenant un bloc JSON versionné intégré**, pour réunir rapport humain et données dans un même fichier `.md` réimportable. Le JSON embarqué fait foi pour les données structurées ; un JSON seul peut être proposé comme export complémentaire.

La **réimportation** et la **reprise d'expérience** sont souhaitées. Une simple configuration permet de rejouer depuis le début ; une reprise instantanée à une étape avancée nécessite également un instantané complet de l'état correspondant.

Une configuration légère pourrait être **partagée par URL**. Le partage d'une expérience volumineuse pourrait passer par un fichier exporté. Plus tard, le laboratoire pourrait comparer plusieurs expériences ou créer différentes continuations depuis un même état.

## 7. Orientation produit et technique

Le laboratoire doit être **consultable sur un site web public**, accessible sans installation et simple à partager.

L'orientation actuelle est une application légère, essentiellement **côté navigateur**, sans authentification, sans base de données applicative et sans backend nécessaire à la première version. Les solutions envisagées sont :

- HTML / CSS / JavaScript pour l'interface ;
- Canvas 2D pour la visualisation ;
- Un moteur de simulation déterministe indépendant de l'interface ;
- Un Web Worker pour isoler les calculs intensifs de l'affichage ;
- Une représentation **clairsemée** du monde, ne mémorisant pas une grille géante de cases blanches.

Décisions de préparation du dépôt : **HTML/CSS/JavaScript en modules ES**, sans framework ; Vite pour le développement et le build ; **un seul moteur JavaScript**, y compris pour les campagnes sans affichage. Aucun backend applicatif ni moteur Python parallèle. Les sessions désignent l'état en mémoire de l'onglet, sans connexion ni cookie de session serveur ; fermer ou recharger la page peut perdre cet état avant export.

Le développement et les tests utilisent **Docker**, avec **TDD obligatoire**, Vitest et Playwright. La production est une image statique Nginx derrière le Traefik existant, prévue sur `antlab.carthographie.fr`. Le VPS et Traefik global sont gérés dans le dépôt voisin `cARThographie`. Tests locaux sur branches de développement, PR vers `main`, puis `semantic-release` automatique ; build, push Docker Hub et déploiement restent manuels. Toute documentation détaillée est conservée dans `docs`.

Ces orientations expriment une préférence pour la sobriété et l'évolutivité, **pas une obligation d'adopter un framework ou une architecture complexe**.

L'interface devra rester abordable pour une personne découvrant Langton, tout en donnant un contrôle précis à quelqu'un souhaitant mener des expériences répétables.

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
