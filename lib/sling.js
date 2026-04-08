/**
 * Sling scheduling API client.
 * Docs: https://api.getsling.com
 *
 * Auth: Authorization header with the API token (no "Bearer" prefix per Sling docs).
 * Base URL: https://api.getsling.com/v1
 */
const https = require('https');

const BASE = 'https://api.getsling.com/v1';

function getHeaders() {
  const token = process.env.SLING_API_TOKEN;
  if (!token) return null;
  return {
    'Authorization': token,
    'Content-Type': 'application/json',
  };
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const headers = getHeaders();
    if (!headers) return reject(new Error('SLING_API_TOKEN not configured'));

    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(`${BASE}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        ...headers,
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
          // Some Sling endpoints return empty body on success
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
 * @param {string} text  - Message text
 * @param {string} [groupId] - Sling group ID (defaults to env var SLING_GROUP_ID)
 */
async function sendMessage(text, groupId) {
  const gid = groupId || process.env.SLING_GROUP_ID;
  if (!gid) throw new Error('SLING_GROUP_ID not configured');
  const orgId = process.env.SLING_ORG_ID;
  if (!orgId) throw new Error('SLING_ORG_ID not configured');

  return request('POST', `/${orgId}/newsfeed`, {
    text,
    groupIds: [parseInt(gid)],
  });
}

/**
 * Fetch today's scheduled shifts from Sling.
 * Returns array of shift objects with user info.
 */
async function fetchTodayShifts() {
  const orgId = process.env.SLING_ORG_ID;
  if (!orgId) throw new Error('SLING_ORG_ID not configured');

  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const qs = new URLSearchParams({
    'dates[from]': from.toISOString(),
    'dates[to]': to.toISOString(),
  });

  return request('GET', `/${orgId}/shifts?${qs}`);
}

/**
 * Send a low-stock alert via Sling.
 */
async function sendLowStockAlert(itemName, remaining, unit, supplier) {
  const msg = `⚠️ LOW STOCK: ${itemName} is down to ${remaining} ${unit}. Reorder from ${supplier} ASAP.`;
  return sendMessage(msg);
}

module.exports = { sendMessage, fetchTodayShifts, sendLowStockAlert };
