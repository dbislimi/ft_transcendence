import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// determine le chemin vers shared selon l'environnement (Docker ou local)
function getSharedPath() {
  const dockerPath = '/usr/shared'
  try {
    if (fs.existsSync(dockerPath) && fs.existsSync(path.join(dockerPath, 'bombparty', 'types.ts'))) {
      return dockerPath
    }
  } catch (e) {
    // ignore errors
  }
  // En local le chemin relatif depuis srcs/frontend/app vers srcs/shared
  return path.resolve(__dirname, '../../shared')
}

function getHttpsOptions() {
  // Try Docker path first, then local path
  const dockerCertPath = '/usr/certs/cert.pem';
  const dockerKeyPath = '/usr/certs/key.pem';
  const localCertPath = path.resolve(__dirname, '../../certs/cert.pem');
  const localKeyPath = path.resolve(__dirname, '../../certs/key.pem');

  try {
    // Check Docker paths first
    if (fs.existsSync(dockerCertPath) && fs.existsSync(dockerKeyPath)) {
      console.log('Using HTTPS certificates from Docker path');
      return {
        key: fs.readFileSync(dockerKeyPath),
        cert: fs.readFileSync(dockerCertPath)
      };
    }
    // Fallback to local paths
    if (fs.existsSync(localCertPath) && fs.existsSync(localKeyPath)) {
      console.log('Using HTTPS certificates from local path');
      return {
        key: fs.readFileSync(localKeyPath),
        cert: fs.readFileSync(localCertPath)
      };
    }
  } catch (e) {
    console.warn('HTTPS certificates not found, falling back to HTTP', e);
  }
  return undefined;
}

const HOSTNAME = process.env.VITE_HOSTNAME || 'localhost';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@shared': getSharedPath()
    }
  },
  build: {
    // Disable source maps in dev to reduce noise
    sourcemap: false,
  },
  server: {
    https: getHttpsOptions(),
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'wss',
      path: '/hmr',
      clientPort: 8443,
    },
    proxy: {
      '/bombparty/ws': {
        target: `wss://${fs.existsSync('/usr/shared') ? 'back' : 'localhost'}:3001`,
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/game': {
        target: `wss://${fs.existsSync('/usr/shared') ? 'back' : 'localhost'}:3001`,
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/chat': {
        target: `wss://${fs.existsSync('/usr/shared') ? 'back' : 'localhost'}:3001`,
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/ws-friends': {
        target: `wss://${fs.existsSync('/usr/shared') ? 'back' : 'localhost'}:3001`,
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: `https://${fs.existsSync('/usr/shared') ? 'back' : 'localhost'}:3001`,
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: `wss://${fs.existsSync('/usr/shared') ? 'back' : 'localhost'}:3001`,
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
