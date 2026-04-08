/**
 * Sling scheduling API client.
 * Docs: https://api.getsling.com
 *
 * Auth: Authorization header with the API token (no "Bearer" prefix per Sling docs).
 * Base URL: https://api.getsling.com/v1
 *
 * Getting a token: log into app.getsling.com → Account (top-right) → API → Generate token
 * You also need your Org ID (visible in the URL: app.getsling.com/org/{SLING_ORG_ID}/...)
 * And a Group ID to target (the channel/group that should receive alerts).
 *
 * SIMULATION MODE: when SLING_API_TOKEN is not set, messages are logged server-side
 * and returned in the API response so you can confirm the integration path works.
 */
const https = require('https');

const BASE = 'https://api.getsling.com/v1';

function isConfigured() {
  return !!(process.env.SLING_API_TOKEN && process.env.SLING_ORG_ID && process.env.SLING_GROUP_ID);
}

function getHeaders() {
  return {
    'Authorization': process.env.SLING_API_TOKEN,
    'Content-Type': 'application/json',
  };
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(`${BASE}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        ...getHeaders(),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch {
          if (res.statusCode < 400) resolve({});
          else reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Send a message to a Sling group/channel.
 * Falls back to simulation log when not configured.
 */
async function sendMessage(text, groupId) {
  if (!isConfigured()) {
    const simMsg = `[SLING SIMULATION] ${text}`;
    console.log(simMsg);
    return { simulated: true, message: text };
  }

  const gid = groupId || process.env.SLING_GROUP_ID;
  const orgId = process.env.SLING_ORG_ID;

  return request('POST', `/${orgId}/newsfeed`, {
    text,
    groupIds: [parseInt(gid)],
  });
}

/**
 * Fetch today's scheduled shifts from Sling.
 * Falls back to empty array in simulation mode.
 */
async function fetchTodayShifts() {
  if (!isConfigured()) {
    return { simulated: true, shifts: [] };
  }

  const orgId = process.env.SLING_ORG_ID;
  const now = new Date();
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  const to   = new Date(now); to.setHours(23, 59, 59, 999);

  const qs = new URLSearchParams({
    'dates[from]': from.toISOString(),
    'dates[to]':   to.toISOString(),
  });

  return request('GET', `/${orgId}/shifts?${qs}`);
}

/**
 * Send a low-stock alert via Sling (or simulate it).
 */
async function sendLowStockAlert(itemName, remaining, unit, supplier) {
  const msg = `⚠️ LOW STOCK: ${itemName} is down to ${remaining} ${unit}. Reorder from ${supplier} ASAP.`;
  return sendMessage(msg);
}

module.exports = { sendMessage, fetchTodayShifts, sendLowStockAlert, isConfigured };
