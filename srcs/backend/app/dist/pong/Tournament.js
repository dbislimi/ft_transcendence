import Game from "./Game.ts";
class Node {
    game;
    gameId;
    parent;
    right;
    left;
    winner;
    loser;
    depth;
    bracketId;
    constructor(N) {
        if (N === undefined)
            return;
        this.winner = N.p;
        this.left = N.left;
        this.right = N.right;
        this.depth = N.depth;
        this.bracketId = N.id;
    }
    isLeaf() {
        return !this.left && !this.right;
    }
}
export default class Tournament {
    id;
    started = false;
    capacity;
    players = [];
    leafs = [];
    root = null;
    rooms;
    password;
    nodeId = 0;
    onEnd;
    constructor({ rooms, id, capacity, password, onEnd, }) {
        this.rooms = rooms;
        this.password = password;
        this.id = id;
        this.capacity = capacity;
        this.onEnd = onEnd;
    }
    join(player) {
        if (!this.players.includes(player))
            this.players.push(player);
        console.log("Joined tournament: ", this.id);
        console.log(`Nb of players: ${this.players.length}`);
        if (this.players.length === this.capacity)
            this.startTournament();
    }
    quitQueue(player) {
        this.players = this.players.filter((ws) => ws !== player);
    }
    buildBracket() {
        if (this.players.length === 0) {
            this.root = null;
            return;
        }
        console.log("building nodes");
        let depth = Math.ceil(Math.log2(this.players.length));
        let nodes = this.players.map((p) => new Node({ p: p }));
        this.leafs = nodes;
        while (nodes.length > 1) {
            let nextRound = [];
            for (let i = 0; i < nodes.length; i += 2) {
                const right = nodes[i];
                const left = nodes[i + 1];
                const parent = new Node({
                    right: right,
                    left: left,
                    depth: depth,
                    id: this.nodeId++,
                });
                left.parent = parent;
                right.parent = parent;
                nextRound.push(parent);
            }
            nodes = nextRound;
            --depth;
        }
        this.root = nodes[0];
        this.printTree();
    }
    joinMatch(node) {
        const parent = node.parent;
        const winner = node.winner;
        console.log(`depth: ${node.depth}, id: ${node.bracketId}`);
        if (!winner)
            return;
        if (!parent) {
            this.started = false;
            winner.send(JSON.stringify({ event: "tournament_win" }));
            this.onEnd();
            return;
        }
        if (parent.loser) {
            parent.winner = winner;
            this.joinMatch(parent);
            return;
        }
        if (parent.game)
            parent.game.connectPlayer(winner);
        else {
            parent.game = new Game({
                p1: winner,
                botDiff: "medium",
                onEnd: (ws, winner) => {
                    console.log("game onEnd");
                    this.rooms.delete(ws);
                    if (winner === true) {
                        parent.winner = ws;
                        this.joinMatch(parent);
                    }
                    else
                        parent.loser = ws;
                },
            });
            parent.game.start();
        }
        this.rooms.set(winner, parent.game);
    }
    init() {
        console.log(`leafs: ${this.leafs.length}`);
        for (const leaf of this.leafs)
            this.joinMatch(leaf);
    }
    startTournament() {
        this.buildBracket();
        this.started = true;
        this.init();
    }
    disconnect(ws) {
        if (this.started === false)
            this.quitQueue(ws);
        else {
            const room = this.rooms.get(ws);
            if (!room)
                throw Error("DISCONNECT FAILED");
            room.disconnectPlayer(ws);
        }
        if (this.players.length === 0)
            this.onEnd();
    }
    printTree(root = this.root) {
        if (!root) {
            console.log("(arbre vide)");
            return;
        }
        const label = (n) => {
            const type = !n.left && !n.right ? "P" : "N"; // P = feuille (player), N = noeud interne
            const id = n.bracketId !== undefined ? `#${n.bracketId}` : "";
            const depth = n.depth !== undefined ? ` d${n.depth}` : "";
            return `${type}${id}${depth}`;
        };
        const traverse = (n, prefix, isLeft) => {
            if (!n)
                return;
            if (n.right)
                traverse(n.right, prefix + (isLeft ? "│   " : "    "), false);
            console.log(prefix + (isLeft ? "└── " : "┌── ") + label(n));
            if (n.left)
                traverse(n.left, prefix + (isLeft ? "    " : "│   "), true);
        };
        traverse(root, "", true);
    }
    isEmpty() {
        return this.players.length === 0;
    }
}
