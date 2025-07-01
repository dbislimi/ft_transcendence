import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import gameController from "./plugins/gameController.ts";
//  Gestion des chemins de fichiers avec ES modules
import path from "path";
import { fileURLToPath } from "url";

// Import des modules serveur et sécurité
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken"; // compatible avec ESM/TypeScript

const fastify = Fastify({
	logger: {
		transport: {
			target: "pino-pretty",
		},
	},
});

fastify.register(websocket);
fastify.register(gameController, { prefix: "/game" });

const JWT_SECRET = "super_secret_key"; // À stocker dans un fichier .env pour plus de sécurité

// Récupère le dossier courant (utile pour importer la DB)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// import de la base de données SQLite
const db = (await import(path.join(__dirname, "..", "index.js"))).default;

// Création de l'app Fastify

// Autorise les requêtes depuis le frontend (CORS)
await fastify.register(cors, {
	origin: "http://localhost:5173", // ton app React
});

// Route de test
fastify.get("/", async () => {
	return { hello: "from docker" };
});

// Enregistrement d'un nouvel utilisateur
fastify.post("/register", async (request, reply) => {
	const { name, email, password } = request.body as {
		name: string;
		email: string;
		password: string;
	};

	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!emailRegex.test(email)) {
		return reply.code(400).send({ error: "Email invalide" });
	}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);

		db.run(
			"INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
			[name, email, hashedPassword],
			function (err: any) {
				if (err) {
					return reply
						.code(500)
						.send({ error: "Erreur enregistrement utilisateur" });
				}
				return reply.send({ success: true, id: this.lastID });
			}
		);
	} catch {
		return reply.code(500).send({ error: "Erreur serveur" });
	}
});

// Connexion utilisateur + génération du JWT
fastify.post("/login", async (request, reply) => {
	const { email, password } = request.body as {
		email: string;
		password: string;
	};

	db.get(
		"SELECT * FROM users WHERE email = ?",
		[email],
		async (err: any, user: any) => {
			if (err) {
				return reply.code(500).send({ error: "Erreur serveur" });
			}

			if (!user) {
				return reply
					.code(401)
					.send({ error: "Utilisateur non trouvé" });
			}

			const isPasswordValid = await bcrypt.compare(
				password,
				user.password
			);
			if (!isPasswordValid) {
				return reply.code(401).send({ error: "Mot de passe invalide" });
			}

			const token = jwt.sign(
				{ id: user.id, name: user.name },
				JWT_SECRET,
				{ expiresIn: "2h" }
			);

			return reply.send({ success: true, token, name: user.name });
		}
	);
});

// Route protégée de test
fastify.get("/profile", async (request, reply) => {
	try {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({ error: "Token manquant" });
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, JWT_SECRET) as {
			id: number;
			name: string;
		};

		return reply.send({ message: `Bonjour ${decoded.name}` });
	} catch {
		return reply.code(401).send({ error: "Token invalide ou expiré" });
	}
});

// Route pour récupérer les infos utilisateur
fastify.get("/me", async (request, reply) => {
	try {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return reply.code(401).send({ error: "Token manquant" });
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

		db.get(
			"SELECT id, name, email, twoFAEnabled FROM users WHERE id = ?",
			[decoded.id],
			(err, user) => {
				if (err || !user) {
					return reply
						.code(404)
						.send({ error: "Utilisateur introuvable" });
				}

				return reply.send(user);
			}
		);
	} catch {
		return reply.code(401).send({ error: "Token invalide ou expiré" });
	}
});

// Lancement du serveur
fastify.listen({ port: 3000, host: "0.0.0.0" });
