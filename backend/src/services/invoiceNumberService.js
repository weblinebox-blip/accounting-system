const pool = require('../config/db');

function toLatinSlug(text) {
  // حذف فاصله و کاراکترهای غیرمجاز، نگه‌داشتن حروف/اعداد فارسی و لاتین
  return String(text || '').trim().replace(/\s+/g, '').slice(0, 20);
}

function dateToCompact(dateStr) {
  // dateStr به فرمت YYYY-MM-DD (میلادی، ذخیره‌شده در دیتابیس) -> بدون خط تیره
  return String(dateStr).replace(/-/g, '');
}

function randomDigits(len) {
  let result = '';
  for (let i = 0; i < len; i++) result += Math.floor(Math.random() * 10);
  return result;
}

/**
 * شماره فاکتور خرید: {نام تامین‌کننده}{تاریخ بدون اسلش}{۵ رقم رندوم}
 * با بررسی یکتا بودن در دیتابیس
 */
async function generatePurchaseInvoiceNumber(supplierName, purchaseDate) {
  const namePart = toLatinSlug(supplierName);
  const datePart = dateToCompact(purchaseDate);

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${namePart}${datePart}${randomDigits(5)}`;
    const { rows } = await pool.query(
      'SELECT 1 FROM purchase_invoices WHERE invoice_number = $1',
      [candidate]
    );
    if (rows.length === 0) return candidate;
  }
  throw new Error('امکان تولید شماره فاکتور یکتا وجود نداشت، دوباره تلاش کنید.');
}

/**
 * تولید یک عدد ۵ رقمی رندوم یکتا برای هر جدول/ستون دلخواه
 * جداول مجاز: sales_invoices | expenses | return_invoices
 */
async function generateUnique5DigitNumber(tableName, columnName = 'invoice_number') {
  const allowedTables = ['sales_invoices', 'expenses', 'return_invoices'];
  if (!allowedTables.includes(tableName)) {
    throw new Error('نام جدول مجاز نیست.');
  }
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = randomDigits(5);
    const { rows } = await pool.query(
      `SELECT 1 FROM ${tableName} WHERE ${columnName} = $1`,
      [candidate]
    );
    if (rows.length === 0) return candidate;
  }
  throw new Error('امکان تولید عدد یکتا وجود نداشت، دوباره تلاش کنید.');
}

module.exports = {
  generatePurchaseInvoiceNumber,
  generateUnique5DigitNumber,
};
