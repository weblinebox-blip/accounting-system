const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// دامنه‌های مجاز برای درخواست به بک‌اند (فرانت روی Vercel + توسعه محلی)
const allowedOrigins = [
  'https://accounting-system-rosy.vercel.app',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      try {
        if (/\.vercel\.app$/.test(new URL(origin).hostname)) {
          return callback(null, true);
        }
      } catch (e) {
        // origin نامعتبر بود، رد میشه
      }
      return callback(new Error('اجازه دسترسی از این دامنه وجود ندارد (CORS)'));
    },
  })
);
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
