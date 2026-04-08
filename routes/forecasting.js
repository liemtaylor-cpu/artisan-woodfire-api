const express = require('express');
const router = express.Router();

const USAGE_DATA = {
  weeks: ["Feb 2","Feb 9","Feb 16","Feb 23","Mar 2","Mar 9","Mar 16","Mar 23"],
  items: {
    "00 Flour":               [38,42,35,45,40,48,43,50],
    "Fresh Mozzarella":       [18,22,20,25,19,28,24,30],
    "San Marzano Tomatoes":   [20,24,18,22,26,24,28,25],
    "Italian Sausage":        [12,15,11,16,13,18,14,17],
    "Extra Virgin Olive Oil": [ 5, 6, 5, 7, 6, 8, 7, 8],
  }
};

// GET /api/forecasting/usage
router.get('/usage', (req, res) => {
  res.json(USAGE_DATA);
});

module.exports = router;
