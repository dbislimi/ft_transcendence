import type { Client } from "../plugins/websockets.ts";

export type InvitationState =
	| "pending"
	| "accepted"
	| "declined"
	| "cancelled"
	| "expired";

export interface Invitation {
	id: string; // sentId:receivId
	sent: Client;
	receiv: Client;
	createdAt: number;
	expiresAt: number;
	state: InvitationState;
	timeoutRef: ReturnType<typeof setTimeout> | null;
	options?: {
		bonusNb?: number;
		bonusTypes?: string[];
		playerSpeed?: number;
	};
}

type Action = "accept" | "decline" | "cancel";
const stateAction: Record<Action, InvitationState> = {
	accept: "accepted",
	decline: "declined",
	cancel: "cancelled",
};

interface InvitEvents {
	onStateChange(inv: Invitation): void;
}

export default class InvitManager {
	private sentInvit: Map<number, Invitation[]> = new Map();
	private receivInvit: Map<number, Invitation[]> = new Map();
	private readonly ttlMs: number;
	private readonly events: InvitEvents;

	constructor(opts: { ttlSeconds?: number } & InvitEvents) {
		this.ttlMs = (opts.ttlSeconds ?? 30) * 1000;
		this.events = opts;
	}

	getActiveForClient(client: Client): Invitation | undefined {
		const inList = this.receivInvit.get(client.id);
		if (inList) {
			const pendingIn = inList.find((i) => i.state === "pending");
			if (pendingIn) return pendingIn;
		}
		const outList = this.sentInvit.get(client.id);
		if (outList) {
			const pendingOut = outList.find((i) => i.state === "pending");
			if (pendingOut) return pendingOut;
		}
		return undefined;
	}
	hasPendingOutgoing(client: Client): boolean {
		const list = this.sentInvit.get(client.id);
		return !!list && list.some((i) => i.state === "pending");
	}
	hasPendingIncoming(client: Client): boolean {
		const list = this.receivInvit.get(client.id);
		return !!list && list.some((i) => i.state === "pending");
	}
	canPlayOnline(client: Client): boolean {
		return !this.hasPendingOutgoing(client);
	}

	create(
		sent: Client,
		receiv: Client,
		options?: {
			bonusNb?: number;
			bonusTypes?: string[];
			playerSpeed?: number;
		}
	): void {
		const sentList = this.sentInvit.get(sent.id);
		if (sentList) {
			const existing = sentList.find(
				(i) => i.state === "pending" && i.receiv.id === receiv.id
			);
			if (existing) return;
		}
		const received = this.receivInvit.get(sent.id);
		if (received) {
			const same = received.find(
				(i) =>
					i.state === "pending" &&
					i.sent.id === receiv.id &&
					i.receiv.id === sent.id
			);
			if (same) {
				this.do("accept", sent, same.id);
				return;
			}
		}
		const now = Date.now();
		const invitation: Invitation = {
			id: `${sent.id}:${receiv.id}`,
			sent,
			receiv,
			createdAt: now,
			expiresAt: now + this.ttlMs,
			state: "pending",
			timeoutRef: null,
			options,
		};
		const outList = this.sentInvit.get(sent.id);
		if (!outList) this.sentInvit.set(sent.id, [invitation]);
		else outList.push(invitation);
		const inList = this.receivInvit.get(receiv.id);
		if (!inList) this.receivInvit.set(receiv.id, [invitation]);
		else inList.push(invitation);
		invitation.timeoutRef = setTimeout(
			() => this.expire(invitation),
			this.ttlMs
		);
		this.events.onStateChange(invitation);
		return;
	}

	do(
		action: "accept" | "decline" | "cancel",
		client: Client,
		invitId: string
	): void {
		let list: Invitation[] | undefined;
		if (action === "cancel") list = this.sentInvit.get(client.id);
		else list = this.receivInvit.get(client.id);

		if (!list) return;
		const inv = list.find((i) => i.id === invitId && i.state === "pending");
		if (!inv) return;
		inv.state = stateAction[action];
		this.clearTimeout(inv);
		this.events.onStateChange(inv);
		this.removeInvitation(inv);
		if (action === "accept") this.cleanupOnAcceptance(inv);
	}

	expire(invitation: Invitation) {
		if (invitation.state !== "pending") return;
		invitation.state = "expired";
		this.clearTimeout(invitation);
		this.events.onStateChange(invitation);
		this.removeInvitation(invitation);
	}

	removeForClient(client: Client) {
		const outgoing = this.sentInvit.get(client.id);
		if (outgoing) {
			for (const inv of [...outgoing]) {
				if (inv.state === "pending") {
					inv.state = "cancelled";
					this.clearTimeout(inv);
					this.events.onStateChange(inv);
				}
				this.removeInvitation(inv);
			}
		}
		const incomingList = this.receivInvit.get(client.id);
		if (incomingList) {
			for (const inv of [...incomingList]) {
				if (inv.state === "pending") {
					inv.state = "declined";
					this.clearTimeout(inv);
					this.events.onStateChange(inv);
				}
				this.removeInvitation(inv);
			}
		}
	}
	private removeInvitation(inv: Invitation) {
		const sentList = this.sentInvit.get(inv.sent.id);
		if (sentList) {
			const newTab = sentList.filter((x) => x !== inv);
			if (newTab.length > 0) this.sentInvit.set(inv.sent.id, newTab);
			else this.sentInvit.delete(inv.sent.id);
		}
		const receivList = this.receivInvit.get(inv.receiv.id);
		if (receivList) {
			const newTab = receivList.filter((x) => x !== inv);
			if (newTab.length > 0) this.receivInvit.set(inv.receiv.id, newTab);
			else this.receivInvit.delete(inv.receiv.id);
		}
	}

	listReceiv(client: Client): Invitation[] {
		return this.receivInvit.get(client.id) ?? [];
	}
	listSent(client: Client): Invitation[] {
		return this.sentInvit.get(client.id) ?? [];
	}
	private clearTimeout(inv: Invitation) {
		if (inv.timeoutRef) clearTimeout(inv.timeoutRef);
		inv.timeoutRef = null;
	}

	private cleanupOnAcceptance(accepted: Invitation) {
		this.removeForClient(accepted.sent);
		this.removeForClient(accepted.receiv);
	}
}
