import { handleVehicleIntelligence } from '../src/server/vehicleIntelligence.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body) {
      body = await new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
        });
        req.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
        req.on('error', reject);
      });
    }

    const { query, vehicleContext } = body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    const result = await handleVehicleIntelligence({
      query,
      vehicleContext,
      apiKey
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(result));
  } catch (err) {
    console.error('[API vehicle-intelligence] Error:', err);
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
}
