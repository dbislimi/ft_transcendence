export interface Room {
	id: string;
	name: string;
	isPrivate: boolean;
	password?: string;
	maxPlayers: number;
	players: Map<string, PlayerConnection>;
	createdAt: number;
	startedAt?: number;
	lastGameState?: any; // etat precedent pour calculer les deltas
	stateVersion?: number; // version pour detecter les updates obsoletes
	sequenceNumber?: number; // numero de sequence pour ordonner les events
	playerLastSequence?: Map<string, number>; // dernier sequence recu par joueur
	hostId?: string;
}

export interface PlayerConnection {
	id: string;
	name: string;
	ws: any;
	roomId?: string;
	userId?: number;
	sockets?: Set<any>;
}

export interface BPServerMessage {
	event: string;
	payload: any;
}

export interface BPGameEndMessage {
	event: "bp:game:end";
	payload: {
		roomId: string;
		winner?: {
			id: string;
			name: string;
		};
		finalStats: any;
	};
}

export interface RoomInfo {
	id: string;
	name: string;
	players: number;
	maxPlayers: number;
	isPrivate: boolean;
	isStarted: boolean;
	createdAt: number;
}

export interface RoomDetails {
	id: string;
	name: string;
	isPrivate: boolean;
	players: Array<{ id: string; name: string }>;
	maxPlayers: number;
	isStarted: boolean;
	createdAt: number;
}

export interface CreateRoomResult {
	success: boolean;
	roomId?: string;
	maxPlayers?: number;
	error?: string;
}

export interface JoinRoomResult {
	success: boolean;
	players?: Array<{ id: string; name: string }>;
	maxPlayers?: number;
	error?: string;
}

export interface LeaveRoomResult {
	success: boolean;
	error?: string;
	newHostId?: string;
}

export interface StartGameResult {
	success: boolean;
	error?: string;
}

export interface GameInputResult {
	success: boolean;
	error?: string;
}

export interface ActivateBonusResult {
	success: boolean;
	error?: string;
	meta?: any;
}

export interface RoomDetailsResult {
	success: boolean;
	room?: RoomDetails;
	error?: string;
}
