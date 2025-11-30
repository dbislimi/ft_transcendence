import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import bcrypt, { compare } from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import util from "util";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  const db = fastify.db;

  fastify.post("/check-user", async (request, reply) => {
    const { email, display_name } = request.body as {
      email: string;
      display_name: string;
    };

    try {
      const existingEmail = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingEmail) {
        return reply.code(409).send({ exists: true, error: "Email dejà utilise." });
      }

      const existingDisplayName = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE display_name = ?", [display_name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingDisplayName) {
        return reply.code(409).send({ exists: true, error: "Ce pseudo est dejà utilise." });
      }

      return reply.send({ exists: false });
    } catch {
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });

  fastify.post("/register", async (request, reply) => {
    const body = request.body as any;
    // accept both displayName and display_name (frontend variants)
    let { name, email, password, displayName, avatar } = body as {
      name: string;
      email: string;
      password: string;
      displayName?: string;
      avatar?: string;
    };
    if ((!displayName || displayName === "") && body.display_name) {
      displayName = body.display_name;
    }

    const nameRegex = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const displayNameRegex = /^[a-zA-Z0-9_-]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

    if (!name || name.trim() === "") {
      return reply.code(400).send({ error: "Le nom est obligatoire." });
    }

    if (!nameRegex.test(name)) {
      return reply.code(400).send({ error: "Le nom doit commencer par une majuscule suivie uniquement de lettres minuscules." });
    }

    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: "Email invalide." });
    }

    const displayNameStr = displayName ?? "";
    if (!displayNameRegex.test(displayNameStr)) {
      return reply.code(400).send({ error: "Le pseudo doit contenir uniquement des lettres, chiffres ou tirets." });
    }

    if (!passwordRegex.test(password)) {
      return reply.code(400).send({
        error: "Le mot de passe doit contenir au moins 6 caracteres, avec 1 majuscule, 1 minuscule, 1 chiffre et 1 caractere special."
      });
    }

    try {
      const existingUser = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingUser) {
        return reply.code(409).send({ error: "Email dejà utilise." });
      }

      const existingDisplayName = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE display_name = ?", [displayName], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingDisplayName) {
        return reply.code(409).send({ error: "ce pseudo est deja utilise." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const chosenAvatar = avatar && avatar.trim() !== "" ? avatar.trim() : "/avatars/avatar1.png";

      const userId = await new Promise<number>((resolve, reject) => {
        db.run(
          "INSERT INTO users (name, email, password, display_name, avatar, wins, losses, online, twoFAEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, displayName, chosenAvatar, 0, 0, 0, 0],
          function (this: any, err: any) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      const token = jwt.sign(
        { id: userId, email, display_name: displayName },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      return reply.send({
        success: true,
        token,
        user: {
          id: userId,
          email,
          display_name: displayName,
          avatar: chosenAvatar
        }
      });
    } catch (err: any) {
      try {
        const stack = err && err.stack ? err.stack : String(err);
        const body = request && (request.body as any) ? { ...request.body } : {};
        if (body.password) body.password = '***REDACTED***';
        console.error('Error in /register:', stack, 'body:', body);
      } catch (logErr) {
        console.error('Error in /register (failed to log details):', logErr);
      }
      if (process.env.DEBUG_REGISTER === '1') {
        return reply.code(500).send({ error: 'Erreur serveur', details: String(err && err.stack ? err.stack : err) });
      }
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });

  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };
    try {
      const user = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!user) {
        return reply.code(401).send({ error: "Utilisateur non trouve." });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.code(401).send({ error: "Mot de passe invalide." });
      }

      if (user.twoFAEnabled === 1) {
        const otp = fastify.generateOtp();

        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE users SET twoFAOtp = ? WHERE id = ?',
            [otp, user.id],
            (err: any) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        const emailSent = await fastify.send2faEmail(user.email, otp);
        if (!emailSent) {
          return reply.code(500).send({ error: "Erreur lors de l'envoi de l'e-mail" });
        }

        return reply.send({ success: true, message: "OTP envoye", require2fa: true, userId: user.id });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, display_name: user.display_name },
        JWT_SECRET,
        { expiresIn: "2h" }
      );
      return reply.send({ success: true, token, enable2fa: user.twoFAEnabled === 1 });
    } catch (err) {
      console.error(err);
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });

  fastify.get("/user/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const user = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!user) {
        return reply.code(404).send({ error: "Utilisateur non trouve." });
      }

      const { password, twoFAOtp, ...userInfo } = user;
      return reply.send({ user: userInfo });
    } catch {
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });

  fastify.get("/users/:name", async (request, reply) => {
    const { name } = request.params as { name: string };

    try {
      const user = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE display_name = ? OR name = ?", [name, name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!user) {
        return reply.code(404).send({ error: "Utilisateur non trouve." });
      }

      const { password, twoFAOtp, ...userInfo } = user;
      return reply.send({ user: userInfo });
    } catch {
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });
});