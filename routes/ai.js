const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded } = require('../lib/persistence');

const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function buildSystemPrompt(role) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (role === 'employee') {
    return `You are the kitchen assistant for Artisan Woodfire Kitchen, a woodfire pizza restaurant in Chicago. Today is ${today}.

You help kitchen staff with prep work, techniques, and daily tasks. Be practical and concise.

You can help with:
- Kitchen prep: dough, sauces, meatballs, dressings, aioli, hummus, pesto
- Wood fire operation and safety
- Mise en place and food prep
- Understanding menu items and how they're built
- Navigating duties and tasks for the shift

Do NOT discuss or reveal: pay rates, labor costs, sales revenue, financial data, scheduling decisions, or other staff members' personal details.`;
  }

  // Owner / Manager — full live context
  const hidePayRates = role === 'manager';

  const staffLines = store.staff.map(s => {
    const comp = store.competencies[s.id] || {};
    const compStr = Object.keys(comp).length > 0
      ? Object.entries(comp).map(([k, v]) => `${k}:${v}`).join(', ')
      : 'no competency data yet';
    const skills = (s.skills || []).join(', ') || 'none recorded';
    const pay = hidePayRates ? '' : ` | $${s.rate}/hr`;
    return `  - ${s.name} (${s.role}, ${s.status})${pay} | Skills: ${skills} | Competency scores: ${compStr}`;
  }).join('\n');

  const lowStock = store.inventory.filter(i => i.currentStock < i.minStock);
  const lowStockStr = lowStock.length > 0
    ? lowStock.map(i => `${i.name} (have ${i.currentStock}${i.unit}, need min ${i.minStock}${i.unit})`).join(', ')
    : 'none — all items adequately stocked';

  const todayRev = store.sales.reduce((sum, s) => {
    const r = store.recipes.find(r => r.id === s.recipeId);
    return sum + (r?.price || 0) * s.qty;
  }, 0);
  const salesStr = store.sales.length > 0
    ? store.sales.map(s => { const r = store.recipes.find(r => r.id === s.recipeId); return `${r?.name || '?'}: ${s.qty}`; }).join(', ')
    : 'no sales data yet tonight';

  const openOrders = store.orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const ordersStr = openOrders.length > 0
    ? openOrders.map(o => `PO ${o.id} from ${o.supplier} — $${o.total} (${o.status})`).join('\n  ')
    : 'none';

  const menuStr = store.recipes.map(r => `  ${r.icon} ${r.name} — $${r.price} (SKU: ${r.sku})`).join('\n');
  const invValue = store.inventory.reduce((s, i) => s + i.currentStock * i.unitCost, 0).toFixed(2);

  return `You are the AI operations assistant for Artisan Woodfire Kitchen, a woodfire pizza restaurant in Chicago. Today is ${today}.

## Restaurant
- Name: ${store.settings?.storeName || 'Artisan Woodfire Kitchen'}
- Address: ${store.settings?.address || '1842 N Milwaukee Ave, Chicago IL 60647'}

## Staff Roster
${staffLines}

## Competency Station Thresholds (scores 0–100, must meet minimum to work unsupervised)
- Wood Fire / Pit: 60
- Make Section: 60
- Salad Section: 55
- Expo / Expediting: 55
- Pizza / Flatbread: 65
Shifts available: Open, Mid, Close, Off

## Inventory
- Total value: $${invValue}
- Low stock items: ${lowStockStr}

## Tonight's Sales
${salesStr}
Estimated revenue: $${todayRev.toFixed(2)}

## Menu
${menuStr}

## Open Purchase Orders
  ${ordersStr}

## Your Capabilities
- Answer any question about operations, staff, inventory, menu, and sales
- Generate weekly staff schedules — ask for the target week and any unavailability before scheduling. When generating a schedule, present it as a clear day-by-day table showing name, shift time, and assigned station. Make sure each critical station is covered by someone meeting its competency threshold every service day.
- Recommend reorder quantities based on current stock and sales pace
- Analyse margins and suggest optimisations
${hidePayRates ? '\nIMPORTANT: Do not reveal individual hourly pay rates or total labour cost breakdowns.' : ''}`;
}

// POST /api/ai/chat  — streaming SSE
router.post('/chat', h(async (req, res) => {
  await ensureLoaded();

  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: 'AI not configured — add ANTHROPIC_API_KEY to environment variables.' });
  }

  const { messages, role } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  if (messages.length > 60) {
    return res.status(400).json({ error: 'Conversation too long — start a new chat' });
  }

  const clean = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 6000),
  }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: buildSystemPrompt(role),
      messages: clean,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
}));

module.exports = router;
