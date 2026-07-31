# TODO de Chiquenaude

Audit fait le 2026-08-01 sur l'export brut (`build-carrom-game-mechanics (1).zip`), suivi
d'une passe QA navigateur (Playwright + Chromium) avec vérification réelle de la
mécanique centrale (tir physique) et du correctif du bouton Conseil.

---

## ✅ Corrigé — bug

- [x] **Le bouton Conseil (indice) suggérait un coup sur les palets de l'ADVERSAIRE au
  lieu des siens, pour le Joueur 1.** `giveHint()` construit un état simulé
  `{ ...gameState, currentPlayer: 2, gameMode: 'ai_hard' }` pour réutiliser
  `computeAITurn()` (écrite pour viser depuis la ligne du haut). Mais `computeAITurn`
  cible toujours `state.player2Color`, et cet état simulé ne modifiait pas ce champ : pour
  le Joueur 1, `player2Color` restait la couleur RÉELLE de l'adversaire. Résultat, l'indice
  calculait un coup pour empocher les palets adverses, ce qui en carrom est une **faute**
  (le palet adverse empoché est simplement replacé sur le plateau). **Vérifié
  précisément** : avec deux palets isolés à des positions connues, la ligne de tir
  suggérée passait à moins de 3 pixels du palet adverse et à plus de 295 pixels du palet
  du Joueur 1. Corrigé en faisant aussi correspondre `player2Color` de l'état simulé à la
  vraie couleur du Joueur 1 quand c'est lui qui demande l'indice. **Revérifié sur
  l'application réelle en cours d'exécution**, avec la Reine neutralisée pour empêcher son
  bonus de score de masquer le résultat (elle est une cible légitime pour n'importe quel
  joueur et dominait systématiquement le classement) : sur 5 appels consécutifs à
  `giveHint()`, la couleur effectivement choisie par `computeAITurn` était chaque fois
  celle du Joueur 1.

## ✅ La passe QA navigateur

- [x] 0 erreur console, 0 exception non gérée
- [x] Écran d'accueil (« Chiquenaude »), plateau, panneau de score
- [x] **Mécanique centrale observée réellement** : glisser-relâcher souris sur le canvas
  (technique de la fronde, comme documenté), le striker part physiquement, percute la
  formation de palets et la disperse (capture d'écran : le cercle hexagonal initial est
  visiblement brisé, striker et Reine repositionnés)
- [x] **Correctif du Conseil vérifié directement**, en lisant quelle couleur
  `computeAITurn` choisit réellement en interne (pas une reconstruction approximative de
  la trajectoire depuis l'extérieur, qui s'est révélée peu fiable avec 19 palets denses au
  centre — voir la section méthode ci-dessous)
- [x] Aucun débordement horizontal en 390×844

## Méthode de vérification (et un faux positif évité)

Première tentative de vérification : reconstruire la trajectoire suggérée depuis l'angle
et la position du striker, et chercher quel palet elle croisait en premier. Cette méthode
a d'abord semblé montrer que le correctif ne fonctionnait pas. En creusant, la cause était
un défaut de la méthode de test elle-même : avec 19 palets densément regroupés au centre,
la reconstruction approximative de trajectoire touchait un palet proche de la ligne mais
qui n'était pas forcément celui que `computeAITurn` avait réellement choisi en interne.
Vérification refaite en exposant temporairement le résultat réel de `computeAITurn`
(couleur du palet ciblé) directement, sans reconstruction géométrique — c'est cette
seconde méthode qui a confirmé le correctif de façon fiable. Ne pas se fier à une
reconstruction de trajectoire approximative quand le plateau est dense : lire l'intention
réelle du code plutôt que de la déduire de l'extérieur.

---

## ⬜ Idées d'amélioration (non corrigées, notes d'audit)

### Règle sujette à interprétation, non modifiée
- [ ] La condition de victoire vérifie `queenCovered` comme un simple booléen global
  (n'importe quel joueur peut l'avoir posé), pas spécifiquement que le VAINQUEUR est celui
  qui a couvert la Reine. Certaines variantes du carrom exigent que ce soit le même joueur
  qui couvre la Reine ET termine ses palets. Le texte des règles affiché en jeu ne
  tranche pas explicitement cette nuance, donc je n'ai pas modifié ce comportement : c'est
  une question de choix de règles, pas un bug de code.
- [ ] Dans `resolveTurn`, la condition `myPocketed.length > 0 || (queenPocketedNow && queenCovered && myPocketed.length > 0)` a sa seconde branche totalement redondante avec la première (les deux exigent `myPocketed.length > 0`). Sans conséquence observable, code mort plutôt qu'un bug.

### Technique
- [ ] L'effet qui déclenche le tour de l'IA a `gameState` entier dans ses dépendances,
  donc il se redéclenche à chaque frame de physique (pas seulement aux changements de
  phase/joueur) ; le garde interne empêche tout effet visible, mais c'est du travail inutile
  pendant l'animation d'un tir.
- [ ] Aucun test automatisé embarqué sur `gameLogic.ts`/`physics.ts`, alors qu'il s'agit de
  fonctions largement pures (c'est justement ce qui a permis de vérifier le correctif du
  Conseil sans dépendre du rendu).
