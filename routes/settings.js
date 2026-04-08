const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');

router.get('/', async (req, res) => {
  await ensureLoaded();
  res.json(store.settings);
});

router.post('/', async (req, res) => {
  await ensureLoaded();
  const { storeName, phone, address, taxRate, notifications } = req.body;

  // Merge into existing settings (never overwrite API keys from frontend)
  store.settings = {
    ...store.settings,
    ...(storeName      !== undefined && { storeName }),
    ...(phone          !== undefined && { phone }),
    ...(address        !== undefined && { address }),
    ...(taxRate        !== undefined && { taxRate: parseFloat(taxRate) || store.settings.taxRate }),
    ...(notifications  !== undefined && { notifications }),
  };

  await persist('settings');
  res.json(store.settings);
});

module.exports = router;
