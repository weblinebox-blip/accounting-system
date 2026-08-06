// اجرای فایل schema.sql روی دیتابیس
// استفاده: npm run migrate
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, '../../../docs/database-schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ اسکیمای دیتابیس با موفقیت اجرا شد.');
  } catch (err) {
    console.error('❌ خطا در اجرای اسکیما:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
