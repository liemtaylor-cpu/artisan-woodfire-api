/**
 * Vercel KV persistence layer.
 * Gracefully falls back to in-memory if KV is not configured.
 * All store mutations should call persist(key) after changing data.
 */
const store = require('../data/store');

let kv = null;
function getKv() {
  if (kv) return kv;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    kv = require('@vercel/kv').kv;
    return kv;
  } catch {
    return null;
  }
}

// Singleton init promise — prevents race conditions on concurrent cold-start requests
let initPromise = null;

async function ensureLoaded() {
  if (initPromise) return initPromise;
  initPromise = _load();
  return initPromise;
}

async function _load() {
  const client = getKv();
  if (!client) return;

  try {
    const [inventory, orders, sales, duties, competencies, settings, txLog] = await Promise.all([
      client.get('inventory'),
      client.get('orders'),
      client.get('sales'),
      client.get('duties'),
      client.get('competencies'),
      client.get('settings'),
      client.get('txLog'),
    ]);
    if (inventory)    store.inventory    = inventory;
    if (orders)       store.orders       = orders;
    if (sales)        store.sales        = sales;
    if (duties)       store.duties       = duties;
    if (competencies) store.competencies = competencies;
    if (settings)     store.settings     = settings;
    if (txLog)        store.txLog        = txLog;
  } catch (e) {
    console.error('[persistence] KV load failed:', e.message);
  }
}

async function persist(key) {
  const client = getKv();
  if (!client) return;
  try {
    await client.set(key, store[key]);
  } catch (e) {
    console.error(`[persistence] KV write failed for "${key}":`, e.message);
  }
}

module.exports = { ensureLoaded, persist };
