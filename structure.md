# Structure de Chiquenaude

## Arborescence

```
chiquenaude-game-development/
├── index.html              # template Vite + bloc SEO (lang=fr)
├── package.json            # chiquenaude v1.0.0
├── vite.config.ts          # base '/chiquenaude/', react + tailwind + singlefile
├── tsconfig.json
├── .gitignore                 # deps, secrets, fichiers d'agents IA
├── about.md / README.md / structure.md / features.md / todo.md / changelog.md
├── og-image.png / favicon.png
├── public/
│   ├── favicon.png
│   ├── og-image.png / og-image.webp
│   └── icon.webp             # carte du menu, 128x128
└── src/
    ├── main.tsx
    ├── App.tsx                 # ecrans (normal + plein ecran), raccourcis clavier
    ├── types/carrom.ts          # Disc, GameState, etc.
    ├── hooks/
    │   ├── useCarromGame.ts      # LOGIQUE PURE : boucle physique + resolveTurn
    │   └── useFullscreen.ts
    ├── components/
    │   ├── CarromBoard.tsx        # canvas, entrees souris/tactile (fronde)
    │   ├── ScorePanel.tsx
    │   ├── MessageBar.tsx
    │   └── FullscreenButton.tsx
    └── utils/
        ├── physics.ts             # LOGIQUE PURE : collisions, murs, empochage
        ├── gameLogic.ts           # LOGIQUE PURE : etat initial, IA (computeAITurn)
        ├── particles.ts
        └── audio.ts               # synthese Web Audio
```

## Le pipeline de tour, dans `useCarromGame.ts`

`triggerFlick` lance le striker (phase `aiming` → `sliding`). Une boucle
`requestAnimationFrame` fait tourner la physique (friction, murs, collisions sur 3 passes
pour stabiliser les paquets de palets serres) tant que quelque chose bouge, puis
`resolveTurn` (fonction pure, hors du hook) applique les regles : reine, fautes, score,
tour continue ou pas, victoire.

## `utils/gameLogic.ts` : `computeAITurn`, reutilise pour l'IA ET pour le Conseil

`computeAITurn(state)` est ecrite pour un "joueur 2" fictif qui vise depuis le haut du
plateau, et cible toujours `state.player2Color`. Elle est appelee a deux endroits :

- **Le vrai tour de l'IA** (quand `gameState.currentPlayer === 2` et le mode n'est pas
  `1v1`) : `state.player2Color` est deja la bonne couleur, aucune adaptation necessaire.
- **Le bouton Conseil** (`giveHint`, dans `useCarromGame.ts`) : construit un
  `simulatedState` pour reutiliser cette meme fonction quel que soit le joueur qui demande
  l'indice, avec l'angle mirrorer pour le Joueur 1 (qui vise depuis le bas).

**Le bug corrige pendant l'audit** : ce `simulatedState` mettait `currentPlayer: 2` mais
ne touchait jamais `player2Color`. Pour le Joueur 1, `player2Color` restait la vraie
couleur de l'ADVERSAIRE, donc `computeAITurn` calculait un coup pour empocher les palets
de l'adversaire (une faute) au lieu des siens. Corrige en faisant aussi correspondre
`player2Color` du `simulatedState` a la vraie couleur du Joueur 1 quand c'est lui qui
demande l'indice :

```ts
player2Color: gameState.currentPlayer === 1 ? gameState.player1Color : gameState.player2Color,
```

**Piege pour un futur audit** : la Reine a un bonus de score (+30) dans `computeAITurn`,
ce qui la rend quasi systematiquement la cible choisie sur un plateau initial symetrique,
MASQUANT le bug ci-dessus si on se contente d'observer "quelle couleur est visee" sans
neutraliser la Reine au prealable. Verifier ce correctif exige de retirer la Reine du jeu
(`queenPocketed = true`) pour forcer un choix parmi les vrais palets colores.

## Build

`vite-plugin-singlefile` inline le JS et le CSS dans `index.html` (~292 Ko). Le `dist/`
contient en plus `favicon.png`, `og-image.png/webp` et `icon.webp` copies depuis `public/`.
`base: '/chiquenaude/'` fait resoudre ces assets sous
`https://games.hylst.fr/chiquenaude/`.
