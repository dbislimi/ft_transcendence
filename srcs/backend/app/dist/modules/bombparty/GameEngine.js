import { getInitialState, createGamePlayers, createGameState, isGameOver, getWinner, getCurrentPlayer, getAlivePlayersCount } from './engine';
import { startCountdown, startTurn, resolveTurn, nextPlayer, isTurnExpired, checkAndEndExpiredTurn } from './engine';
import { submitWord, giveRandomBonus } from './engine';
import { getTurnDurationForCurrentPlayer, activateBonus } from './engine';
import { getRandomTrigram } from './trigramSelector';
export class BombPartyEngine {
    state;
    lastTrigram = '';
    currentTrigramUsageCount = 0;
    doubleChanceConsumedThisTurn = false;
    constructor() {
        this.state = getInitialState();
    }
    initializeGame(players, config = {}) {
        const gameConfig = {
            livesPerPlayer: config.livesPerPlayer || 3,
            turnDurationMs: config.turnDurationMs || 15000,
            playersCount: players.length
        };
        const gamePlayers = createGamePlayers(players, gameConfig);
        this.state = createGameState(gamePlayers, gameConfig);
        this.currentTrigramUsageCount = 0;
    }
    startCountdown() {
        startCountdown(this.state);
    }
    startTurn() {
        this.currentTrigramUsageCount = 1;
        this.doubleChanceConsumedThisTurn = false;
        startTurn(this.state, () => this.getNewTrigram(), () => this.getTurnDurationForCurrentPlayer());
    }
    /**
     * Vérifie si le tour actuel est expiré
     */
    isTurnExpired() {
        return isTurnExpired(this.state);
    }
    /**
     * Force la fin du tour si expiré
     */
    checkAndEndExpiredTurn() {
        return checkAndEndExpiredTurn(this.state, () => this.resolveTurn(false, true));
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
        const result = submitWord(this.state, word, msTaken, this.doubleChanceConsumedThisTurn, () => this.giveRandomBonus(this.state.players[this.state.currentPlayerIndex]?.id || ''));
        if (result.consumedDoubleChance) {
            this.doubleChanceConsumedThisTurn = true;
        }
        return {
            ok: result.ok,
            reason: result.reason,
            consumedDoubleChance: result.consumedDoubleChance
        };
    }
    /**
     * Résout le tour actuel (succès ou échec)
     */
    resolveTurn(wordValid, timeExpired) {
        resolveTurn(this.state, wordValid, timeExpired, () => this.nextPlayer(), () => this.startTurn());
        this.currentTrigramUsageCount++;
    }
    nextPlayer() {
        nextPlayer(this.state);
    }
    /**
     * Active un bonus pour un joueur
     */
    activateBonus(playerId, bonusKey) {
        return activateBonus(this.state, playerId, bonusKey);
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
        giveRandomBonus(this.state, playerId);
    }
    getTurnDurationForCurrentPlayer() {
        return getTurnDurationForCurrentPlayer(this.state);
    }
    // --- Getters publics ---
    getState() {
        return { ...this.state };
    }
    getCurrentPlayer() {
        return getCurrentPlayer(this.state);
    }
    getAlivePlayersCount() {
        return getAlivePlayersCount(this.state);
    }
    isGameOver() {
        return isGameOver(this.state);
    }
    getWinner() {
        return getWinner(this.state);
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
     * Génère l'événement de début de tour
     */
    getTurnStartedEvent() {
        return {
            t: 'turn_started',
            turnStartedAt: this.state.turnStartedAt,
            turnDurationMs: this.state.turnDurationMs,
            currentPlayerId: this.state.currentPlayerId
        };
    }
    /**
     * Génère l'événement de synchronisation d'état
     */
    getGameStateSyncEvent() {
        return {
            t: 'game_state',
            gameState: this.getState()
        };
    }
    /**
     * Reset le moteur pour une nouvelle partie
     */
    reset() {
        this.state = getInitialState();
        this.lastTrigram = '';
        this.currentTrigramUsageCount = 0;
        this.doubleChanceConsumedThisTurn = false;
    }
}
