import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = (await import(path.join(__dirname, '..', 'index.js'))).default;

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: 'http://localhost:5173'
});

fastify.get('/', async () => {
  return { hello: 'from docker' };
});

fastify.post('/register', async (request, reply) => {
  const { name, email, password } = request.body as {
    name: string;
    email: string;
    password: string;
  };

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      function (err: any) {
        if (err) {
          return reply.code(500).send({ error: 'Erreur enregistrement utilisateur' });
        }
        return reply.send({ success: true, id: this.lastID });
      }
    );
  } catch {
    return reply.code(500).send({ error: 'Erreur serveur' });
  }
});

fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body as {
    email: string;
    password: string;
  };

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err: any, user: any) => {
    if (err) {
      return reply.code(500).send({ error: 'Erreur serveur' });
    }

    if (!user) {
      return reply.code(401).send({ error: 'Utilisateur non trouvé' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return reply.code(401).send({ error: 'Mot de passe invalide' });
    }

    return reply.send({ success: true, message: `Bienvenue ${user.name}` });
  });
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
