import { BombPartyService } from './bombPartyService';
import { useBombPartyStore } from '../store/useBombPartyStore';
import { logger } from '../utils/logger';

/**
 * Gestionnaire centralisé des instances de BombPartyService.
 * Crée et détruit automatiquement les instances selon le cycle de vie des parties.
 */
export class BombPartyServiceManager {
    private services: Map<string, BombPartyService> = new Map();
    private activeRoomId: string | null = null;
    private cleanupTimers: Map<string, number> = new Map();
    private readonly CLEANUP_DELAY_MS = 30000; // 30s après GAME_OVER
    private managerId: string;

    constructor() {
        this.managerId = `bpsm_${Math.random().toString(36).substring(2, 10)}`;
        logger.info('BombPartyServiceManager créé', { managerId: this.managerId });
    }

    /**
     * Obtient ou crée une instance de service pour une room donnée
     */
    getOrCreateService(roomId?: string): BombPartyService {
        const targetRoomId = roomId || this.activeRoomId || 'default';

        let service = this.services.get(targetRoomId);

        if (!service) {
            logger.info('Création d\'une nouvelle instance BombPartyService', {
                managerId: this.managerId,
                roomId: targetRoomId,
                totalServices: this.services.size
            });

            service = new BombPartyService(targetRoomId);
            this.services.set(targetRoomId, service);
            this.activeRoomId = targetRoomId;

            // Initialiser automatiquement la connexion WebSocket
            logger.debug('Initialisation automatique de la connexion WebSocket', {
                managerId: this.managerId,
                roomId: targetRoomId
            });
            service.init();

            // Annuler tout timer de nettoyage en attente pour cette room
            this.cancelCleanupTimer(targetRoomId);
        }

        return service;
    }

    /**
     * Obtient le service actif (dernière room active)
     */
    getActiveService(): BombPartyService | null {
        if (this.activeRoomId) {
            return this.services.get(this.activeRoomId) || null;
        }

        // Fallback : retourner le premier service disponible
        const firstService = Array.from(this.services.values())[0];
        return firstService || null;
    }

    /**
     * Détruit une instance de service spécifique
     */
    destroyService(roomId: string): void {
        const service = this.services.get(roomId);

        if (!service) {
            logger.debug('Tentative de destruction d\'un service inexistant', {
                managerId: this.managerId,
                roomId
            });
            return;
        }

        logger.info('Destruction d\'une instance BombPartyService', {
            managerId: this.managerId,
            roomId,
            remainingServices: this.services.size - 1
        });

        try {
            service.disconnect();
        } catch (error) {
            logger.error('Erreur lors de la déconnexion du service', error, {
                managerId: this.managerId,
                roomId
            });
        }

        this.services.delete(roomId);
        this.cancelCleanupTimer(roomId);

        if (this.activeRoomId === roomId) {
            this.activeRoomId = null;
        }
    }

    /**
     * Planifie la destruction d'un service après un délai
     */
    scheduleCleanup(roomId: string, delay: number = this.CLEANUP_DELAY_MS): void {
        // Annuler tout timer existant
        this.cancelCleanupTimer(roomId);

        logger.info('Planification du nettoyage d\'un service', {
            managerId: this.managerId,
            roomId,
            delayMs: delay
        });

        const timer = window.setTimeout(() => {
            logger.info('Exécution du nettoyage planifié', {
                managerId: this.managerId,
                roomId
            });
            this.destroyService(roomId);
        }, delay);

        this.cleanupTimers.set(roomId, timer);
    }

    /**
     * Annule le nettoyage planifié pour une room
     */
    cancelCleanupTimer(roomId: string): void {
        const timer = this.cleanupTimers.get(roomId);
        if (timer) {
            clearTimeout(timer);
            this.cleanupTimers.delete(roomId);
            logger.debug('Timer de nettoyage annulé', {
                managerId: this.managerId,
                roomId
            });
        }
    }

    /**
     * Détruit tous les services
     */
    destroyAll(): void {
        logger.info('Destruction de tous les services', {
            managerId: this.managerId,
            count: this.services.size
        });

        for (const roomId of Array.from(this.services.keys())) {
            this.destroyService(roomId);
        }

        this.activeRoomId = null;
    }

    /**
     * Obtient le nombre de services actifs
     */
    getActiveCount(): number {
        return this.services.size;
    }

    // ========================================
    // Méthodes déléguées pour compatibilité
    // ========================================

    init(): void {
        const service = this.getOrCreateService();
        service.init();
    }

    createRoom(name: string, isPrivate: boolean, password?: string, maxPlayers: number = 4): void {
        const service = this.getOrCreateService();
        service.createRoom(name, isPrivate, password, maxPlayers);
    }

    joinRoom(roomId: string, password?: string): void {
        // Utiliser le service actif ou créer un service par défaut
        // Ne PAS créer un service avec le roomId cible car on n'a pas encore rejoint
        const service = this.getActiveService() || this.getOrCreateService();
        service.joinRoom(roomId, password);
    }

    leaveRoom(): void {
        const service = this.getActiveService();
        if (service) {
            service.leaveRoom();
        }
    }

    startGame(): void {
        const service = this.getActiveService();
        if (service) {
            service.startGame();
        }
    }

    submitWord(word: string, msTaken: number): void {
        const service = this.getActiveService();
        if (service) {
            service.submitWord(word, msTaken);
        }
    }

    activateBonus(bonusKey: string): void {
        const service = this.getActiveService();
        if (service) {
            service.activateBonus(bonusKey);
        }
    }

    requestLobbyList(): void {
        const service = this.getActiveService();
        if (service) {
            service.requestLobbyList();
        }
    }

    authenticateWithName(playerName: string): void {
        const service = this.getActiveService();
        if (service) {
            service.authenticateWithName(playerName);
        }
    }

    disconnect(): void {
        const service = this.getActiveService();
        if (service) {
            service.disconnect();
        }
    }

    requestRoomState(roomId: string): void {
        const service = this.getActiveService();
        if (service) {
            service.requestRoomState(roomId);
        }
    }
}

// Export singleton du gestionnaire
export const bombPartyServiceManager = new BombPartyServiceManager();

// Écouter les changements de phase pour nettoyer automatiquement
if (typeof window !== 'undefined') {
    // Subscribe au store pour détecter GAME_OVER
    useBombPartyStore.subscribe(
        (state: ReturnType<typeof useBombPartyStore.getState>) => state.gamePhase,
        (phase: string, previousPhase: string) => {
            if (phase === 'GAME_OVER' && previousPhase !== 'GAME_OVER') {
                const roomId = useBombPartyStore.getState().connection.roomId;
                if (roomId) {
                    logger.info('GAME_OVER détecté - planification du nettoyage', {
                        roomId,
                        phase,
                        previousPhase
                    });
                    bombPartyServiceManager.scheduleCleanup(roomId);
                }
            }
        }
    );

    // Écouter les événements de quitter le lobby
    window.addEventListener('bp:lobby:left', () => {
        const roomId = useBombPartyStore.getState().connection.roomId;
        if (roomId) {
            logger.info('Lobby quitté - destruction immédiate du service', { roomId });
            bombPartyServiceManager.destroyService(roomId);
        }
    });
}
