import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleDocumentExtraction } from './src/server/documentExtraction.js';
import { handleVehicleIntelligence } from './src/server/vehicleIntelligence.js';

/**
 * Modular Vite dev server middleware for AI document extraction and vehicle intelligence.
 * Delegates to the shared server implementations used in both local dev and Vercel serverless.
 */
function aiDocumentExtractionPlugin(env) {
  return {
    name: 'ai-document-extraction',
    configureServer(server) {
      server.middlewares.use('/api/extract-document', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body || '{}');
            const apiKey =
              env.GEMINI_API_KEY ||
              env.GOOGLE_API_KEY ||
              process.env.GEMINI_API_KEY ||
              process.env.GOOGLE_API_KEY;

            const result = await handleDocumentExtraction({
              ...parsedBody,
              apiKey
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[AI Extract] Server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      server.middlewares.use('/api/vehicle-intelligence', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { query, vehicleContext } = JSON.parse(body || '{}');
            const apiKey =
              env.GEMINI_API_KEY ||
              env.GOOGLE_API_KEY ||
              process.env.GEMINI_API_KEY ||
              process.env.GOOGLE_API_KEY;

            const result = await handleVehicleIntelligence({
              query,
              vehicleContext,
              apiKey
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[Vehicle Intelligence] Server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                success: false,
                fallbackRequired: true,
                error: err.message
              })
            );
          }
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), aiDocumentExtractionPlugin(env)],
    server: {
      port: 3000,
      open: false
    },
    assetsInclude: ['**/*.glb', '**/*.gltf']
  };
});
