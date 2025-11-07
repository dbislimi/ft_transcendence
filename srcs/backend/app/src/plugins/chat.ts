import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

interface Client {
  id: number;
  name: string;
  socket: any; // WebSocket
}

export default fp(async function Chat(fastify: FastifyInstance<any, any, any, any, any>) {
  const clients: Client[] = [];

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


  function sendToClient(client: Client, data: any) {
    if (client.socket.readyState === 1) {
      client.socket.send(JSON.stringify(data));
    }
  }

  fastify.get("/chat", { websocket: true }, (socket, req) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      socket.close();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: number;
        name: string;
        email: string;
      };

      console.log("ON VA VOIR C QUOI", decoded);
      const client: Client = { id: decoded.id, name: decoded.name, socket };
      clients.push(client);
      fastify.log.info(` ${client.name} connecté`);

      // Messages entrants
      socket.on("message", async (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString());
          console.log("AHHHHHHHHHHHHHHHHHHHHH");
          if (data.type === "message") {
            const msg = {
              from: client.id,
              fromName: client.name,
              to: data.to || null,
              text: data.text,
              date: new Date().toISOString(),
            };
            
            fastify.db.run(
              "INSERT INTO messages (fromId, toId, text, date) VALUES (?, ?, ?, ?)",
              [msg.from, msg.to, msg.text, msg.date]
            );

            if (msg.to) {
              // Message privé
              const target = clients.find((c) => c.id === msg.to);
              if (target && target.id !== client.id) {
                if (!(await isBlocked(target.id, client.id))) {
                  sendToClient(target, { type: "private", ...msg });
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
          fastify.log.error(" Erreur message WS :", err);
        }
      });

      socket.on("close", () => {
        const index = clients.findIndex((c) => c.id === client.id);
        if (index !== -1) clients.splice(index, 1);
        fastify.log.info(` ${client.name} déconnecté`);
      });
    } catch (err) {
      fastify.log.error(" JWT invalide :", err);
      socket.close();
    }
  });
});
