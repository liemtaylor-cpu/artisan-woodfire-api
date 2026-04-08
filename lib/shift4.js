/**
 * Shift4 API client.
 * Docs: https://dev.shift4.com/docs/api
 *
 * Auth: HTTP Basic — username = API key, password = empty string.
 * Base URL: https://api.shift4.com  (same URL for test and live — key prefix determines mode)
 *
 * Test keys: sign up at https://dev.shift4.com → Dashboard → API Keys → "Test mode"
 * Test keys look like: [test_prefix]_[alphanumeric string] — found in your Shift4 dashboard
 *
 * SIMULATION MODE: when SHIFT4_API_KEY is not set, returns realistic fake data
 * so the app works end-to-end without credentials.
 */
const https = require('https');
const { RECIPES } = require('../data/seed');

const BASE = 'https://api.shift4.com';

// Map Shift4 SKUs / product codes to internal recipe IDs
const SKU_MAP = {
  'PIZZA-MARGHERITA':  1,
  'PIZZA-SAUSAGE':     2,
  'PIZZA-PROSCIUTTO':  3,
  'PIZZA-TRUFFLE':     4,
  'PIZZA-BURRATA':     5,
  'PIZZA-PANCETTA':    6,
};

function isConfigured() {
  return !!process.env.SHIFT4_API_KEY;
}

function getAuthHeader() {
  return 'Basic ' + Buffer.from(`${process.env.SHIFT4_API_KEY}:`).toString('base64');
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          reject(new Error('Invalid JSON from Shift4'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetch a single charge by ID from Shift4.
 * Used by the webhook handler to get full charge details (including line items)
 * after receiving a minimal webhook event — per Shift4's recommended approach.
 */
async function fetchCharge(chargeId) {
  return httpGet(`/charges/${chargeId}`);
}

/**
 * Simulate today's sales — used when SHIFT4_API_KEY is not configured.
 * Returns plausible quantities based on time of day.
 */
function simulateTodaySales() {
  const hour = new Date().getHours();
  // Scale activity: quiet morning, ramp before service, peak dinner
  const multiplier = hour < 11 ? 0.1 : hour < 15 ? 0.4 : hour < 17 ? 0.7 : 1.0;

  return Object.entries(SKU_MAP).map(([, recipeId]) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    const base = recipe ? Math.round(recipe.id * 3.5 + 5) : 5;
    const qty = Math.max(1, Math.round(base * multiplier * (0.8 + Math.random() * 0.4)));
    return { recipeId, qty };
  });
}

/**
 * Pull today's charges from Shift4 and return sales grouped by recipe.
 * Falls back to simulation when not configured.
 */
async function fetchTodaySales() {
  if (!isConfigured()) {
    const simSales = simulateTodaySales();
    return { sales: simSales, simulated: true };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const createdGte = Math.floor(startOfDay.getTime() / 1000);

  const sales = {};
  let startingAfter = null;
  let hasMore = true;

  while (hasMore) {
    const qs = new URLSearchParams({ limit: '100', 'created[gte]': createdGte });
    if (startingAfter) qs.set('starting_after', startingAfter);

    const result = await httpGet(`/charges?${qs}`);
    const charges = result.list || result.data || [];

    for (const charge of charges) {
      const items = charge.details?.lineItems || charge.lineItems || [];
      for (const item of items) {
        const sku = item.sku || item.productCode || item.name;
        const recipeId = SKU_MAP[sku];
        if (!recipeId) continue;
        sales[recipeId] = (sales[recipeId] || 0) + (item.quantity || 1);
      }
      startingAfter = charge.id;
    }
    hasMore = result.hasMore || (result.list?.length === 100);
  }

  return {
    sales: Object.entries(sales).map(([recipeId, qty]) => ({ recipeId: parseInt(recipeId), qty })),
    simulated: false,
  };
}

/**
 * Generate a realistic fake POS order for webhook testing.
 * Returns a payload shaped exactly like a real Shift4 webhook body.
 */
function generateTestOrder() {
  const skus = Object.keys(SKU_MAP);
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const items = [];
  const used = new Set();

  for (let i = 0; i < itemCount; i++) {
    let sku;
    do { sku = skus[Math.floor(Math.random() * skus.length)]; } while (used.has(sku));
    used.add(sku);
    items.push({ sku, qty: Math.floor(Math.random() * 3) + 1 });
  }

  return {
    event: 'order.completed',
    transaction_id: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    location_id: 'LOC-CHI-001',
    order: { items },
  };
}

module.exports = { fetchTodaySales, fetchCharge, generateTestOrder, SKU_MAP, isConfigured };
