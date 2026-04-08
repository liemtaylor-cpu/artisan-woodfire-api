/**
 * Shift4 API client.
 * Docs: https://dev.shift4.com/docs/api
 *
 * Auth: HTTP Basic — username = API key, password = empty string.
 * Base URL: https://api.shift4.com
 */
const https = require('https');

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

function getAuthHeader() {
  const key = process.env.SHIFT4_API_KEY;
  if (!key) return null;
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const auth = getAuthHeader();
    if (!auth) return reject(new Error('SHIFT4_API_KEY not configured'));

    const url = new URL(`${BASE}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': auth,
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
 * Pull today's charges from Shift4 and return sales grouped by SKU → recipe.
 * Returns array like: [{ recipeId, qty }]
 */
async function fetchTodaySales() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const createdGte = Math.floor(startOfDay.getTime() / 1000);

  // Paginate through all today's charges
  const sales = {};
  let startingAfter = null;
  let hasMore = true;

  while (hasMore) {
    const qs = new URLSearchParams({
      limit: '100',
      'created[gte]': createdGte,
    });
    if (startingAfter) qs.set('starting_after', startingAfter);

    const result = await httpGet(`/charges?${qs}`);
    const charges = result.list || result.data || [];

    for (const charge of charges) {
      // Shift4 line items may be in charge.details or charge.lineItems
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

  return Object.entries(sales).map(([recipeId, qty]) => ({
    recipeId: parseInt(recipeId),
    qty,
  }));
}

module.exports = { fetchTodaySales, SKU_MAP };
