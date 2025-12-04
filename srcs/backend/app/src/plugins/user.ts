import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { verifyToken } from '../utils/auth.js';
import bcrypt from "bcrypt";
import { promisify } from "util";

export default fp(async function userPlugin(fastify: FastifyInstance) {
	const dbGet = promisify(fastify.db.get.bind(fastify.db));
	const dbRun = promisify(fastify.db.run.bind(fastify.db));

	fastify.get("/me", async (request, reply) => {
		const decoded = verifyToken(request, reply);
		if (!decoded) {
			return reply
				.code(401)
				.send({ error: "Token invalide ou manquant" });
		}
		await dbRun("UPDATE users SET online = 1 WHERE id = ?", [decoded.id]);
		const user = await dbGet(
			"SELECT id, name, display_name, email, avatar, online, wins, losses FROM users WHERE id = ?",
			[decoded.id]
		);
		if (!user)
			return reply.code(404).send({ error: "Utilisateur introuvable" });
		if (!user.avatar) user.avatar = "/avatars/avatar1.webp";
		return reply.send(user);
	});

	fastify.put("/me", async (request, reply) => {
		const decoded = verifyToken(request, reply);
		if (!decoded) {
			return reply
				.code(401)
				.send({ error: "Token invalide ou manquant" });
		}
		const { email, password, display_name, avatar } = request.body as any;
		const updates: string[] = [];
		const values: any[] = [];

		if (email && email.trim() !== "") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email))
				return reply.code(400).send({ error: "Email invalide" });

			const currentUser = await dbGet(
				"SELECT email FROM users WHERE id = ?",
				[decoded.id]
			);

			if (currentUser && currentUser.email !== email.trim()) {
				const existing = await dbGet(
					"SELECT id FROM users WHERE email = ? AND id != ?",
					[email.trim(), decoded.id]
				);
				if (existing)
					return reply
						.code(409)
						.send({ error: "Email dejà utilise" });
				updates.push("email = ?");
				values.push(email.trim());
				updates.push("twoFAEnabled = 0");
			}
		}
		if (password && password.trim() !== "") {
			const passwordRegex =
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
			if (!passwordRegex.test(password))
				return reply.code(400).send({ error: "Mot de passe invalide" });
			const hashedPassword = await bcrypt.hash(password, 10);
			updates.push("password = ?");
			values.push(hashedPassword);
		}

		if (display_name && display_name.trim() !== "") {
			const displayNameRegex = /^[a-zA-Z0-9-]+$/;
			if (!displayNameRegex.test(display_name))
				return reply.code(400).send({ error: "Pseudo invalide" });
			const existing = await dbGet(
				"SELECT id FROM users WHERE display_name = ? AND id != ?",
				[display_name.trim(), decoded.id]
			);
			if (existing)
				return reply.code(409).send({ error: "Pseudo dejà utilise" });
			updates.push("display_name = ?");
			values.push(display_name.trim());
		}

		if (avatar && avatar.trim() !== "") {
			updates.push("avatar = ?");
			values.push(avatar.trim());
		}

		if (updates.length === 0)
			return reply
				.code(400)
				.send({ error: "Aucune donnee à mettre à jour" });
		values.push(decoded.id);
		await dbRun(
			`UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
			values
		);
		return reply.send({ success: true });
	});

	fastify.post("/logout", async (request, reply) => {
		const decoded = verifyToken(request, reply);
		if (!decoded) {
			try {
				const token =
					(request.body as any)?.token ||
					request.headers.authorization?.split(" ")[1];

				if (token) {
					const jwt = await import("jsonwebtoken");
					const decodedToken = jwt.verify(
						token,
						process.env.JWT_SECRET!
					) as any;

					await dbRun("UPDATE users SET online = 0 WHERE id = ?", [
						decodedToken.id,
					]);

					fastify.db.all(
						"SELECT friend_id FROM friends WHERE user_id = ?",
						[decodedToken.id],
						(err: any, friends: any[]) => {
							if (!err && friends.length > 0) {
								const friendIds = friends.map(
									(f) => f.friend_id
								);
								if (fastify.broadcastFriends) {
									fastify.broadcastFriends(
										{
											type: "status_update",
											userId: decodedToken.id,
											online: false,
										},
										friendIds
									);
								}
							}
						}
					);
				}
			} catch (err) {}

			return reply.send({ success: true });
		}

		await dbRun("UPDATE users SET online = 0 WHERE id = ?", [decoded.id]);

		fastify.db.all(
			"SELECT friend_id FROM friends WHERE user_id = ?",
			[decoded.id],
			(err: any, friends: any[]) => {
				if (!err && friends.length > 0) {
					const friendIds = friends.map((f) => f.friend_id);
					if (fastify.broadcastFriends) {
						fastify.broadcastFriends(
							{
								type: "status_update",
								userId: decoded.id,
								online: false,
							},
							friendIds
						);
					}
				}
			}
		);

		return reply.send({ success: true });
	});
});
