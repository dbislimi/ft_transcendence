type ConnectionType = "bombPartyClient" | "bombPartyService" | "other";

interface RegistrationInfo {
	id: string;
	type: ConnectionType;
	timestamp: number;
	priority: number;
	isActive: boolean;
}

class WebSocketCoordinator {
	private static instance: WebSocketCoordinator;
	private activeConnections: Map<string, RegistrationInfo> = new Map();
	private primaryConnection: string | null = null;
	private connectionChangeCallbacks: Set<(primaryId: string | null) => void> =
		new Set();

	private constructor() {}

	public static getInstance(): WebSocketCoordinator {
		if (!WebSocketCoordinator.instance) {
			WebSocketCoordinator.instance = new WebSocketCoordinator();
		}
		return WebSocketCoordinator.instance;
	}

	public registerConnection(
		id: string,
		type: ConnectionType,
		priority: number = 1
	): boolean {
		if (this.activeConnections.has(id)) {
			const existing = this.activeConnections.get(id)!;
			if (existing.isActive) {
				return this.primaryConnection === id;
			}
			existing.isActive = true;
			existing.priority = priority;
			existing.timestamp = Date.now();
		} else {
			const info: RegistrationInfo = {
				id,
				type,
				timestamp: Date.now(),
				priority,
				isActive: true,
			};

			this.activeConnections.set(id, info);
		}

		const wasPrimary = this.primaryConnection === id;
		this.updatePrimaryConnection();

		const isPrimary = this.primaryConnection === id;

		if (!wasPrimary && isPrimary) {
			this.notifyConnectionChange();
		} else if (wasPrimary && !isPrimary) {
			this.notifyConnectionChange();
		}
		return isPrimary;
	}

	public isPrimaryConnection(id: string): boolean {
		return this.primaryConnection === id;
	}

	public unregisterConnection(id: string): void {
		if (this.activeConnections.has(id)) {
			const wasPrimary = this.primaryConnection === id;

			this.activeConnections.delete(id);

			if (wasPrimary) {
				this.updatePrimaryConnection();
				this.notifyConnectionChange();
			}
		}
	}

	public markConnectionInactive(id: string): void {
		const info = this.activeConnections.get(id);
		if (info) {
			info.isActive = false;
			if (this.primaryConnection === id) {
				this.updatePrimaryConnection();
				this.notifyConnectionChange();
			}
		}
	}

	public markConnectionActive(id: string): void {
		const info = this.activeConnections.get(id);
		if (info) {
			info.isActive = true;
			const wasPrimary = this.primaryConnection === id;
			this.updatePrimaryConnection();

			if (!wasPrimary && this.primaryConnection === id) {
				this.notifyConnectionChange();
			}
		}
	}

	private updatePrimaryConnection(): void {
		if (this.activeConnections.size === 0) {
			this.primaryConnection = null;
			return;
		}

		let highestPriority = -1;
		let primaryId: string | null = null;
		let earliestTimestamp = Infinity;

		for (const [id, info] of this.activeConnections.entries()) {
			if (!info.isActive) {
				continue;
			}

			if (
				info.priority > highestPriority ||
				(info.priority === highestPriority &&
					info.timestamp < earliestTimestamp)
			) {
				highestPriority = info.priority;
				primaryId = id;
				earliestTimestamp = info.timestamp;
			}
		}

		const oldPrimary = this.primaryConnection;
		this.primaryConnection = primaryId;
	}

	private notifyConnectionChange(): void {
		for (const callback of this.connectionChangeCallbacks) {
			try {
				callback(this.primaryConnection);
			} catch (err) {
				console.error(
					"[WebSocketCoordinator] Error in connection change callback:",
					err
				);
			}
		}
	}

	public onPrimaryConnectionChange(
		callback: (primaryId: string | null) => void
	): () => void {
		this.connectionChangeCallbacks.add(callback);
		return () => {
			this.connectionChangeCallbacks.delete(callback);
		};
	}

	public getConnectionsInfo(): {
		activeCount: number;
		primaryConnection: string | null;
		allConnections: Array<{
			id: string;
			type: ConnectionType;
			priority: number;
			isActive: boolean;
		}>;
	} {
		return {
			activeCount: Array.from(this.activeConnections.values()).filter(
				(c) => c.isActive
			).length,
			primaryConnection: this.primaryConnection,
			allConnections: Array.from(this.activeConnections.values()).map(
				(c) => ({
					id: c.id,
					type: c.type,
					priority: c.priority,
					isActive: c.isActive,
				})
			),
		};
	}

	public cleanup(): void {
		this.activeConnections.clear();
		this.primaryConnection = null;
		this.connectionChangeCallbacks.clear();
	}
}

export const wsCoordinator = WebSocketCoordinator.getInstance();
