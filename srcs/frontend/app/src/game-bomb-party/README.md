# 💣 Bomb Party - Jeu de mots local

## Description

Bomb Party est un jeu de mots local où les joueurs doivent trouver des mots contenant un trigramme donné avant que le temps soit écoulé. Le dernier survivant gagne !

## Fonctionnalités

- **2 à 8 joueurs** en mode local (pass & play)
- **Timer fiable** basé sur `performance.now()` (15 secondes par tour)
- **Système de trigrammes enrichi** avec suggestions de mots associés
- **Système de vies** (3 vies par joueur par défaut)
- **Validation avancée** avec dictionnaire français complet
- **Suggestions intelligentes** basées sur le trigramme actuel
- **Interface responsive** avec Tailwind CSS	
- **Support i18n** (français et anglais)
- **Statistiques en temps réel** (mots disponibles, utilisation des trigrammes)

## Règles du jeu

1. Chaque joueur a 3 vies (configurable)
2. Un trigramme est affiché au centre (ex: "cha")
3. Le joueur actif doit trouver un mot contenant ce trigramme
4. Temps limité : 15 secondes par tour (configurable)
5. Mot invalide ou temps écoulé = perte d'une vie
6. Joueur éliminé à 0 vie
7. Le dernier survivant gagne !

## Nouvelles fonctionnalités v2.0

- **Trigrammes enrichis** : Chaque trigramme est associé à une liste de mots valides
- **Suggestions contextuelles** : Affichage de mots suggérés pour chaque trigramme
- **Statistiques avancées** : Nombre de mots disponibles vs. total pour chaque trigramme
- **Système de tours amélioré** : Un trigramme par tour complet de joueurs
- **Validation robuste** : Vérification contre un dictionnaire français complet

## Structure des fichiers

```
game-bomb-party/
├── core/           # Logique métier
│   ├── engine.ts   # Moteur de jeu avec nouvelles méthodes
│   ├── timer.ts    # Système de timer
│   └── types.ts    # Types TypeScript étendus
├── data/           # Données et validation
│   ├── trigram_words.json  # Trigrammes avec mots associés (NOUVEAU)
│   ├── french-words.json   # Dictionnaire français
│   └── validator.ts        # Validation des mots
├── ui/             # Composants React
│   ├── BombPartyPage.tsx  # Page principale avec nouvelles infos
│   ├── Menu.tsx           # Menu de démarrage
│   ├── PlayerCircle.tsx   # Cercle des joueurs
│   ├── BombTimer.tsx      # Bombe + timer + trigramme
│   └── WordInput.tsx      # Saisie des mots avec suggestions
└── index.ts        # Exports
```

## Intégration

Le jeu est accessible via la route `/bomb-party` et ajouté au menu principal du header.

## Technologies utilisées

- React 18 + TypeScript
- Tailwind CSS pour le styling
- react-i18next pour l'internationalisation
- Pas de dépendances externes supplémentaires

## Utilisation

1. Cliquer sur "💣 Bomb Party" dans le header
2. Choisir le nombre de joueurs (2 à 8)
3. Configurer le nombre de vies par joueur
4. Cliquer sur "Démarrer la partie"
5. Attendre le compte à rebours (3-2-1)
6. Jouer à tour de rôle en trouvant des mots
7. Utiliser les suggestions affichées si besoin
8. Le dernier survivant gagne !

## Personnalisation

- **Trigrammes** : Modifier `data/trigram_words.json` pour ajouter/modifier les trigrammes et leurs mots associés
- **Durée des tours** : Ajuster dans `core/engine.ts` (ligne 58)
- **Nombre de vies** : Modifier dans `ui/Menu.tsx`
- **Dictionnaire** : Remplacer `data/french-words.json` par un autre dictionnaire

## Migration depuis la v1

- L'ancien fichier `trigrams.json` a été remplacé par `trigram_words.json`
- Le nouveau format offre plus de richesse et de suggestions
- Toutes les fonctionnalités existantes sont préservées
- Les nouvelles fonctionnalités sont rétrocompatibles
