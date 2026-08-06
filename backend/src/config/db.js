const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase/Neon و اکثر سرویس‌های ابری دیتابیس نیاز به اتصال SSL دارند.
  // برای دیتابیس لوکال (روی خود سیستم) این تنظیم مشکلی ایجاد نمی‌کند.
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('خطای غیرمنتظره در Pool دیتابیس:', err);
});

module.exports = pool;
