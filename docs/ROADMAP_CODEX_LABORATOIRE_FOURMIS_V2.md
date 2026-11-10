# Roadmap de développement — Laboratoire de fourmis et de règles émergentes

**Document de pilotage pour Codex**  
**Statut :** version 2 — suivi détaillé par cases à cocher, à renseigner au fil des réalisations  
**Référence fonctionnelle :** `CONTEXTE_LABORATOIRE_FOURMIS.md`  
**Cible :** application web publique, légère, expérimentale, reproductible — avec simulation interactive et campagnes d’expériences en série, sans backend ni stockage persistant intégré.

> **Fil conducteur :** construire un laboratoire, pas une usine à gaz. Une fourmi, deux couleurs, un pavage en croix, des règles élémentaires combinables lorsqu'elles sont compatibles. L'utilisateur observe, mesure, modifie les règles, exporte et compare ses expériences.

## Mode d'emploi

1. Conserver ce document et `CONTEXTE_LABORATOIRE_FOURMIS.md` dans `docs`, avec toute la documentation détaillée. Les consignes applicables au dépôt sont dans `AGENTS.md` à la racine.
2. Exécuter les **15 étapes dans l'ordre** ; chaque étape représente un lot fonctionnel complet, pas une micro-tâche.
3. Pour chaque étape, transmettre à Codex **le prompt associé**. Lui demander de lire les deux documents avant toute modification.
4. Cocher **chaque point réalisé** et chaque vérification de réception. La case de clôture de l’étape ne se coche que lorsque toutes les autres cases de cette étape sont validées.
5. Garder les fonctionnalités futures dans la roadmap plutôt que d’anticiper leur implémentation. **Un prompt Codex correspond à une étape complète** : les sous-cases servent au suivi, pas à découper le travail en micro-prompts.

**Consigne permanente à Codex :** privilégier la solution la plus simple qui respecte les invariants scientifiques. Ne pas remplacer une fonctionnalité demandée par une maquette inerte ; ne pas ajouter de framework, de backend, de compte ou de stockage local persistant sans justification. À la fin de chaque lot : résumer les changements, les tests exécutés, les limites connues et la façon de vérifier manuellement le résultat. Ne pas commencer l'étape suivante.

## Décisions de référence

- Le monde est un **quadrillage carré infini virtuel**, organisé en **croix de cinq cases** (pentominos en X). Le blanc est implicite ; les cases noires sont stockées de façon clairsemée.
- Pour le pavage initial, une convention mathématique possible est : un carré de coordonnées entières `(x, y)` est un **centre** si `x + 2y` est multiple de 5. Les quatre voisins orthogonaux sont ses branches. **Attention aux coordonnées négatives et au modulo en JavaScript.** Une convention alternative est acceptable si elle est formalisée, testée et stable.
- La simulation débute avec **une fourmi**, une position et une orientation, et des règles de déplacement de Langton explicites. Exemple de convention par défaut : **blanc → tourner à droite ; noir → tourner à gauche**, puis transformation de couleur et déplacement d'une case.
- **Une étape = une transition complète** ; les décisions se basent sur les couleurs **avant** transformation. Les mouvements, règles et mesures ne doivent jamais dépendre de la fréquence d'affichage.
- Sur une branche, le comportement initial est l'inversion de la case visitée. Sur un centre, le catalogue de départ propose : inversion simple, inversion individuelle des cinq cases, centre maître, majorité inversée. Ces quatre mécanismes sont **alternatifs**, pas simultanés.
- Pour préciser les deux règles susceptibles d'être ambiguës : **centre maître** = les cinq cases prennent la couleur _opposée à l'ancienne couleur du centre_ ; **majorité inversée** = si au moins 3 cases sur 5 sont noires, les cinq deviennent blanches, sinon elles deviennent noires. Ces conventions seront documentées et testées ; elles pourront devenir de nouvelles variantes si l'on souhaite plus tard les changer.
- Un changement de règle met immédiatement la simulation en pause et propose **continuer**, **recommencer**, **annuler**. S'il est validé à l'étape `N` et que l'expérience continue, la nouvelle règle s'applique **à la transition N → N+1**. La modification est inscrite dans un journal.
- Le monde est illimité **au niveau du modèle**, pas au niveau des ressources physiques : éviter tout affichage prétendant garantir une infinité effective ou une capacité de calcul illimitée.
- Les indicateurs exacts et leurs maxima sont calculés depuis l'état du moteur ; les courbes peuvent être échantillonnées. Les exports doivent enregistrer la politique d'échantillonnage.
- **Pas de sauvegarde automatique persistante, pas de comptes, pas de base de données, pas d'IndexedDB/localStorage de sauvegarde** pour le MVP. L'état vit en mémoire pendant la session ; la pérennisation se fait par fichiers explicitement exportés/importés.
- Le **JSON versionné** fait foi pour les données. Le **Markdown** fournit le fichier de sauvegarde autonome lisible, contenant le bloc JSON versionné de référence. Un partage par URL ne concerne que les petites configurations, jamais un monde volumineux.
- Décision de préparation : le **Markdown autonome avec JSON versionné embarqué est le format de sauvegarde de référence**, réimportable dans une session. Les JSON seuls et CSV restent des exports complémentaires. Une session est l'état en mémoire de l'onglet, sans authentification ni cookie de connexion.
- **TDD obligatoire** : test en échec avant le code, implémentation minimale puis refactorisation ; Vitest et Playwright via Docker. Aucun test scientifique artificiel n'est requis pendant la préparation de l'outillage.
- **Un moteur JavaScript unique**, animé ou sans affichage, exécuté dans un Web Worker ; pas de moteur Python ni backend applicatif. HTML/CSS/JavaScript natifs, Vite pour le développement et le build.
- **Docker** pour les outils et la production Nginx statique, sur `antlab.carthographie.fr`. Traefik et VPS appartiennent au dépôt voisin `cARThographie`.
- **Livraison** : contrôles locaux sur les branches de développement, PR vers `main`, `semantic-release` automatique (tag, GitHub Release et `docs/CHANGELOG.md`). Build, push Docker Hub et déploiement manuels.
- Deux modes pilotent **le même moteur** : **interactif** (simulation visualisée) et **campagne en série** (N configurations compatibles × K étapes, sans animation, avec résultats finaux et séries de KPI).
- Une campagne doit énumérer les configurations **valides et uniques** selon des paramètres choisis par l’utilisateur ; **1 024 est un exemple**, pas un nombre garanti. Toute campagne utilise des conditions initiales et un nombre de pas explicitement fixés.
- L’interface de campagne indique le nombre de calculs à effectuer avant le départ ; pendant l’exécution, elle montre l’avancement, les erreurs et permet une annulation propre. Le calcul ne dépend jamais du Canvas et ne doit pas bloquer la page.
- Les résultats de **chaque expérience** d’une campagne comprennent la configuration, le statut, l’étape réellement atteinte, les KPI finaux, les maxima avec étapes, les séries échantillonnées et les versions de règles/moteur. L’état complet de chaque monde est **optionnel** pour éviter des fichiers démesurés.
- **Sauvegarder signifie exporter volontairement un fichier** : aucune persistance interne. L’export de campagne produit des formats exploitables (JSON et au moins CSV pour la synthèse, Markdown lisible ; ZIP si nécessaire). Une campagne interrompue peut exporter les résultats déjà terminés.

## Vue d'ensemble

| Étape | Lot                               | Livrable central                                           | Jalons           |
| ----- | --------------------------------- | ---------------------------------------------------------- | ---------------- |
| 01    | Fondations                        | Application locale exécutable et architecture minimale     | Socle            |
| 02    | Géométrie et monde                | Pavage en croix + état clairsemé fiable                    | Socle            |
| 03    | Moteur déterministe               | Simulation de Langton testée, pas à pas                    | Socle            |
| 04    | Catalogue de règles               | Quatre règles centrales et compatibilités                  | Socle            |
| 05    | Exécution intensive               | Moteur pilotable sans affichage, Worker, pause et cible    | Simulation       |
| 06    | Visualisation du monde            | Canvas, zoom, caméra et suivi                              | Simulation       |
| 07    | Poste de pilotage                 | Interface des règles et des commandes                      | MVP interactif   |
| 08    | Changements en cours d'expérience | Confirmation et journal des changements                    | MVP scientifique |
| 09    | Indicateurs exacts                | KPI, encadrements, maxima historiques                      | Observatoire     |
| 10    | Graphiques temporels              | Courbes échantillonnées et événements                      | Observatoire     |
| 11    | Rapports et exports               | Formats individuels et de campagne, JSON/Markdown/CSV      | Portabilité      |
| 12    | Import et reprise                 | Restaurer/rejouer une expérience fidèlement                | Reproductibilité |
| 13    | Campagnes en série et comparaison | Exploration exhaustive de règles, résultats et comparaison | Exploration      |
| 14    | Robustesse et validation          | Tests globaux, performances et accessibilité               | Prépublication   |
| 15    | Partage et mise en ligne          | URL de configuration + site public documenté               | Publication      |

---

## 01 — Créer les fondations de l'application

**Périmètre.** Créer le dépôt applicatif, les commandes de développement et de vérification, une page fonctionnelle simple et une séparation nette entre moteur, interface, visualisation et formats d'export. Choisir une organisation sobre : JavaScript/HTML/CSS natifs de préférence ; un outil de construction léger seulement s'il apporte une réelle utilité. Aucune logique scientifique avancée ici.

**Points à réaliser**

- [x] Créer un projet web statique exécutable localement, avec point d’entrée clair et outils de développement sobres.
- [x] Séparer les responsabilités futures : géométrie/monde, transitions, règles, pilotage, rendu et formats de fichiers.
- [x] Mettre en place une commande unique pour les tests et une page de démarrage réelle (non fictive).
- [x] Documenter installation, exécution locale et conventions de contribution, sans backend ni stockage interne.

**Livrable attendu.** Une application qui démarre localement, une structure compréhensible, un guide de démarrage et une première vérification automatisée opérationnelle.

**Validation.** L'application se lance sur un poste neuf en suivant la documentation ; aucun backend, stockage applicatif persistant ou dépendance superflue ; les tests se lancent avec une commande simple.

**Vérifications de réception**

- [x] Le site démarre avec les seules instructions documentées.
- [x] La commande de tests fonctionne ; aucun backend ou stockage persistant ne se lance.

**Prompt Codex**

```text
Lis CONTEXTE_LABORATOIRE_FOURMIS.md et ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md. Réalise uniquement l'étape 01 : pose un socle d'application web statique, simple à lancer localement et facile à déployer. Organise le code de façon à séparer à terme géométrie/monde, moteur de simulation, catalogue de règles, exécution en Web Worker, affichage et export/import. Prévois une interface minimale fonctionnelle, une documentation de démarrage et une commande de tests. Privilégie JavaScript/HTML/CSS et évite les dépendances inutiles. Ne développe pas les futures étapes en avance. Exécute les vérifications accessibles et termine par un bilan précis de ce qui fonctionne, des commandes utiles et des limites.
```

- [x] **Étape 01 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 02 — Formaliser le pavage et représenter le monde infini

**Périmètre.** Définir sans ambiguïté les coordonnées, les centres et les branches des croix ; construire un monde clairsemé, initialement entièrement blanc, où seules les cases noires occupent la mémoire. Gérer correctement les coordonnées négatives et l'inversion des couleurs, y compris lorsque des cases disparaissent de la mémoire.

**Points à réaliser**

- [ ] Fixer une convention d’entiers `(x, y)` et formaliser le pavage de pentominos en X.
- [ ] Déterminer de manière fiable centre, branche et croix propriétaire de n’importe quelle case.
- [ ] Représenter le blanc implicitement et stocker uniquement les cases noires dans une structure clairsemée.
- [ ] Fournir les opérations de lecture, écriture et inversion de couleur, sans dépendance graphique.
- [ ] Vérifier la géométrie, notamment les coordonnées négatives, les bords virtuels et les suppressions noir→blanc.

**Livrable attendu.** Une API de monde et géométrie indépendante de l'affichage, accompagnée de tests représentatifs.

**Validation.** Chaque case testée appartient à une seule croix et une seule position dans cette croix ; les centres ont quatre branches orthogonales ; aucun bord arbitraire ; passage noir→blanc efface l'entrée stockée ; fonctionnement correct pour des coordonnées négatives.

**Vérifications de réception**

- [ ] Chaque case appartient à une unique croix, y compris pour `(x,y)` négatifs.
- [ ] Les cellules redevenues blanches ne consomment plus une entrée de stockage.

**Prompt Codex**

```text
Lis les deux documents de référence et réalise uniquement l'étape 02. Implémente le pavage infini virtuel en croix de cinq carrés et la représentation clairsemée d'un monde blanc par défaut. Formalise la convention de coordonnées, la détermination centre/branche et l'identification de la croix propriétaire d'une case ; assure la correction pour x et y négatifs. Fournis les opérations minimales de lecture et de modification de couleur, sans coupler le monde au Canvas. Ajoute des tests d'invariants géométriques, de non-chevauchement et d'aller-retour blanc/noir. Documente brièvement les conventions. N'ajoute ni moteur complet ni fonctions futures.
```

- [ ] **Étape 02 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 03 — Construire le moteur déterministe de la fourmi

**Périmètre.** Définir l'état de la fourmi (position, orientation), le compteur d'étapes, les conditions initiales et la fonction de transition purement déterministe. Pour commencer, appliquer partout la règle classique de Langton. Fixer l'ordre : lire la couleur, décider de la rotation, transformer la case, avancer, incrémenter l'étape.

**Points à réaliser**

- [ ] Définir position, orientation, configuration initiale et compteur d’étapes de la fourmi.
- [ ] Fixer et documenter une transition atomique : lire, tourner, modifier, avancer, incrémenter.
- [ ] Permettre le calcul exact de 1 ou N transitions sans Canvas ni dépendance au temps réel.
- [ ] Garantir et tester la répétabilité à état initial et règles identiques.

**Livrable attendu.** Un moteur capable d'exécuter N transitions identiques à partir d'un état initial donné, indépendamment de l'interface.

**Validation.** Tests sur les premiers pas connus, retour au blanc d'une case inversée deux fois, répétabilité bit à bit de l'état logique pour une même séquence ; aucun appel au rendu ou au temps système dans la transition.

**Vérifications de réception**

- [ ] Une même configuration initiale produit toujours la même séquence et le même état final.
- [ ] Le calcul fonctionne sans interface, affichage ni dépendance au temps système.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 03. Crée un moteur déterministe avec une fourmi (position et orientation), un compteur d'étapes exact et un état initial explicite. Implémente la transition de Langton selon la convention fixée dans la roadmap, avec un ordre d'opérations documenté et stable. Permets d'avancer d'un pas ou de N pas sans aucune dépendance visuelle. Ajoute des tests sur des trajectoires courtes, l'état résultant et la reproductibilité. Conserve l'architecture simple : la gestion des règles centrales, l'interface et le Web Worker viendront ensuite. Rends compte des vérifications exécutées.
```

- [ ] **Étape 03 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 04 — Introduire un catalogue de règles élémentaires

**Périmètre.** Intégrer la distinction branche/centre et les quatre comportements centraux initiaux. Définir une forme d'enregistrement minimale pour les règles (identifiant stable, nom, description, catégorie exclusive ou optionnelle, compatibilités pertinentes) sans créer de langage de règles générique. Conserver la lecture d'un état initial commun lorsque plusieurs effets compatibles existeront.

**Points à réaliser**

- [ ] Définir quatre règles centrales exclusives et la transformation de base des branches.
- [ ] Formaliser centre maître et seuil de majorité, y compris tous les cas de 0 à 5 noirs.
- [ ] Définir un catalogue extensible avec identifiants/version des règles, catégories et compatibilités explicites.
- [ ] Prévoir un petit mécanisme de règles optionnelles, avec ordre d’application documenté et conflits refusés.
- [ ] Proposer au moins une variation élémentaire réellement compatible à combiner, sans langage de scripting.
- [ ] Tester systématiquement les règles seules et les combinaisons autorisées.

**Livrable attendu.** Le moteur exécute les différentes règles choisies par configuration ; chaque règle est testée avec des motifs noirs/blancs représentatifs.

**Validation.** Quatre règles centrales opérationnelles et clairement documentées ; configurations invalides refusées ; exemples couvrant 0 à 5 cases noires pour la majorité ; aucune ambiguïté sur le centre maître et l'instant de lecture des couleurs.

**Vérifications de réception**

- [ ] Les quatre règles donnent les résultats attendus sur leurs cas limites.
- [ ] Le moteur refuse les incompatibilités et applique les opérations dans un ordre stable.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 04. Intègre au moteur la différence entre case périphérique et centre d'une croix. Sur une branche, utilise l'inversion simple par défaut ; sur un centre, permets de sélectionner exactement l'une de ces règles : inversion simple, inversion individuelle des cinq cases, centre maître, majorité inversée. Respecte les définitions précises et l'ordre des transitions spécifiés dans la roadmap. Construis un petit catalogue extensible avec identifiants stables et validation des choix, sans moteur de scripting ni abstraction excessive. Teste chaque règle sur des états variés, notamment les seuils et les coordonnées négatives. Ne développe pas encore l'interface de sélection.
```

- [ ] **Étape 04 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 05 — Piloter des calculs longs sans bloquer le navigateur

**Périmètre.** Déplacer les calculs intensifs vers un Web Worker et exposer un moteur **pilotable indépendamment du rendu**. Gérer les commandes : démarrer, mettre en pause, reprendre, avancer de N pas, atteindre une étape cible, annuler. La même logique de calcul doit pouvoir être appelée en mode interactif ou, plus tard, par un orchestrateur de campagnes en mode sans affichage ; ne pas encore développer l’interface de campagne.

**Points à réaliser**

- [ ] Isoler le calcul intensif dans un Web Worker, en gardant le moteur exécutable sans Worker ni rendu.
- [ ] Exposer des commandes déterministes : pas, N pas, étape cible, lancement, pause, reprise et annulation.
- [ ] Découpler transitions, vitesse de calcul, progression communiquée et fréquence d’affichage.
- [ ] Gérer les cibles exactes 10 000 / 100 000 / 1 000 000 et une valeur personnalisée.
- [ ] Préparer une API « calcul sans affichage » réutilisable par une future campagne de simulations.
- [ ] Tester réactivité, interruption et équivalence stricte des résultats entre modes de pilotage.

**Livrable attendu.** Un moteur et un contrôleur qui atteignent des paliers de 10 000, 100 000 et 1 000 000 d’étapes sans figer la page, dans les limites de l’appareil, avec une API d’exécution utilisable sans Canvas.

**Validation.** Cible exacte ; pause et reprise cohérentes ; progression réactive ; calcul N étapes sans rendu identique au pas à pas ; séparation calcul/rendu respectée ; refus explicite des sauts vers le passé sans état disponible.

**Vérifications de réception**

- [ ] 1 et N étapes donnent le même résultat logique, quelle que soit la vitesse.
- [ ] La page reste réactive, la pause et l’annulation n’entraînent ni doublon ni perte de pas.

**Prompt Codex**

```text
Lis CONTEXTE_LABORATOIRE_FOURMIS.md et ROADMAP_CODEX_LABORATOIRE_FOURMIS_V2.md, et réalise uniquement l’étape 05. Isole le calcul dans un Web Worker pour l’usage web, tout en gardant le moteur scientifique autonome du DOM, du Canvas et du Worker. Définis une API minimale permettant de calculer N transitions ou d’atteindre une étape cible exacte, avec commandes de démarrage, pause, reprise et annulation propre entre lots. Différencie clairement nombre d’étapes, débit de calcul et fréquence de rafraîchissement. Transmets une progression compacte sans recopier tout le monde à chaque pas. Prépare la possibilité d’un appel « sans rendu » en vue des campagnes à l’étape 13, sans implémenter celles-ci maintenant. Prouve par tests l’égalité stricte des résultats pas à pas et en exécution intensive ; documente les limites numériques et mémoire.
```

- [ ] **Étape 05 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 06 — Visualiser un monde théoriquement sans limite

**Périmètre.** Afficher les cases visibles, les cases noires et la fourmi dans un Canvas 2D. Fournir zoom, déplacement libre, recentrage et suivi de la fourmi. Dessiner une fenêtre du monde sans jamais imposer de bord au modèle ; limiter le travail de dessin à la région visible.

**Points à réaliser**

- [ ] Dessiner les cases noires visibles et la fourmi dans un Canvas 2D, sans dessiner une grille géante.
- [ ] Ajouter zoom, déplacement de caméra, recentrage et suivi facultatif de la fourmi.
- [ ] Prendre en charge souris, tactile et coordonnées négatives.
- [ ] Veiller à ce que la visibilité ou la vitesse du rendu ne change jamais l’état calculé.

**Livrable attendu.** Une visualisation fluide aux différentes échelles, indépendante de la logique du moteur.

**Validation.** Le zoom ne modifie aucune donnée scientifique ; la caméra peut atteindre les coordonnées négatives ; la simulation reste correcte lorsque l'affichage est masqué ou ralenti ; navigation utilisable aussi sur écran tactile.

**Vérifications de réception**

- [ ] La caméra ne peut pas modifier les résultats du moteur.
- [ ] La navigation fonctionne pour zoom, pan, suivi et positions négatives sur ordinateur/mobile.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 06. Crée une visualisation Canvas 2D du monde clairsemé et de la fourmi. Dessine uniquement les cases visibles, avec zoom, pan, recentrage et option de suivi de la fourmi ; rends l'ensemble utilisable à la souris et au tactile. Sépare strictement la caméra et le rendu du moteur scientifique : modifier l'affichage ne doit jamais changer les étapes ou les couleurs. Prends en charge les coordonnées négatives et les grands déplacements dans des limites numériques explicites. Vérifie visuellement le rendu et ajoute les tests pertinents sans introduire un moteur graphique sophistiqué.
```

- [ ] **Étape 06 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 07 — Assembler l'interface du laboratoire

**Périmètre.** Transformer les fonctionnalités techniques existantes en une interface agréable et compréhensible : panneau de configuration des règles, commandes du moteur, paliers et cible libre, statut, compteurs, vitesse, contrôles de caméra et aide courte. Empêcher les choix incompatibles ; rendre les contrôles cohérents avec le véritable état du Worker.

**Points à réaliser**

- [ ] Assembler les panneaux de sélection des règles, avec exclusivités et options compatibles.
- [ ] Relier les commandes visibles au moteur réel : lecture, pause, pas, vitesse et cible exacte.
- [ ] Présenter clairement étape, calcul en cours, progression et commandes de caméra.
- [ ] Rendre l’interface utilisable au clavier, sur ordinateur et sur mobile.
- [ ] Expliquer les incompatibilités et les erreurs utilisateur sans afficher de faux résultats.

**Livrable attendu.** Un premier MVP utilisable sans connaissances techniques, sur ordinateur comme sur mobile.

**Validation.** Toutes les commandes visibles agissent réellement ; aucune valeur factice ; règles exclusives et erreurs expliquées ; retour d'état clair pendant les calculs longs ; interface adaptée à une petite largeur d'écran.

**Vérifications de réception**

- [ ] Chaque commande visible agit réellement et reflète l’état actuel.
- [ ] L’interface explique les incompatibilités et ne masque pas les limites du calcul.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 07. Assemble une interface web claire autour du moteur existant : choix exclusif de la règle centrale, paramètres du déplacement disponibles, pilotage pas à pas/lecture/pause/reprise, vitesse, étape cible et presets, état d'avancement, commandes de zoom et de caméra. Préserve la simplicité de la page et rends-la responsive et accessible au clavier. Les actions doivent piloter réellement le Web Worker et respecter les incompatibilités ; pas de maquettes décoratives. N'implémente pas encore le dialogue de changement de règle en cours d'expérience, qui constitue l'étape suivante. Termine par une courte démonstration de parcours utilisateur.
```

- [ ] **Étape 07 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 08 — Changer les règles pendant une expérience, sans perdre l'historique

**Périmètre.** Au changement d'une règle scientifique, mettre en pause, conserver provisoirement le choix, puis proposer : continuer avec le nouvel état des règles à partir du prochain pas, recommencer depuis les conditions initiales, ou annuler. Journaliser les modifications effectives avec le numéro exact d'étape ; ne pas mélanger changements scientifiques et paramètres visuels.

**Points à réaliser**

- [ ] Mettre automatiquement en pause lors d’une tentative de modification des règles scientifiques.
- [ ] Présenter et implémenter les choix continuer à l’étape courante, repartir de zéro ou annuler.
- [ ] Appliquer la nouvelle règle uniquement à la prochaine transition après confirmation.
- [ ] Journaliser étape précise, ancienne configuration et nouvelle configuration pour toute modification effective.
- [ ] Exclure les réglages visuels/vitesse du journal des changements scientifiques.
- [ ] Tester le comportement au milieu d’une exécution intensive pour éviter les transitions perdues.

**Livrable attendu.** Des expériences pouvant évoluer au cours du temps, avec un journal minimal et reproductible.

**Validation.** Aucun pas exécuté entre le déclenchement de la pause et la décision ; continuer préserve monde et fourmi ; recommencer réinitialise réellement ; annuler ne change rien ; chaque modification porte un numéro d'étape ; un changement visuel n'ouvre pas le dialogue.

**Vérifications de réception**

- [ ] Continuer, recommencer et annuler produisent trois états vérifiés.
- [ ] L’étape de chaque changement effectif est exacte, y compris pendant une exécution rapide.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 08. Implémente le flux scientifique de changement de règle pendant une expérience : suspendre d'abord la simulation, puis présenter trois choix explicites — continuer depuis l'état actuel, recommencer depuis l'état initial ou annuler. Si l'on continue à l'étape N, la règle prend effet sur le pas N→N+1. Conserve les couleurs, la fourmi et le compteur ; journalise les événements scientifiques et les configurations successives. Les réglages visuels et la vitesse ne déclenchent pas cette procédure. Teste les transitions pendant une simulation rapide ainsi que les choix continuer/recommencer/annuler, sans perte de pas.
```

- [ ] **Étape 08 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 09 — Calculer les indicateurs scientifiques et les maxima

**Périmètre.** Ajouter des indicateurs calculés sur l'état réel du monde : nombre de cases noires, dimensions du rectangle noir englobant, côté et surface du carré englobant, taux de remplissage, distance de la fourmi au départ. Pour chaque indicateur pertinent, enregistrer son maximum historique **et l'étape de première occurrence**. Prévoir une convention claire pour le monde entièrement blanc.

**Points à réaliser**

- [ ] Calculer le nombre exact de cases noires à toute étape.
- [ ] Calculer le rectangle englobant courant et le côté/surface du carré englobant courant.
- [ ] Calculer le taux de remplissage et la distance de la fourmi à son point de départ.
- [ ] Mémoriser les maxima historiques pertinents et l’étape de leur première occurrence.
- [ ] Gérer correctement les disparitions de cases extrêmes et le monde totalement blanc.
- [ ] Garantir l’exactitude des KPI dans le mode rapide et l’exécution sans affichage.

**Livrable attendu.** Un tableau de bord exact et mis à jour indépendamment du rendu, y compris pendant l'exécution rapide.

**Validation.** Les maxima ne ratent pas les pics entre deux affichages ; le rectangle rétrécit lorsqu'on efface la dernière case noire de son bord ; valeurs valides lorsque zéro case est noire ; mesures identiques en mode rapide ou pas à pas ; coûts en mémoire raisonnables.

**Vérifications de réception**

- [ ] Les maxima conservent les pics entre deux actualisations d’écran.
- [ ] Le carré englobant peut rétrécir ; les cas 0 noir et coordonnées négatives sont corrects.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 09. Ajoute au moteur une instrumentation scientifique exacte : nombre de cases noires, rectangle englobant actuel (largeur/hauteur), carré englobant aligné sur la grille (côté et surface), taux de remplissage et distance euclidienne de la fourmi à sa position initiale. Suis les maxima historiques et l'étape de leur première apparition. Définis explicitement le cas d'un monde sans cases noires (côté et surface nuls, remplissage non applicable ou convention clairement indiquée). Attention aux extinctions de cases extrêmes : les bornes courantes doivent pouvoir diminuer. Affiche les KPI dans l'interface et teste les valeurs, maxima et rétrécissements sur des scénarios construits.
```

- [ ] **Étape 09 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 10 — Tracer les courbes en temps réel

**Périmètre.** Tracer au moins deux séries en fonction du nombre d'étapes : nombre de cases noires et côté du carré englobant. Prévoir un échantillonnage **déterministe en nombre d'étapes**, pas en secondes ; identifier visuellement les événements de changement de règle. Garder distincts les KPI exacts, leurs maxima exacts et les points de courbe échantillonnés.

**Points à réaliser**

- [ ] Tracer en fonction des étapes les cases noires et le côté du carré englobant.
- [ ] Définir un échantillonnage déterministe par étapes, configurable sans altérer les KPI exacts.
- [ ] Repérer les événements de changement de règle sur les courbes.
- [ ] Conserver des séries exploitables par les futurs rapports et campagnes.
- [ ] Maintenir une interface fluide à 1 million d’étapes et signaler toute réduction de résolution.

**Livrable attendu.** Un observatoire lisible avec graphiques qui restent fluides au fil des simulations longues.

**Validation.** Abscisses exactes ; points collectés selon une politique documentée ; passage à 1 million d'étapes sans rendre l'interface inutilisable ; événements repérables ; graphiques ne bloquant pas le moteur ; aucune prétention que les maxima proviennent seulement des échantillons.

**Vérifications de réception**

- [ ] Les abscisses et les marqueurs correspondent aux numéros d’étape exacts.
- [ ] Le rendu des graphiques n’influence ni le calcul ni les maxima exacts.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 10. Ajoute des graphiques temporels pour le nombre de cases noires et le côté du carré englobant, avec l'étape comme axe horizontal. Utilise une solution de visualisation légère et un échantillonnage déterministe par numéro d'étape. Les vrais compteurs et maxima restent calculés à chaque transition dans le moteur, indépendamment des points enregistrés. Dessine sur les courbes les étapes où les règles ont effectivement changé. Gère raisonnablement l'accumulation des points, en documentant toute réduction de résolution. Vérifie un scénario de calcul long et la fidélité des valeurs affichées.
```

- [ ] **Étape 10 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 11 — Exporter des expériences lisibles et exploitables

**Périmètre.** Définir les données JSON canoniques **versionnées** d'une expérience et leur intégration dans un **Markdown autonome, format de sauvegarde de référence**. Prévoir une enveloppe cohérente pour une campagne future : configurations, conditions initiales, moteur/règles, chronologie de changements, KPI, maxima, mesures échantillonnées et états finaux éventuellement complets. Préparer une synthèse CSV pour les campagnes sans les exécuter encore. La sauvegarde est **un export volontaire**, pas un stockage interne.

**Points à réaliser**

- [ ] Définir des formats JSON versionnés pour configuration, rapport et état complet d’une expérience.
- [ ] Inclure règles et versions, état initial, journal, KPI, maxima, politique et séries d’échantillonnage.
- [ ] Inclure toutes les cases noires et l’état de la fourmi dans un export explicitement reprenable.
- [ ] Générer le Markdown autonome de référence, lisible et contenant un bloc JSON versionné intégré ; proposer au besoin un rapport allégé non reprenable.
- [ ] Préparer le schéma de résultats pour plusieurs expériences et leur récapitulatif CSV.
- [ ] Ne déclencher les sauvegardes que sur une action explicite de téléchargement/export.

**Livrable attendu.** Export manuel d’une expérience en `.json` et `.md`, schémas documentés, modèle de données de campagne, sérialisation et tests ; les exports de campagnes effectifs seront reliés à l’étape 13.

**Validation.** Un export ne modifie pas l’expérience ; les données nécessaires à une reprise complète sont identifiées ; les rapports indiquent si les états complets sont inclus ; les versions et la politique d’échantillonnage sont enregistrées ; absence de stockage persistant silencieux.

**Vérifications de réception**

- [ ] Les exports sont versionnés, lisibles et sans perte pour les champs déclarés.
- [ ] Aucune donnée n’est conservée durablement sans téléchargement explicite.

**Prompt Codex**

```text
Lis les documents de référence et réalise uniquement l’étape 11. Définis un JSON canonique versionné pour les expériences : état initial, configuration et versions, historique daté en étapes, KPI actuels/maxima/étapes, mesures échantillonnées et, pour une reprise exacte, état courant complet (fourmi et cases noires). Définis aussi l’enveloppe minimale d’un futur export de campagne avec résultats indépendants de chaque configuration, ainsi qu’un format tabulaire CSV de synthèse ; n’implémente pas encore le lanceur de campagnes. Crée la sauvegarde manuelle de référence en Markdown autonome avec bloc JSON versionné balisé ; un export JSON seul peut être proposé en complément. Distingue rapport, configuration et état complet ; ne crée ni base de données, ni IndexedDB, ni sauvegarde automatique. Valide les schémas et teste la sérialisation de valeurs limites et d’états volumineux raisonnables.
```

- [ ] **Étape 11 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 12 — Importer, reprendre et vérifier la reproductibilité

**Périmètre.** Lire les exports JSON et les Markdown autonomes, valider leur schéma et leur version, restaurer les règles, le monde, la fourmi, les KPI et les événements, puis reprendre la simulation sans divergence. Pour une configuration seule, proposer un redémarrage à zéro ; pour un état complet, reprendre au numéro d'étape exact. Prévenir clairement des fichiers incomplets ou incompatibles.

**Points à réaliser**

- [ ] Importer et valider les Markdown autonomes de référence et les fichiers JSON complémentaires au format défini.
- [ ] Distinguer import de configuration, rapport non reprenable et état complet reprenable.
- [ ] Restaurer toutes les données nécessaires pour reprendre exactement à l’étape sauvegardée.
- [ ] Refuser proprement les versions incompatibles ou fichiers corrompus, avec des messages explicites.
- [ ] Tester aller-retour export/import et continuation identique à une exécution non interrompue.

**Livrable attendu.** Parcours complet exporter → fermer/rouvrir la page → importer → reprendre → obtenir la même trajectoire.

**Validation.** Tests d'aller-retour export/import ; même résultat à N+K que pour un calcul ininterrompu ; import refusé proprement si schéma invalide ; aucun chargement silencieux d'un fichier incompatible ; la reprise ne dépend pas de données cachées du navigateur.

**Vérifications de réception**

- [ ] Reprendre N→N+K après import donne le même état qu’une simulation continue.
- [ ] Les fichiers invalides/incompatibles sont rejetés avec une explication compréhensible.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 12. Implémente l'import des fichiers JSON versionnés et des Markdown autonomes issus de l'étape 11, avec validation stricte, messages d'erreur compréhensibles et respect des versions. Restaure l'état complet (cases noires, fourmi, étape, règles, journal, indicateurs et mesures) lorsqu'il est présent ; sinon, explique que seule une nouvelle expérience depuis la configuration est possible. Reprends ensuite le calcul sans duplication ni perte de transition. Ajoute des tests d'aller-retour et de concordance entre simulation continue et simulation interrompue/exportée/importée. Ne crée aucun stockage persistant interne.
```

- [ ] **Étape 12 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 13 — Exécuter des campagnes de configurations et comparer les résultats

**Périmètre.** Créer un **mode expérimentation en série** à côté du mode interactif. L’utilisateur choisit les catégories/règles à faire varier, les conditions initiales, le nombre de pas par expérience et les mesures à conserver. Le laboratoire énumère les **combinaisons compatibles uniques**, annonce leur nombre, exécute successivement ou avec un parallélisme borné les expériences via le **même moteur**, sans animation du terrain, et collecte un résultat distinct pour chacune. La page affiche seulement la progression, puis un tableau de résultats et des graphiques. Une comparaison de deux expériences, choisies parmi les résultats ou importées depuis un fichier, fait partie du même lot.

**Points à réaliser**

- [ ] Créer un mode « campagne » distinct du mode interactif mais réutilisant exactement le même moteur.
- [ ] Permettre de choisir les dimensions à faire varier, les règles admissibles, les conditions initiales, N pas et l’échantillonnage.
- [ ] Énumérer les configurations valides uniques, avec ordre stable, et afficher le nombre d’expériences ainsi que le nombre total de transitions **avant** lancement.
- [ ] Exécuter sans animation ni Canvas, avec progression, annulation, gestion des erreurs par expérience et ressources bornées.
- [ ] Enregistrer pour **chaque** expérience sa configuration, son statut, ses KPI finaux, ses maxima et ses séries de mesures.
- [ ] Rendre facultative la conservation de l’état final complet de chaque monde pour contrôler le volume des données.
- [ ] Afficher après calcul un tableau triable, une fiche de résultat avec graphiques et une comparaison de deux expériences.
- [ ] Exporter volontairement tous les résultats terminés (JSON, CSV, rapport Markdown et ZIP si pertinent), y compris après interruption.
- [ ] Vérifier l’égalité des résultats entre campagne et mode interactif, et la non-duplication des combinaisons.

**Livrable attendu.** Mode campagne utilisable jusqu’à un nombre élevé d’expériences lorsque le navigateur le permet (par exemple 1 024 configurations), résultats finaux et historiques échantillonnés par expérience, visualisation/comparaison, exports exploitables d’une campagne achevée ou interrompue.

**Validation.** Configurations incompatibles exclues et doublons supprimés ; nombre annoncé = nombre exécuté sauf erreurs/annulations signalées ; chaque expérience atteint exactement N pas ou porte son état d’échec explicite ; résultats identiques à l’exécution interactive de la même configuration ; aucune dépendance au rendu ; limite mémoire/CPU prise en compte ; export de tous les résultats achevés en JSON et synthèse CSV/Markdown (archive ZIP si pertinent), états complets optionnels ; deux expériences comparées sans partage d’état mutable.

**Vérifications de réception**

- [ ] Le nombre de configurations annoncé est le nombre d’expériences réellement planifiées.
- [ ] Tous les résultats terminés sont exportables, même si la campagne est interrompue.
- [ ] Une expérience de campagne produit les mêmes KPI qu’en exécution individuelle, à configuration identique.

**Prompt Codex**

```text
Lis CONTEXTE_LABORATOIRE_FOURMIS.md et la roadmap, puis réalise uniquement l’étape 13. Ajoute un second mode, « expérimentation en série », utilisant rigoureusement le même moteur déterministe que le mode interactif, mais sans animation et sans dessiner le terrain. Permets à l’utilisateur de choisir quelles règles/paramètres varient, les conditions initiales communes, le nombre exact d’étapes par expérience, l’intervalle d’échantillonnage et l’éventuelle conservation des états finaux complets. Génère dans un ordre stable toutes les combinaisons valides uniques selon les règles de compatibilité ; affiche leur nombre et le total de transitions à calculer AVANT lancement (1 024 est seulement un exemple). Exécute les simulations par lots, avec progression, pause/annulation si faisable sans complexité excessive, limitation explicite du parallélisme et de la mémoire, gestion par expérience des erreurs et possibilité d’exporter les résultats déjà terminés. Pour CHAQUE expérience, conserve configuration/versions, statut, étape atteinte, KPI finaux, maxima avec étapes, courbes échantillonnées, et état final complet uniquement si demandé. À la fin, montre un tableau triable de résultats, une fiche détaillée avec graphiques historiques pour une expérience sélectionnée et un comparateur simple de deux expériences sur le même axe d’étapes, avec avertissements en cas de conditions différentes. Permets l’export volontaire de l’ensemble (JSON, CSV récapitulatif, Markdown, ZIP si nécessaire), sans sauvegarde interne ni serveur. Prouve par tests la non-duplication des combinaisons, la concordance avec le mode interactif et la bonne récupération des résultats même après annulation. Ne crée pas de gestionnaire de projets.
```

- [ ] **Étape 13 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 14 — Consolider scientifiquement et techniquement le logiciel

**Périmètre.** Vérifier le système de bout en bout : géométrie, transitions, ordre des effets, pauses, changements de règles, KPI, graphes, exports/imports, comparaison. Tester les performances sur des paliers croissants, les limites mémoire, les longues sessions, l'ergonomie clavier/tactile et les erreurs utilisateur. Clarifier les limites de la notion d'infini et la plage numérique supportée.

**Points à réaliser**

- [ ] Exécuter les tests de non-régression du pavage, des règles, des KPI, des exports et des reprises.
- [ ] Vérifier le mode interactif et le mode campagne sur les mêmes scénarios de référence.
- [ ] Vérifier les paliers de 10 000, 100 000 et 1 000 000 pas, sans promettre un débit universel.
- [ ] Évaluer les consommations mémoire/CPU des campagnes nombreuses et limiter les risques de blocage/échec silencieux.
- [ ] Tester les commandes longues, les fichiers invalides, les comportements d’annulation et les grandes coordonnées.
- [ ] Améliorer accessibilité, ergonomie mobile et documentation des limites de calcul et de stockage.

**Livrable attendu.** Une version candidate à la publication, documentée et testée, avec limitations honnêtes et tests reproductibles.

**Validation.** Suite de tests exécutée ; scénarios manuels listés ; résultat identique en mode rapide/pas à pas et après import ; interface toujours réactive sur les machines de référence ; aucune perte silencieuse de données ; avertissements utiles sur les cas impossibles ou coûteux.

**Vérifications de réception**

- [ ] Tests automatisés et scénarios manuels de bout en bout sont documentés et passent.
- [ ] Aucune perte silencieuse de données ni blocage UI majeur sur les scénarios retenus.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 14. Effectue une revue transversale orientée fiabilité scientifique et simplicité : audit des invariants de la géométrie et du moteur, ordre des opérations, journalisation, statistiques exactes, graphiques échantillonnés, export/import et comparaison. Ajoute ou corrige les tests de bout en bout ; mesure le comportement à 10 000, 100 000 et 1 000 000 d'étapes sur l'environnement disponible sans promettre de débit universel. Vérifie pause rapide, mémoire, erreurs d'import, clavier et mobile. Documente les limites réelles et corrige prioritairement les défauts bloquants. Refuse les optimisations qui changent le résultat déterministe.
```

- [ ] **Étape 14 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

## 15 — Publier et permettre le partage des configurations

**Périmètre.** Finaliser la présentation publique du projet : page d'accueil concise, aide « première expérience », explications des règles, mentions sur les limites expérimentales, métadonnées web et déploiement Docker statique derrière le Traefik existant. Générer un lien partageable contenant uniquement une configuration compacte et versionnée ; prévoir une validation stricte des paramètres URL. L'état massif du monde continue de s'échanger par fichier.

**Points à réaliser**

- [ ] Préparer page d’accueil, aide rapide, présentation des règles et limites scientifiques.
- [ ] Générer et interpréter une URL partageable pour une petite configuration versionnée.
- [ ] Valider strictement les paramètres d’URL et éviter le partage d’états volumineux par lien.
- [ ] Préparer un déploiement web statique HTTPS avec documentation reproductible.
- [ ] Vérifier en production simulations interactive et en série, graphiques, imports et exports.
- [ ] Expliquer clairement l’absence de sauvegarde interne et le besoin d’exporter ses résultats.

**Livrable attendu.** Un site public accessible en HTTPS avec un parcours de découverte et de partage fonctionnel, sans backend et sans authentification.

**Validation.** Chargement depuis une URL partagée = mêmes règles et conditions initiales ; absence d'injection via paramètres ; déploiement reproductible ; site accessible sur mobile ; lancement d'expérience, export et import opérationnels en production ; documentation d'exploitation à jour.

**Vérifications de réception**

- [ ] Un lien partagé restaure exactement une configuration légère.
- [ ] Site HTTPS opérationnel sur mobile, avec exports et campagnes réellement utilisables.

**Prompt Codex**

```text
Lis les deux documents et réalise uniquement l'étape 15. Prépare la publication d'un laboratoire web statique, utilisable sans compte : onboarding court, explication des règles, navigation mobile, états d'erreur utiles, métadonnées et documentation de déploiement pour un hébergement HTTPS standard. Implémente le partage par URL d'une configuration initiale compacte et versionnée (règles, position/orientation de départ, éventuels paramètres d'affichage), avec validation des entrées ; ne tente pas d'y inclure des millions de cases. Vérifie que la simulation, les KPI, le rapport Markdown/JSON et la reprise par fichiers restent opérationnels après build. Réutilise les fichiers Docker du socle et documente les étapes manuelles ; le VPS et Traefik global sont gérés dans le dépôt cARThographie, sans modification depuis AntLab.
```

- [ ] **Étape 15 clôturée :** tous les points et toutes les vérifications ci-dessus sont cochés.

---

## Critères de « terminé » applicables à chaque étape

Une case n'est cochée que si :

- **Fonctionnel :** le périmètre annoncé est réellement utilisable ; les commandes sont actives, non simulées.
- [ ] **Scientifique :** aucun résultat ne dépend accidentellement du rendu, de la vitesse ou du délai du navigateur.
- [ ] **Vérifiable :** il existe des tests automatisés appropriés et un scénario rapide de vérification manuelle.
- [ ] **Maintenable :** les règles et calculs restent séparés de l'interface ; aucune complexité ajoutée sans bénéfice clair.
- [ ] **Documenté :** les conventions, limites et nouvelles décisions importantes sont mises à jour sans contredire le document de contexte.

## À garder volontairement hors de cette première roadmap

Plusieurs fourmis simultanées ; troisième couleur ou davantage ; nouveau type de pavage ; langage utilisateur de création de règles ; historique complet de tous les états à toutes les étapes ; analyse statistique avancée ; backend, comptes, galerie en ligne et partage d'états massifs par serveur. Ces sujets pourront devenir de **nouvelles étapes après la V1**, selon les observations produites par le laboratoire.

## Éléments importants concernant les campagnes

- **Tous les résultats sauvegardés** signifie : présents en mémoire durant la session, puis **exportables explicitement**. Aucune pérennité n’est garantie avant le téléchargement du fichier.
- L’interface doit avertir avant la fermeture d’un onglet contenant une campagne non exportée, dans la mesure permise par le navigateur ; ce n’est pas une garantie de sauvegarde.
- La conservation de toutes les **mesures** d’une expérience ne signifie pas celle de tous les **états intermédiaires**. Chaque courbe résulte d’un échantillonnage annoncé ; les maxima, eux, restent exacts.
- Une campagne de 1 024 × 1 000 000 pas représente **1 024 000 000 transitions**. On affiche ce volume avant lancement et on permet l’annulation ; la vitesse réelle dépend de la machine et des règles.
- Un mode campagne calcule chaque expérience depuis les mêmes conditions initiales **sauf paramètres explicitement sélectionnés comme variables**. Les comparaisons doivent le rappeler.

**Règle de conduite du projet :** de nouvelles idées de règles sont bienvenues, mais leur ajout ne doit jamais déstabiliser les expériences déjà reproductibles. Une évolution qui change le sens d'une règle existante doit obtenir un **nouvel identifiant ou une nouvelle version**, et non altérer silencieusement les résultats anciens.
