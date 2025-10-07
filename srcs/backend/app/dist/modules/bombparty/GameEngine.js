/**
 * Bomb Party Game Engine - Backend Implementation
 *
 * Porte la logique du jeu depuis le frontend vers le backend
 * avec support WebSocket et validation côté serveur
 */
// Constantes
const STREAK_FOR_BONUS = 3;
const DEFAULT_LIVES = 3;
const DEFAULT_TURN_DURATION = 15000;
const FAST_TURN_DURATION = 3000;
import { validateWithDictionary } from './validator.ts';
import { getRandomTrigram } from './trigramSelector.ts';
/**
 * Moteur de jeu Bomb Party côté serveur
 *
 * Gère l'état du jeu, les tours, les validations et les bonus
 * Synchronise l'état avec tous les clients via WebSocket
 */
export class BombPartyEngine {
    state;
    lastTrigram = '';
    currentTrigramUsageCount = 0;
    totalPlayersInRound = 0;
    doubleChanceConsumedThisTurn = false;
    constructor() {
        this.state = this.getInitialState();
    }
    getInitialState() {
        return {
            phase: 'LOBBY',
            players: [],
            currentPlayerIndex: 0,
            currentTrigram: '',
            usedWords: [],
            turnEndsAt: 0,
            turnOrder: [],
            turnDirection: 1,
            baseTurnSeconds: Math.floor(DEFAULT_TURN_DURATION / 1000),
            activeTurnEndsAt: undefined,
            history: []
        };
    }
    /**
     * Initialise une nouvelle partie avec la configuration donnée
     */
    initializeGame(players, config = {}) {
        const gameConfig = {
            livesPerPlayer: config.livesPerPlayer || DEFAULT_LIVES,
            turnDurationMs: config.turnDurationMs || DEFAULT_TURN_DURATION,
            playersCount: players.length
        };
        const gamePlayers = players.map(p => ({
            id: p.id,
            name: p.name,
            lives: gameConfig.livesPerPlayer,
            isEliminated: false,
            streak: 0,
            bonuses: {
                inversion: 0,
                plus5sec: 0,
                vitesseEclair: 0,
                doubleChance: 0,
                extraLife: 0
            },
            pendingEffects: {}
        }));
        this.state = {
            phase: 'COUNTDOWN',
            players: gamePlayers,
            currentPlayerIndex: 0,
            currentTrigram: '',
            usedWords: [],
            turnEndsAt: 0,
            turnOrder: gamePlayers.map(p => p.id),
            turnDirection: 1,
            baseTurnSeconds: Math.max(3, Math.floor(gameConfig.turnDurationMs / 1000)),
            activeTurnEndsAt: undefined,
            history: []
        };
        this.currentTrigramUsageCount = 0;
        this.totalPlayersInRound = gameConfig.playersCount;
        console.log('🎮 [BombParty] Nouvelle partie initialisée:', {
            players: gamePlayers.length,
            lives: gameConfig.livesPerPlayer,
            turnDuration: gameConfig.turnDurationMs
        });
    }
    /**
     * Démarre le compte à rebours avant le début de la partie
     */
    startCountdown() {
        this.state.phase = 'COUNTDOWN';
        console.log('⏰ [BombParty] Compte à rebours démarré');
    }
    /**
     * Démarre un nouveau tour de jeu
     */
    startTurn() {
        // Vérifier que le joueur actuel est vivant
        if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
            console.log('⚠️ [BombParty] Joueur actuel éliminé, passage au suivant');
            this.nextPlayer();
            if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
                this.state.phase = 'GAME_OVER';
                return;
            }
        }
        // Générer un nouveau trigramme pour chaque tour
        this.state.currentTrigram = this.getNewTrigram();
        this.currentTrigramUsageCount = 1;
        this.totalPlayersInRound = this.state.players.length;
        this.state.phase = 'TURN_ACTIVE';
        // Reset des flags de tour
        this.doubleChanceConsumedThisTurn = false;
        const duration = this.getTurnDurationForCurrentPlayer();
        const now = Date.now();
        this.state.turnEndsAt = now + duration;
        this.state.activeTurnEndsAt = this.state.turnEndsAt;
        // Nettoyer le flag de tour rapide si applicable
        const currentId = this.state.players[this.state.currentPlayerIndex]?.id;
        if (currentId && this.state.pendingFastForNextPlayerId === currentId) {
            this.state.pendingFastForNextPlayerId = undefined;
        }
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        console.log('🔄 [BombParty] Tour démarré:', {
            player: currentPlayer?.name,
            trigram: this.state.currentTrigram,
            duration: duration
        });
    }
    getNewTrigram() {
        const newTrigram = getRandomTrigram(this.lastTrigram);
        this.lastTrigram = newTrigram;
        return newTrigram;
    }
    /**
     * Soumet un mot pour validation
     */
    submitWord(word, msTaken) {
        console.log('🔍 [BombParty] Validation du mot:', { word, trigram: this.state.currentTrigram });
        const validation = validateWithDictionary(word, this.state.currentTrigram, this.state.usedWords);
        console.log('📋 [BombParty] Résultat validation:', validation);
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (!currentPlayer) {
            return { ok: false, reason: 'no_player' };
        }
        if (validation.ok) {
            console.log('✅ [BombParty] Mot valide accepté:', word);
            this.state.usedWords.push(word.toLowerCase());
            this.state.history.push({
                playerId: currentPlayer.id,
                word,
                ok: true,
                msTaken
            });
            // Gestion du streak et des bonus
            currentPlayer.streak = (currentPlayer.streak || 0) + 1;
            if (currentPlayer.streak > 0 && currentPlayer.streak % STREAK_FOR_BONUS === 0) {
                this.giveRandomBonus(currentPlayer.id);
            }
            this.state.phase = 'RESOLVE';
            return { ok: true };
        }
        else {
            console.log('❌ [BombParty] Mot invalide:', { word, reason: validation.reason });
            this.state.history.push({
                playerId: currentPlayer.id,
                word,
                ok: false,
                msTaken
            });
            // Vérifier la double chance
            if (currentPlayer?.pendingEffects?.doubleChance && !this.doubleChanceConsumedThisTurn) {
                this.doubleChanceConsumedThisTurn = true;
                if (currentPlayer.pendingEffects) {
                    currentPlayer.pendingEffects.doubleChance = false;
                }
                return { ok: false, reason: validation.reason, consumedDoubleChance: true };
            }
            this.state.phase = 'RESOLVE';
            return { ok: false, reason: validation.reason };
        }
    }
    /**
     * Résout le tour actuel (succès ou échec)
     */
    resolveTurn(wordValid, timeExpired) {
        console.log('🔄 [BombParty] Résolution du tour:', { wordValid, timeExpired });
        if (this.state.players.length === 0 || this.state.currentPlayerIndex >= this.state.players.length) {
            console.error('❌ [BombParty] Erreur: Aucun joueur ou index invalide');
            return;
        }
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (!currentPlayer) {
            console.error('❌ [BombParty] Erreur: Joueur actuel non trouvé');
            return;
        }
        console.log('👤 [BombParty] Joueur actuel:', {
            name: currentPlayer.name,
            lives: currentPlayer.lives
        });
        if (!wordValid || timeExpired) {
            // Reset du streak en cas d'échec
            currentPlayer.streak = 0;
            currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
            if (currentPlayer.lives === 0) {
                console.log('💀 [BombParty] Joueur éliminé:', currentPlayer.name);
                currentPlayer.isEliminated = true;
            }
        }
        // Vérifier s'il reste un seul joueur vivant
        const alivePlayers = this.state.players.filter(p => !p.isEliminated);
        if (alivePlayers.length <= 1) {
            this.state.phase = 'GAME_OVER';
            console.log('🏆 [BombParty] Fin de partie, gagnant:', alivePlayers[0]?.name || 'Aucun');
            return;
        }
        this.currentTrigramUsageCount++;
        this.nextPlayer();
        this.startTurn();
    }
    nextPlayer() {
        if (this.state.players.length === 0)
            return;
        let attempts = 0;
        const maxAttempts = this.state.players.length * 2;
        do {
            const step = this.state.turnDirection === 1 ? 1 : -1;
            const len = this.state.players.length;
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + step + len) % len;
            attempts++;
            if (attempts > maxAttempts) {
                console.error('❌ [BombParty] Erreur: Impossible de trouver le prochain joueur');
                break;
            }
        } while (this.state.players[this.state.currentPlayerIndex]?.isEliminated);
        if (!this.state.players[this.state.currentPlayerIndex]) {
            console.error('❌ [BombParty] Erreur: Aucun joueur valide trouvé');
            this.state.phase = 'GAME_OVER';
        }
    }
    /**
     * Active un bonus pour un joueur
     */
    activateBonus(playerId, bonusKey) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) {
            console.log('❌ [BombParty] Joueur non trouvé pour bonus:', playerId);
            return { ok: false };
        }
        if (!player.bonuses[bonusKey] || player.bonuses[bonusKey] <= 0) {
            console.log('❌ [BombParty] Bonus non disponible:', { player: player.name, bonus: bonusKey });
            return { ok: false };
        }
        console.log('🎁 [BombParty] Activation bonus:', { player: player.name, bonus: bonusKey });
        switch (bonusKey) {
            case 'inversion':
                this.state.turnDirection = this.state.turnDirection === 1 ? -1 : 1;
                player.bonuses.inversion -= 1;
                return { ok: true };
            case 'plus5sec':
                if (this.state.phase === 'TURN_ACTIVE' && this.state.activeTurnEndsAt) {
                    this.state.activeTurnEndsAt += 5000;
                    this.state.turnEndsAt = this.state.activeTurnEndsAt;
                    player.bonuses.plus5sec -= 1;
                    return { ok: true, meta: { extendMs: 5000 } };
                }
                return { ok: false };
            case 'vitesseEclair':
                const targetIdx = this.peekNextAliveIndex();
                const targetId = targetIdx >= 0 ? this.state.players[targetIdx].id : undefined;
                if (targetId) {
                    this.state.pendingFastForNextPlayerId = targetId;
                    player.bonuses.vitesseEclair -= 1;
                    return { ok: true, meta: { targetId } };
                }
                return { ok: false };
            case 'doubleChance':
                player.pendingEffects = player.pendingEffects || {};
                player.pendingEffects.doubleChance = true;
                player.bonuses.doubleChance -= 1;
                return { ok: true };
            case 'extraLife':
                if (player.isEliminated)
                    return { ok: false };
                player.lives = Math.min(player.lives + 1, 9);
                player.bonuses.extraLife -= 1;
                return { ok: true };
            default:
                return { ok: false };
        }
    }
    peekNextAliveIndex() {
        if (this.state.players.length === 0)
            return -1;
        let idx = this.state.currentPlayerIndex;
        const len = this.state.players.length;
        for (let i = 0; i < len; i++) {
            const step = this.state.turnDirection === 1 ? 1 : -1;
            idx = (idx + step + len) % len;
            if (!this.state.players[idx].isEliminated)
                return idx;
        }
        return -1;
    }
    giveRandomBonus(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player)
            return;
        const keys = ['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        player.bonuses[key] = (player.bonuses[key] || 0) + 1;
        console.log('🎁 [BombParty] Bonus attribué:', { player: player.name, bonus: key });
    }
    getTurnDurationForCurrentPlayer() {
        const base = this.state.baseTurnSeconds * 1000;
        const currentId = this.state.players[this.state.currentPlayerIndex]?.id;
        if (currentId && this.state.pendingFastForNextPlayerId === currentId) {
            return FAST_TURN_DURATION;
        }
        return base;
    }
    // --- Getters publics ---
    getState() {
        return { ...this.state };
    }
    getCurrentPlayer() {
        return this.state.players[this.state.currentPlayerIndex] || null;
    }
    getAlivePlayersCount() {
        return this.state.players.filter(p => !p.isEliminated).length;
    }
    isGameOver() {
        return this.state.phase === 'GAME_OVER';
    }
    getWinner() {
        if (this.state.phase !== 'GAME_OVER')
            return null;
        const alivePlayers = this.state.players.filter(p => !p.isEliminated);
        return alivePlayers.length === 1 ? alivePlayers[0] : null;
    }
    /**
     * Statistiques finales pour la base de données
     */
    getFinalStats() {
        return this.state.players.map(player => {
            const playerHistory = this.state.history.filter(h => h.playerId === player.id);
            const validWords = playerHistory.filter(h => h.ok).length;
            return {
                playerId: player.id,
                wordsSubmitted: playerHistory.length,
                validWords,
                maxStreak: player.streak
            };
        });
    }
    /**
     * Reset le moteur pour une nouvelle partie
     */
    reset() {
        this.state = this.getInitialState();
        this.lastTrigram = '';
        this.currentTrigramUsageCount = 0;
        this.totalPlayersInRound = 0;
        this.doubleChanceConsumedThisTurn = false;
        console.log('🔄 [BombParty] Moteur reset');
    }
}
