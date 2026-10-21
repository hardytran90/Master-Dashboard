import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly instead of silently moving to another port
    // Dev only: mimic the Vercel rewrite so /coding/ is served on the same origin
    // (→ same localStorage → one login). Run `npm run dev` in apps/coding too.
    proxy: {
      '/coding': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        ws: true,
        // Coding dev server not running → explain instead of a bare 500
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res || res.headersSent || typeof res.writeHead !== 'function') return;
            res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Coding Tracker dev server is not running</h1>' +
              '<p>Start it with <code>npm run dev</code> in <code>apps/coding</code> ' +
              '(port 5174), or run <code>npm run dev</code> at the repo root to start api + web + coding together.</p>' +
              '<p><a href="/">Back to dashboard</a></p>');
          });
        },
      },
    },
  },
})
