import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

interface Client {
  id: number;
  name: string;
  socket: WebSocket;
}

export default fp(async function Chat(fastify: FastifyInstance) {
  const clients: Client[] = [];

  // Vérifie si un utilisateur bloque un autre
  async function isBlocked(blockerId: number, senderId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fastify.db.get(
        "SELECT 1 FROM blocks WHERE blockerId = ? AND blockedId = ?",
        [blockerId, senderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  // Envoi vers un client spécifique
  function sendToClient(client: Client, data: any) {
    try {
      if (client.socket.readyState === 1) {
        client.socket.send(JSON.stringify(data));
      }
    } catch (err) {
      fastify.log.error("Erreur envoi WS:", err);
    }
  }

  // Envoie la liste des utilisateurs connectés à tous
  function broadcastUsers() {
    const users = clients.map(c => ({ id: c.id, name: c.name }));
    for (const c of clients) {
      if (c.socket.readyState === 1) {
        c.socket.send(JSON.stringify({ type: "users", users }));
      }
    }
  }

  fastify.get("/chat", { websocket: true }, (socket, req) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      socket.close();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string; email: string };
      const client: Client = { id: decoded.id, name: decoded.name, socket };
      clients.push(client);

      fastify.log.info(`✅ ${client.name} connecté (${clients.length} clients)`);

      // Envoie la liste des utilisateurs à tous
      broadcastUsers();

      // Réception de message
      socket.on("message", async (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.type === "message") {
            const msg = {
              from: client.id,
              fromName: client.name,
              to: data.to || null,
              text: data.text,
              date: new Date().toISOString(),
            };

            // Sauvegarde en base
            fastify.db.run(
              "INSERT INTO messages (fromId, toId, text, date) VALUES (?, ?, ?, ?)",
              [msg.from, msg.to, msg.text, msg.date]
            );

            if (msg.to) {
              // Message privé
              const targets = clients.filter(c => c.id === msg.to);
              for (const t of targets) {
                if (!(await isBlocked(t.id, client.id))) {
                  sendToClient(t, { type: "private", ...msg });
                }
              }
              sendToClient(client, { type: "private", ...msg });
            } else {
              // Message global
              for (const c of clients) {
                if (await isBlocked(c.id, client.id)) continue;
                sendToClient(c, { type: "global", ...msg });
              }
            }
          }

          if (data.type === "block") {
            fastify.db.run(
              "INSERT OR IGNORE INTO blocks (blockerId, blockedId) VALUES (?, ?)",
              [client.id, data.userId]
            );
            sendToClient(client, { type: "info", message: `Utilisateur ${data.userId} bloqué` });
          }

          if (data.type === "unblock") {
            fastify.db.run(
              "DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?",
              [client.id, data.userId]
            );
            sendToClient(client, { type: "info", message: `Utilisateur ${data.userId} débloqué` });
          }
        } catch (err) {
          fastify.log.error("Erreur message WS :", err);
        }
      });

      socket.on("close", () => {
        const index = clients.findIndex(c => c.socket === socket);
        if (index !== -1) clients.splice(index, 1);
        fastify.log.info(`❌ ${client.name} déconnecté (${clients.length} restants)`);
        broadcastUsers();
      });
    } catch (err) {
      fastify.log.error("JWT invalide :", err);
      socket.close();
    }
  });
});
