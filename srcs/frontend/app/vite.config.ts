import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// determine le chemin vers shared selon l'environnement (Docker ou local)
function getSharedPath() {
	// Dans Docker, le volume est monte sur /usr/shared
	const dockerPath = "/usr/shared";
	try {
		if (
			fs.existsSync(dockerPath) &&
			fs.existsSync(path.join(dockerPath, "bombparty", "types.ts"))
		) {
			return dockerPath;
		}
	} catch (e) {
		// ignore errors
	}
	// En local, le chemin relatif depuis srcs/frontend/app vers srcs/shared
	return path.resolve(__dirname, "../../shared");
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		checker({
			typescript: {
				tsconfigPath: "tsconfig.app.json",
			},
		}),
	],
	resolve: {
		alias: {
			"@shared": getSharedPath(),
		},
	},
	server: {
		proxy: {
			"/bombparty/ws": {
				target: "ws://localhost:3001",
				ws: true,
				changeOrigin: true,
			},
		},
	},
});
