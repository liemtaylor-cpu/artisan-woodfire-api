const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');

const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/recipes
router.get('/', h(async (req, res) => {
  await ensureLoaded();
  res.json(store.recipes);
}));

// PUT /api/recipes/:id — update a recipe
router.put('/:id', h(async (req, res) => {
  await ensureLoaded();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'id must be a number' });
  const idx = store.recipes.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
  const { name, price, icon, sku, ingredients } = req.body;
  if (name        !== undefined) store.recipes[idx].name        = name;
  if (price       !== undefined) store.recipes[idx].price       = parseFloat(price);
  if (icon        !== undefined) store.recipes[idx].icon        = icon;
  if (sku         !== undefined) store.recipes[idx].sku         = sku;
  if (ingredients !== undefined) store.recipes[idx].ingredients = ingredients;
  await persist('recipes');
  res.json(store.recipes[idx]);
}));

// POST /api/recipes — add a new recipe
router.post('/', h(async (req, res) => {
  await ensureLoaded();
  const { name, price, icon, sku, ingredients } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
  const id = Math.max(...store.recipes.map(r => r.id), 0) + 1;
  const recipe = { id, name, price: parseFloat(price), icon: icon || '🍕', sku: sku || '', ingredients: ingredients || [] };
  store.recipes.push(recipe);
  await persist('recipes');
  res.status(201).json(recipe);
}));

// DELETE /api/recipes/:id — remove a recipe
router.delete('/:id', h(async (req, res) => {
  await ensureLoaded();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'id must be a number' });
  const idx = store.recipes.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
  store.recipes.splice(idx, 1);
  await persist('recipes');
  res.json({ deleted: true });
}));

module.exports = router;
