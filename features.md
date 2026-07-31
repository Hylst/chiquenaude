# Fonctionnalités de Chiquenaude

## Gameplay

- ✅ Physique de collision élastique réaliste (palets, striker, rebonds sur les bords)
- ✅ Règle de la reine : capture, confirmation, remise au centre si non confirmée
- ✅ Fautes gérées : palet adverse empoché (retour sur le plateau), striker empoché
  (pénalité, une pièce validée revient en jeu)
- ✅ Tour continué en cas d'empochage réussi de son propre palet
- ✅ Combos et record de combo par joueur
- ✅ Mode 1 contre 1, ou contre l'IA (facile / difficile)
- ✅ **Bouton Conseil qui suggère réellement un coup jouable, sur la bonne couleur** (bug
  corrigé, voir todo.md)
- ✅ Score final avec bonus de reine

## Interface

- ✅ Écran principal et mode plein écran immersif dédié
- ✅ Panneau de score, barre de message, modale de règles complète
- ✅ Visée à la souris (glisser-relâcher) ou au tactile, plus raccourcis clavier complets
- ✅ Effets de particules à l'empochage, confettis de victoire, tremblement d'écran sur
  gros impact
- ✅ Aucun débordement horizontal en 390×844

## Audio

- ✅ Musique d'ambiance et effets sonores (choc, rebond, empochage, pénalité, victoire)
  synthétisés en Web Audio

## Technique

- ✅ Build en un seul fichier (~292 Ko), fonctionne hors ligne
- ✅ TypeScript strict
- ✅ Moteur physique et logique de jeu en fonctions pures (`physics.ts`, `gameLogic.ts`),
  testables hors navigateur
- ✅ Bloc SEO complet, favicon, og-image (capture réelle du jeu)
- ⬜ Condition de victoire basée sur un indicateur global de couverture de la Reine plutôt
  que par joueur (nuance de règles, pas un bug, voir todo.md)
- ⬜ Pas de tests automatisés embarqués
