import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getHttpsOptions() {
	const dockerCertPath = "/usr/certs/cert.pem";
	const dockerKeyPath = "/usr/certs/key.pem";
	const localCertPath = path.resolve(__dirname, "../../certs/cert.pem");
	const localKeyPath = path.resolve(__dirname, "../../certs/key.pem");

	try {
		if (fs.existsSync(dockerCertPath) && fs.existsSync(dockerKeyPath)) {
			console.log("Using HTTPS certificates from Docker path");
			return {
				key: fs.readFileSync(dockerKeyPath),
				cert: fs.readFileSync(dockerCertPath),
			};
		}
		if (fs.existsSync(localCertPath) && fs.existsSync(localKeyPath)) {
			console.log("Using HTTPS certificates from local path");
			return {
				key: fs.readFileSync(localKeyPath),
				cert: fs.readFileSync(localCertPath),
			};
		}
	} catch (e) {
		console.warn("HTTPS certificates not found, falling back to HTTP", e);
	}
	return undefined;
}

const HOSTNAME = process.env.VITE_HOSTNAME || "localhost";
const isDocker = fs.existsSync("/.dockerenv");
const backendHost = isDocker ? "back" : "localhost";

// https://vite.dev/config/
export default defineConfig({
	plugins: [tailwindcss(), react()],
	build: {
		sourcemap: false,
	},
	server: {
		https: getHttpsOptions(),
		host: "0.0.0.0",
		port: 5173,
		strictPort: true,
		open: false,
		cors: true,
		hmr: {
			protocol: "wss",
			path: "/hmr",
			clientPort: 8443,
			host: HOSTNAME,
		},
		proxy: {
			"/bombparty/ws": {
				target: `wss://${backendHost}:3001`,
				ws: true,
				changeOrigin: true,
				secure: false,
			},
			"/game": {
				target: `wss://${backendHost}:3001`,
				ws: true,
				changeOrigin: true,
				secure: false,
			},
			"/chat": {
				target: `wss://${backendHost}:3001`,
				ws: true,
				changeOrigin: true,
				secure: false,
			},
			"/ws-friends": {
				target: `wss://${backendHost}:3001`,
				ws: true,
				changeOrigin: true,
				secure: false,
			},
			"/api": {
				target: `https://${backendHost}:3001`,
				changeOrigin: true,
				secure: false,
			},
			"/socket.io": {
				target: `wss://${backendHost}:3001`,
				ws: true,
				changeOrigin: true,
				secure: false,
			},
		},
	},
});
