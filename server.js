const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { requireApiKey } = require('./middleware/auth');
const { ensureLoaded }  = require('./lib/persistence');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────
// FRONTEND_URL must be set in production. Falls back to localhost for dev only.
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / curl / Postman (no origin header) in dev
    if (!origin || origin === allowedOrigin) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
}));

// ─── Body parsing — captures raw bytes for webhook HMAC in one pass ───────
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));

// ─── Rate limiting ─────────────────────────────────────────────────────────
// General: 200 requests per 15 min per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down' },
}));

// Auth endpoints: 10 attempts per 15 min (brute-force protection)
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts — try again later' },
}));

// Webhook: 120 per minute (POS can be chatty during service)
app.use('/api/webhook/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Webhook rate limit exceeded' },
}));

// ─── Warm up KV on first request ──────────────────────────────────────────
app.use(async (req, res, next) => {
  try { await ensureLoaded(); } catch { /* non-fatal */ }
  next();
});

// ─── Public routes (no API key required) ───────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/webhook', require('./routes/webhook')); // has own HMAC auth

// ─── Protected routes (require X-API-Key header in production) ────────────
app.use('/api/', requireApiKey);
app.use('/api/recipes',      require('./routes/recipes'));
app.use('/api/forecasting', require('./routes/forecasting'));
app.use('/api/inventory',    require('./routes/inventory'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/sales',        require('./routes/sales'));
app.use('/api/staff',        require('./routes/staff'));
app.use('/api/duties',       require('./routes/duties'));
app.use('/api/competencies', require('./routes/competencies'));
app.use('/api/settings',     require('./routes/settings'));

app.get('/api/health', (req, res) => {
  const shift4 = require('./lib/shift4');
  const sling  = require('./lib/sling');
  res.json({
    ok: true,
    kvConfigured:      !!(process.env.REDIS_URL),
    shift4Configured:  shift4.isConfigured(),
    shift4Simulated:   !shift4.isConfigured(),
    slingConfigured:   sling.isConfigured(),
    slingSimulated:    !sling.isConfigured(),
    authEnabled:       !!(process.env.API_SECRET_KEY),
  });
});

// ─── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[server error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Local dev
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
