import fp from "fastify-plugin";
import type { FastifyInstance } from 'fastify';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

interface Client {
    id: number;
    name: string;
    socket: any;
}

export default fp(async function Chat(fastify: FastifyInstance) {
    const clients: Client[] = [];

    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    async function isBlocked(blockerId: number, senderId: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fastify.db.get(
                "SELECT 1 FROM blocks WHERE blockerId = ? AND senderId = ?",
                [blockerId, senderId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    fastify.get("/chat", { websocket: true }, (connection, req) => {
        const token = req.headers["sec-websocket-protocol"];
        if (!token) {
            connection.socket.close();
            return;
        }

        try {
        const decoded = jwt.verify(token as string, JWT_SECRET) as {
            id: number;
            name: string;
            email: string;
        };
        console.log("belek y'a RIEN : ", decoded.name);
        const client: Client = { id: decoded.id, name: decoded.name, socket: connection.socket };
        clients.push(client);
        fastify.log.info(`✅ ${client.name} connecté`);

        connection.socket.on("message", async (raw: string) => {
            try {
            const data = JSON.parse(raw);

            if (data.type === "message") {
                const msg = {
                from: client.id,
                fromName: client.name,
                to: data.to || null, // null = global
                text: data.text,
                date: new Date().toISOString(),
                };

                // Sauvegarder en DB
                fastify.db.run(
                "INSERT INTO messages (fromId, toId, text, date) VALUES (?, ?, ?, ?)",
                [msg.from, msg.to, msg.text, msg.date]
                );

                if (msg.to) {
                // Message privé : trouver destinataire
                const target = clients.find((c) => c.id === msg.to);
                if (target) {
                    if (!(await isBlocked(target.id, client.id))) {
                    target.socket.send(JSON.stringify({ type: "private", ...msg }));
                    }
                }
                // Écho à l’expéditeur
                client.socket.send(JSON.stringify({ type: "private", ...msg }));
                } else {
                // Message global : diffuser sauf aux bloqueurs
                for (const c of clients) {
                    if (await isBlocked(c.id, client.id)) continue;
                    if (c.socket.readyState === 1) {
                    c.socket.send(JSON.stringify({ type: "global", ...msg }));
                    }
                }
                }
            }

            if (data.type === "block") {
                // Ajouter blocage
                fastify.db.run(
                "INSERT OR IGNORE INTO blocks (blockerId, blockedId) VALUES (?, ?)",
                [client.id, data.userId]
                );
                client.socket.send(JSON.stringify({ type: "info", message: `Utilisateur ${data.userId} bloqué` }));
            }

            if (data.type === "unblock") {
                // Supprimer blocage
                fastify.db.run(
                "DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?",
                [client.id, data.userId]
                );
                client.socket.send(JSON.stringify({ type: "info", message: `Utilisateur ${data.userId} débloqué` }));
            }

            } catch (err) {
            fastify.log.error("❌ Erreur message WS :", err);
            }
        });

        connection.socket.on("close", () => {
            const index = clients.findIndex((c) => c.id === client.id);
            if (index !== -1) clients.splice(index, 1);
            fastify.log.info(`❌ ${client.name} déconnecté`);
        });
        } catch {
        connection.socket.close();
        }
    });    
})


