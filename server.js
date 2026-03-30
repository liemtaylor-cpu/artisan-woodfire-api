const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(express.json());

app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/staff',     require('./routes/staff'));
app.use('/api/duties',    require('./routes/duties'));
app.use('/api/webhook',   require('./routes/webhook'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
