const express = require('express');
const router = express.Router();
const { STAFF, TODAY_SHIFTS } = require('../data/seed');

router.get('/', (req, res) => {
  res.json({ staff: STAFF, shifts: TODAY_SHIFTS });
});

module.exports = router;
