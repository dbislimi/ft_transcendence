import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import jwt from 'jsonwebtoken';
import path from 'path';
import bcrypt from 'bcrypt';



const db = (await import(path.join(__dirname, '..', 'index.js'))).default;

const JWT_SECRET = process.env.JWT_SECRET!;



// Enregistrement d'un nouvel utilisateur
fastify.post('/register', async (request, reply) => {
    const { name, email, password } = request.body as {
      name: string;
      email: string;
      password: string;
    };
  
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Email invalide' });
    }
  
    try {
      const existingUser = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
  
      if (existingUser) {
        return reply.code(409).send({ error: "Email déjà utilisé" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const lastID = await new Promise<number>((resolve, reject) => {
        db.run(
          'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
          [name, email, hashedPassword],
          function (err: any) {
            if (err) 
              reject(err);
            else 
              resolve(this.lastID);
          }
        );
      });
      const token = jwt.sign(
        { id: lastID, name, email},
        JWT_SECRET,
        { expiresIn: '2h' }
      );
      return reply.send({ success: true, token, name });    
    } catch (err) {
      console.error("Erreur lors de l'inscription :", err);
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });
  
  
  
  // Connexion utilisateur + génération du JWT
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };
  
    try {
      const user = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
  
      if (!user) {
        return reply.code(401).send({ error: 'Utilisateur non trouvé' });
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Mot de passe invalide' });
      }
  
      const token = jwt.sign(
        { id: user.id, name: user.name , email},
        JWT_SECRET,
        { expiresIn: '2h' }
      );
  
      return reply.send({ success: true, token, name: user.name });
  
    } catch (err) {
      console.error(err);
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });
  