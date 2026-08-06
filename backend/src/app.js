const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('src/uploads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

// هندلر خطای سراسری
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور' });
});

module.exports = app;
