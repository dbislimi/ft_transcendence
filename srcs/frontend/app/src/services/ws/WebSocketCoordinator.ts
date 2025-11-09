// websocketcoordinator - un utilitaire global pour coordonner les connexions websocket
// et eviter les connexions multiples

type ConnectionType = 'bombPartyClient' | 'bombPartyService' | 'other';

interface RegistrationInfo {
  id: string;
  type: ConnectionType;
  timestamp: number;
  priority: number;
}

// classe singleton pour gerer les connexions websocket au serveur
// permet de coordonner differentes parties de l'application qui utilisent
// des connexions websocket au meme endpoint
class WebSocketCoordinator {
  private static instance: WebSocketCoordinator;
  private activeConnections: Map<string, RegistrationInfo> = new Map();
  private primaryConnection: string | null = null;
  
  private constructor() {
    // Singleton
    console.log('[WebSocketCoordinator] Initialisation');
  }
  
  // obtient l'instance unique du coordinateur
  public static getInstance(): WebSocketCoordinator {
    if (!WebSocketCoordinator.instance) {
      WebSocketCoordinator.instance = new WebSocketCoordinator();
    }
    return WebSocketCoordinator.instance;
  }
  
  // enregistre une connexion websocket
  // id: identifiant unique de la connexion
  // type: type de connexion
  // priority: priorite de la connexion (plus le nombre est eleve, plus la priorite est haute)
  // returns: true si cette connexion est autorisee, false sinon
  public registerConnection(id: string, type: ConnectionType, priority: number = 1): boolean {
    console.log(`[WebSocketCoordinator] Enregistrement de la connexion [${id}] de type [${type}]`);
    
    // Enregistrer la connexion
    const info: RegistrationInfo = {
      id,
      type,
      timestamp: Date.now(),
      priority
    };
    
    this.activeConnections.set(id, info);
    
    this.updatePrimaryConnection();
    
    const isPrimary = this.primaryConnection === id;
    console.log(`[WebSocketCoordinator] Connection [${id}] ${isPrimary ? 'authorized (primary)' : 'not authorized (secondary)'}`);
    return isPrimary;
  }
  
  public isPrimaryConnection(id: string): boolean {
    return this.primaryConnection === id;
  }
  
  public unregisterConnection(id: string): void {
    if (this.activeConnections.has(id)) {
      console.log(`[WebSocketCoordinator] Unregistering connection [${id}]`);
      this.activeConnections.delete(id);
      
      if (this.primaryConnection === id) {
        this.updatePrimaryConnection();
      }
    }
  }
  
  // met a jour la connexion principale en fonction des priorites
  private updatePrimaryConnection(): void {
    if (this.activeConnections.size === 0) {
      this.primaryConnection = null;
      return;
    }
    
    let highestPriority = -1;
    let primaryId = null;
    
    for (const [id, info] of this.activeConnections.entries()) {
      if (info.priority > highestPriority || 
          (info.priority === highestPriority && primaryId && this.activeConnections.get(primaryId)!.timestamp > info.timestamp)) {
        highestPriority = info.priority;
        primaryId = id;
      }
    }
    
    const oldPrimary = this.primaryConnection;
    this.primaryConnection = primaryId;
    
    if (oldPrimary !== primaryId) {
      console.log(`[WebSocketCoordinator] New primary connection: [${primaryId}]`);
    }
  }
  
  public getConnectionsInfo(): { activeCount: number, primaryConnection: string | null } {
    return {
      activeCount: this.activeConnections.size,
      primaryConnection: this.primaryConnection
    };
  }
}

// Exporter l'instance singleton
export const wsCoordinator = WebSocketCoordinator.getInstance();