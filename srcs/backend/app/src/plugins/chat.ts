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

  // --- NOUVELLE FONCTION ---
  // Récupère la liste des IDs bloqués PAR un utilisateur
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

  // Envoi vers un client spécifique
  function sendToClient(client: Client, data: any) {
    try {
      if (client.socket.readyState === 1) { // 1 = OPEN
        client.socket.send(JSON.stringify(data));
      }
    } catch (err) {
      fastify.log.error("Erreur envoi WS:", err);
    }
  }

  // --- FONCTION MISE À JOUR ---
  // Envoie la liste des utilisateurs connectés à tous (maintenant personnalisée)
  async function broadcastUsers() {
    // 1. Obtenir la liste de base de tous les utilisateurs connectés
    const allUsers = clients.map(c => ({ id: c.id, name: c.name }));

    // 2. Envoyer une liste personnalisée à chaque client
    for (const client of clients) {
      if (client.socket.readyState !== 1) continue; // 1 = OPEN

      try {
        // 3. Récupérer les IDs que CE client a bloqués
        const blockedIds = await getBlockedIds(client.id);

        // 4. Créer la liste personnalisée pour CE client
        const usersForThisClient = allUsers.map(user => ({
          ...user,
          // Marquer comme bloqué si l'ID de l'utilisateur est dans la liste des bloqués
          blocked: blockedIds.includes(user.id),
        }));

        // 5. Envoyer la liste personnalisée
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
      clients.push(client);

      fastify.log.info(`✅ ${client.name} connecté (${clients.length} clients)`);

      // Envoie la liste des utilisateurs à tous (maintenant personnalisée)
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
              [client.id, data.userId],
              (err) => { // Ajout du callback
                if (err) return fastify.log.error("Erreur DB block:", err);
                sendToClient(client, { type: "info", message: `Utilisateur ${data.userId} bloqué` });
                // --- AJOUT IMPORTANT ---
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
                sendToClient(client, { type: "info", message: `Utilisateur ${data.userId} débloqué` });
                // --- AJOUT IMPORTANT ---
                // Rediffuser la liste des utilisateurs
                broadcastUsers();
              }
            );
          }
        } catch (err) {
          fastify.log.error("Erreur message WS :", err);
        }
      });

      socket.on("close", () => {
        const index = clients.findIndex(c => c.socket === socket);
        if (index !== -1) {
          const [removedClient] = clients.splice(index, 1);
          fastify.log.info(`❌ ${removedClient.name} déconnecté (${clients.length} restants)`);
        } else {
            fastify.log.info(`❌ Client inconnu déconnecté`);
        }
        broadcastUsers();
      });
    } catch (err) {
      fastify.log.error("JWT invalide :", err);
      socket.close();
    }
  });
});