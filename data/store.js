const { INVENTORY, RECIPES, TODAY_SALES, ORDERS } = require('./seed');

// Shared mutable store — all routes reference this
const store = {
  inventory:    INVENTORY.map(i => ({ ...i })),
  orders:       ORDERS.map(o => ({ ...o })),
  sales:        TODAY_SALES.map(s => ({ ...s })),
  transactions: new Set(),     // processed transaction_ids (idempotency)
  txLog:        [],            // full transaction records
  duties:       {},
};

module.exports = store;
