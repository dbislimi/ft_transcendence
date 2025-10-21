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
        return reply.code(409).send({ exists: true, error: "Email déjà utilisé." });
      }

      const existingDisplayName = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE display_name = ?", [display_name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingDisplayName) {
        return reply.code(409).send({ exists: true, error: "Ce pseudo est déjà utilisé." });
      }

      return reply.send({ exists: false });
    } catch {
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });

  fastify.post("/register", async (request, reply) => {
    const { name, email, password, displayName, avatar } = request.body as {
      name: string;
      email: string;
      password: string;
      displayName: string;
      avatar?: string;
    };

    const nameRegex = /^[A-Z][a-z]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const displayNameRegex = /^[a-zA-Z0-9-]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

    if (!nameRegex.test(name)) {
      return reply.code(400).send({ error: "Le nom doit commencer par une majuscule suivie uniquement de lettres minuscules." });
    }

    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: "Email invalide." });
    }

    if (!displayNameRegex.test(displayName)) {
      return reply.code(400).send({ error: "Le pseudo doit contenir uniquement des lettres, chiffres ou tirets." });
    }

    if (!passwordRegex.test(password)) {
      return reply.code(400).send({
        error: "Le mot de passe doit contenir au moins 6 caractères, avec 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial."
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
        return reply.code(409).send({ error: "Email déjà utilisé." });
      }

      const existingDisplayName = await new Promise<any>((resolve, reject) => {
        db.get("SELECT * FROM users WHERE display_name = ?", [displayName], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingDisplayName) {
        return reply.code(409).send({ error: "Ce pseudo est déjà utilisé." });
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
      console.log("le lastid de  dylan : " + lastID);

      const token = jwt.sign(
        { id: userId, name, email },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      return reply.send({
        success: true,
        token,
        user: {
          id: userId,
          name,
          email,
          display_name: displayName,
          avatar: chosenAvatar
        }
      });
    } catch {
      return reply.send({ success: true, name });
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
      console.log("le user id que j'utilise moi " + user.id);
      if (!user) {
        return reply.code(401).send({ error: "Utilisateur non trouvé." });
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

      return reply.send({ success: true, message: "OTP envoyé", require2fa: true, userId: user.id });
      }

    //console.log("EREN YEAGER");
    const token = jwt.sign(
      { id: user.id, name: user.name, email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );
      /* dylan         user: {
          id: user.id,
          name: user.name,
          email: user.email,
          display_name: user.display_name,
          avatar: user.avatar
        }
          */
      return reply.send({ success: true, token, name: user.name, enable2fa: user.twoFAEnabled === 1 });
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
        return reply.code(404).send({ error: "Utilisateur non trouvé." });
      }

      const { password, twoFAOtp, ...userInfo } = user;
      return reply.send({ user: userInfo });
    } catch {
      return reply.code(500).send({ error: "Erreur serveur" });
    }
  });
});