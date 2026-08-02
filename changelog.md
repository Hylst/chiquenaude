# Changelog de Chiquenaude

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage
[SemVer](https://semver.org/lang/fr/).

## [1.1.0] 2026-08-02

### Ajouté
- Modale « ℹ️ Infos » (bouton dans l'en-tête, à côté de « Règles ») expliquant la stack,
  les graphismes, la musique, les interactions, l'architecture et les algorithmes notables
  (collisions pondérées par la masse, palet de tir plus lourd que les pièces, Conseil par
  simulation de trajectoires). Étape 15 du chantier de retrofit décrit dans `todo.md`
  racine du monorepo.

### Vérifié
- Build propre, modale testée à l'ouverture/fermeture, aucune erreur console, aucun
  débordement horizontal en 390×844.

## [1.0.0] 2026-08-01

Première version intégrable à Hylst.Games, partie d'un export brut audité puis corrigé.

### Ajouté
- Bloc SEO complet dans `index.html` (description, keywords, og, twitter, robots, canonical,
  theme-color) et `lang="fr"`
- `favicon.png` 32×32, `og-image.png` 1024×576 (capture réelle du jeu) et sa variante
  `og-image.webp`, `icon.webp` 128×128 pour la carte du menu
- `base: '/chiquenaude/'` dans `vite.config.ts`
- La doc : `about.md`, `README.md`, `structure.md`, `features.md`, `todo.md`, `changelog.md`

### Modifié
- Renommé en **Chiquenaude**. « Carrom » est le nom générique et non déposé du jeu
  traditionnel (comme « échecs » ou « dames »), pas une marque, mais « Carrom Premium »
  restait un nom générique dans le style attendu par défaut d'un export IA. Titre affiché,
  titre de page.
- `package.json` : `react-vite-tailwind` v0.0.0 devenu `chiquenaude` v1.0.0
- Tirets longs retirés du code et des textes affichés au joueur

### Corrigé
- **Le bouton Conseil suggérait un coup sur les palets de l'adversaire au lieu des siens,
  pour le Joueur 1.** La fonction réutilisée pour calculer la suggestion cible toujours
  `state.player2Color` ; l'état simulé construit pour le Joueur 1 ne corrigeait pas ce
  champ, qui restait la couleur réelle de l'adversaire. Vérifié précisément avec deux
  palets isolés (la trajectoire suggérée passait à moins de 3 px du palet adverse), puis
  revérifié sur l'application réelle en lisant directement la couleur choisie en interne
  par le calcul (la Reine neutralisée au préalable, son bonus de score la faisant sinon
  presque toujours préférer, masquant le résultat) : sur 5 appels consécutifs, la couleur
  choisie était chaque fois celle du Joueur 1 après correction.
