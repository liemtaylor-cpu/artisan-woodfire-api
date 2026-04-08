/**
 * Redis persistence layer using ioredis.
 * Connects via REDIS_URL env var (set by Vercel Redis/Upstash integration).
 * Gracefully falls back to in-memory if REDIS_URL is not configured.
 */
const store = require('../data/store');

let redis = null;

function getRedis() {
  if (redis) return redis;
  if (!process.env.REDIS_URL) return null;
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    redis.on('error', e => console.warn('[redis] connection error:', e.message));
    return redis;
  } catch (e) {
    console.warn('[redis] init failed:', e.message);
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
  const client = getRedis();
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
    if (inventory)    store.inventory    = JSON.parse(inventory);
    if (orders)       store.orders       = JSON.parse(orders);
    if (sales)        store.sales        = JSON.parse(sales);
    if (duties)       store.duties       = JSON.parse(duties);
    if (competencies) store.competencies = JSON.parse(competencies);
    if (settings)     store.settings     = JSON.parse(settings);
    if (txLog) {
      store.txLog = JSON.parse(txLog);
      // Rebuild idempotency Set from persisted txLog so duplicate orders
      // are still rejected after a cold start
      store.transactions = new Set(store.txLog.map(t => t.transaction_id));
    }
  } catch (e) {
    console.error('[persistence] Redis load failed:', e.message);
  }
}

async function persist(key) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(store[key]));
  } catch (e) {
    console.error(`[persistence] Redis write failed for "${key}":`, e.message);
  }
}

module.exports = { ensureLoaded, persist };
