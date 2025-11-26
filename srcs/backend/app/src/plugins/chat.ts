import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AsyncLock } from "../utils/AsyncLock.ts";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

interface Client {
  id: number;
  name: string;
  socket: WebSocket;
}

const clients: Client[] = [];
const clientsLock = new AsyncLock();

export async function sendTournamentMessage(
  playerIds: (number | undefined)[],
  message: string
) {
  /*if (playerIds == undefined) fait un ptit bail pour ne pas afficher le undefined
      return;*/
  const ids = playerIds.filter(Boolean) as number[];

  const payload = {
    type: "info",
    message,
    date: new Date().toISOString(),
  };

  const snapshot = await clientsLock.acquire(() => [...clients]);

  for (const c of snapshot) {
    if (ids.includes(c.id) && c.socket.readyState === 1) {
      try {
        c.socket.send(JSON.stringify(payload));
      } catch (err) {
        console.error("Erreur envoi WS tournoi :", err);
      }
    }
  }
}

export default fp(async function Chat(fastify: FastifyInstance) {

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

  // Récupère la liste des IDs bloqués par un utilisateur
  async function getBlockedIds(blockerId: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      fastify.db.all(
        "SELECT blockedId FROM blocks WHERE blockerId = ?",
        [blockerId],
        (err, rows: { blockedId: number }[]) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.blockedId));
        }
      );
    });
  }

  // Récupère la liste des utilisateurs qui ont bloqué un utilisateur spécifique
  async function getBlockers(blockedId: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      fastify.db.all(
        "SELECT blockerId FROM blocks WHERE blockedId = ?",
        [blockedId],
        (err, rows: { blockerId: number }[]) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.blockerId));
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
  async function broadcastUsers() {
    const snapshot = await clientsLock.acquire(() => [...clients]);
    const allUsers = snapshot.map(c => ({ id: c.id, name: c.name }));

    for (const client of snapshot) {
      if (client.socket.readyState !== 1) continue;

      try {
        const blockedIds = await getBlockedIds(client.id);

        const usersForThisClient = allUsers.map(user => ({
          ...user,
          blocked: blockedIds.includes(user.id),
        }));

        sendToClient(client, { type: "users", users: usersForThisClient });

      } catch (err) {
        fastify.log.error(`Erreur broadcastUsers pour ${client.name}:`, err);
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
      console.log("l'id dans le back : ", decoded.id);
      console.log("le name dans le back : ", decoded.name);

      const client: Client = { id: decoded.id, name: decoded.name, socket };

      clientsLock.acquire(() => {
        clients.push(client);
      }).then(() => {
        fastify.log.info(`✅ ${client.name} connecté (${clients.length} clients)`);
        broadcastUsers();
      });

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

            fastify.db.run(
              "INSERT INTO messages (fromId, toId, text, date) VALUES (?, ?, ?, ?)",
              [msg.from, msg.to, msg.text, msg.date]
            );

            const snapshot = await clientsLock.acquire(() => [...clients]);

            if (msg.to) {
              // Message privé
              const targets = snapshot.filter(c => c.id === msg.to);
              for (const t of targets) {
                if (!(await isBlocked(t.id, client.id))) {
                  sendToClient(t, { type: "private", ...msg });
                }
              }
              sendToClient(client, { type: "private", ...msg });
            } else {
              // Message global
              // Optimisation: Récupérer tous ceux qui m'ont bloqué en une seule requête
              const blockers = await getBlockers(client.id);

              for (const c of snapshot) {
                if (blockers.includes(c.id)) continue;
                sendToClient(c, { type: "global", ...msg });
              }
            }
          }

          if (data.type === "block") {
            fastify.db.run(
              "INSERT OR IGNORE INTO blocks (blockerId, blockedId) VALUES (?, ?)",
              [client.id, data.userId],
              (err) => {
                if (err) return fastify.log.error("Erreur DB block:", err);
                sendToClient(client, { type: "info", message: `Utilisateur ${data.name} bloqué` });
                // Rediffuser la liste des utilisateurs pour que le statut "bloqué" soit à jour
                broadcastUsers();
              }
            );
          }

          if (data.type === "unblock") {
            fastify.db.run(
              "DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?",
              [client.id, data.userId],
              (err) => { // Ajout du callback
                if (err) return fastify.log.error("Erreur DB unblock:", err);
                sendToClient(client, { type: "info", message: `Utilisateur ${data.name} débloqué` });
                // Rediffuser la liste des utilisateurs
                broadcastUsers();
              }
            );
          }
        } catch (err) {
          fastify.log.error("Erreur message WS :", err);
        }
      });

      socket.on("close", async () => {
        await clientsLock.acquire(() => {
          const index = clients.findIndex(c => c.socket === socket);
          if (index !== -1) {
            const [removedClient] = clients.splice(index, 1);
            fastify.log.info(`❌ ${removedClient.name} déconnecté (${clients.length} restants)`);
          } else {
            fastify.log.info(`❌ Client inconnu déconnecté`);
          }
        });
        broadcastUsers();
      });
    } catch (err) {
      fastify.log.error("JWT invalide :", err);
      socket.close();
    }
  });
});

