import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function terminalLoggerPlugin() {
  return {
    name: 'jurnal-saham-terminal-logger',
    configureServer(server) {
      server.middlewares.use('/__jurnal_saham_log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const time = new Date(payload.timestamp || Date.now()).toLocaleTimeString('id-ID');
            const details = payload.details ? ` ${JSON.stringify(payload.details)}` : '';
            console.log(`[app ${time}] ${payload.event || 'log'}${details}`);
          } catch {
            console.log(`[app] ${body}`);
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), terminalLoggerPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
})
