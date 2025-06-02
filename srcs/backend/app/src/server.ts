import Fastify from "fastify";
import cors from "@fastify/cors";

const fastify = Fastify({
	logger: {
		transport: {
			target: "pino-pretty",
		},
	},
});

await fastify.register(cors, {
	origin: "http://localhost:5173",
});

fastify.post("/api/users", {
	handler: async (
		request: FastifyRequest<{
			Body: {
				name: string;
				password: string;
			};
		}>,
		reply: FastifyReply
	) => {
		const body = request.body;
		console.log({ body });
		return reply.code(201).send(body);
	},
});

async function main() {
	try {
		await fastify.listen({ port: 3000, host: "0.0.0.0" });
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

main();
