const { INVENTORY, RECIPES, TODAY_SALES, ORDERS } = require('./seed');

// Shared mutable store — all routes reference this object.
// On cold start data comes from seed; on warm start it's already in memory.
// Persistence layer (lib/persistence.js) loads from Vercel KV on first request
// and saves back after every mutation.
const store = {
  inventory:    INVENTORY.map(i => ({ ...i })),
  orders:       ORDERS.map(o => ({ ...o })),
  sales:        TODAY_SALES.map(s => ({ ...s })),
  transactions: new Set(),     // processed transaction_ids (idempotency)
  txLog:        [],            // full transaction records
  duties:       {},
  competencies: {},
  settings: {
    storeName:     'Artisan Woodfire Kitchen',
    phone:         '(773) 555-0190',
    address:       '1842 N Milwaukee Ave, Chicago IL 60647',
    taxRate:       10.25,
    notifications: {
      lowStock:       true,
      posSync:        true,
      dailySummary:   false,
      orderReminders: true,
    },
  },
};

module.exports = store;
