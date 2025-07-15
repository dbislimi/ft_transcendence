import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import util from "util";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RegisterLogin = async (fastify: FastifyInstance) => {
  const db = fastify.db;
  fastify.post("/register", async (request, reply) => {
    const { name, email, password } = request.body as {
      name: string;
      email: string;
      password: string;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: "Email invalide" });
    }

    const dbGet = util.promisify(db.get.bind(db));

    try {
      const existingUser = dbGet("SELECT * FROM users WHERE email = ?", [email]);

      if (existingUser) {
        return reply.code(409).send({ error: "Email déjà utilisé" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const lastID = await new Promise<number>((resolve, reject) => {
        db.run(
          "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
          [name, email, hashedPassword],
          function (err: any) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      //const token = jwt.sign({ id: lastID, name, email }, JWT_SECRET, { a perte faut le generer dans login pour moi
      //  expiresIn: "2h",
      //});

      return reply.send({ success: true, token, name });
    } catch (err) {
      console.error("Erreur lors de l'inscription :", err);
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    const dbGet = util.promisify(db.get.bind(db));
    const dbRun = util.promisify(db.run.bind(db));

    try {
      const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

      if (!user) {
        return reply.code(401).send({ error: 'Utilisateur non trouvé' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Mot de passe invalide' });
      }

      if (user.twoFAEnabled) {
        const otp = GenerateOtp();
        await dbRun('UPDATE users SET twoFAOtp = ? WHERE id = ?', [otp, user.id]);
        await Send2faMail(user.email, otp);
        return reply.send({ success: true, requires2FA: true, userId: user.id });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      return reply.send({ success: true, token, name: user.name });
    } catch (error) {
      console.error("Erreur serveur dans /login :", error);
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });
}

export default fp(RegisterLogin);