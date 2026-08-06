const XLSX = require('xlsx');

// تبدیل ارقام فارسی/عربی به انگلیسی — بعضی فایل‌های اکسل فارسی مقادیر عددی را
// با ارقام فارسی ذخیره می‌کنند که Number() آن را نمی‌شناسد.
const DIGIT_MAP = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};
function toEnglishDigits(value) {
  if (value === null || value === undefined) return value;
  return String(value).replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch);
}

/**
 * تشخیص فیلد استاندارد از روی نام هدر ستون اکسل، بر اساس کلمه‌کلیدی
 * (نه تطبیق دقیق متن) تا با اختلاف جزئی در عنوان ستون‌ها هم کار کند.
 * مثال: هم «قیمت خرید یوان» و هم «قیمت یوان» به unit_price_yuan نگاشت می‌شوند.
 */
function detectField(rawHeader) {
  const header = String(rawHeader || '').trim();
  if (!header) return null;

  // ستون‌های «جمع ...» از فایل نادیده گرفته می‌شوند چون سرور خودش محاسبه می‌کند
  if (header.includes('جمع')) return null;

  if (header.includes('کد') || /^product[_ ]?code$/i.test(header)) return 'product_code';
  if (header.includes('تعداد') || /^quantity$/i.test(header)) return 'quantity';
  if (header.includes('یوان') || /yuan/i.test(header)) return 'unit_price_yuan';
  if ((header.includes('تومان') || /toman/i.test(header)) && !header.includes('حمل')) return 'unit_price_toman';

  return null;
}

/**
 * خواندن بافر فایل اکسل و استخراج ردیف‌های اقلام خرید
 * خروجی: { items: [...], errors: [...] }
 */
function parsePurchaseExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const items = [];
  const errors = [];

  rows.forEach((row, index) => {
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = detectField(key);
      if (normalizedKey) mapped[normalizedKey] = value;
    }

    const rowNum = index + 2; // با احتساب سطر هدر
    if (!mapped.product_code) {
      errors.push(`سطر ${rowNum}: کد محصول خالی است.`);
      return;
    }

    mapped.quantity = toEnglishDigits(mapped.quantity);
    mapped.unit_price_yuan = toEnglishDigits(mapped.unit_price_yuan);
    mapped.unit_price_toman = toEnglishDigits(mapped.unit_price_toman);

    if (!mapped.quantity || isNaN(Number(mapped.quantity)) || Number(mapped.quantity) <= 0) {
      errors.push(`سطر ${rowNum}: تعداد نامعتبر است.`);
      return;
    }

    items.push({
      product_code: String(mapped.product_code).trim(),
      quantity: Number(mapped.quantity),
      unit_price_yuan: Number(mapped.unit_price_yuan) || 0,
      unit_price_toman: Number(mapped.unit_price_toman) || 0,
    });
  });

  return { items, errors };
}

// حذف فاصله، نیم‌فاصله (ZWNJ) و کاراکترهای جهت‌دهنده از متن، برای تطبیق مقاوم‌تر
// چون بعضی فایل‌های اکسل فارسی بین کلمات هدر از نیم‌فاصله به‌جای فاصله‌ی معمولی استفاده می‌کنند.
function normalizeHeaderText(value) {
  return String(value || '')
    .replace(/[\s\u200c\u200e\u200f]/g, '')
    .trim();
}

/**
 * تلاش برای پیدا کردن جدول کالاها و پارس آن در یک شیت مشخص.
 * خروجی: { found: boolean, items, errors, invoiceDate }
 */
function tryParseSalesSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const items = [];
  const errors = [];

  let headerRowIndex = -1;
  const colIndex = {};
  let fallbackRowIndex = -1;
  let fallbackRowLabelCol = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const found = {};
    row.forEach((cell, ci) => {
      const text = normalizeHeaderText(cell);
      if (!text) return;
      if (text.includes('شرحکالا') || text.includes('کدمحصول')) found.product_code = ci;
      else if (text === 'تعداد') found.quantity = ci;
      else if (text.includes('قیمتواحد') || text.includes('قیمتفروش') || text.includes('قیمتتومان')) found.unit_price_toman = ci;
      else if (text === 'ردیف') found.rowLabel = ci;
    });
    if (found.product_code !== undefined && found.quantity !== undefined && found.unit_price_toman !== undefined) {
      headerRowIndex = i;
      Object.assign(colIndex, found);
      break;
    }
    if (found.rowLabel !== undefined && fallbackRowIndex === -1) {
      fallbackRowIndex = i;
      fallbackRowLabelCol = found.rowLabel;
    }
  }

  // اگر تشخیص دقیق ناموفق بود، بر اساس ترتیب معمول ستون‌ها نسبت به «ردیف» حدس می‌زنیم:
  // ردیف | شرح کالا | تعداد | قیمت واحد | قیمت کل
  if (headerRowIndex === -1 && fallbackRowIndex !== -1) {
    headerRowIndex = fallbackRowIndex;
    colIndex.rowLabel = fallbackRowLabelCol;
    colIndex.product_code = fallbackRowLabelCol + 1;
    colIndex.quantity = fallbackRowLabelCol + 2;
    colIndex.unit_price_toman = fallbackRowLabelCol + 3;
  }

  if (headerRowIndex === -1) {
    return { found: false, items, errors, invoiceDate: null };
  }

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];

    // رسیدن به سطر «جمع» یعنی پایان ردیف‌های کالا (صرف‌نظر از تعداد آیتم‌های فاکتور)
    if (colIndex.rowLabel !== undefined && normalizeHeaderText(row[colIndex.rowLabel]).includes('جمع')) break;
    if (row.some((c) => normalizeHeaderText(c).includes('جمع'))) break;

    const productCode = String(row[colIndex.product_code] ?? '').trim();
    if (!productCode) continue; // ردیف خالی (مثل ردیف‌های آماده‌ی خالی در انتهای فاکتور)، نادیده گرفته می‌شود

    const quantityRaw = toEnglishDigits(row[colIndex.quantity]);
    const priceRaw = toEnglishDigits(row[colIndex.unit_price_toman]);

    if (!quantityRaw || isNaN(Number(quantityRaw)) || Number(quantityRaw) <= 0) {
      errors.push(`سطر ${i + 1}: تعداد نامعتبر برای «${productCode}».`);
      continue;
    }

    items.push({
      product_code: productCode,
      quantity: Number(quantityRaw),
      unit_price_toman: Number(priceRaw) || 0,
    });
  }

  // خواندن تاریخ فاکتور از سلول E3 (طبق فرمت اعلام‌شده)
  let invoiceDate = null;
  const dateCell = sheet['E3'];
  if (dateCell && dateCell.v !== undefined && dateCell.v !== '') {
    invoiceDate = toEnglishDigits(String(dateCell.v).trim());
  }

  // خواندن نام خریدار از سلول B3 (پیشوند «آقای»/«خانم» در صورت وجود حذف می‌شود)
  let customerName = null;
  const customerCell = sheet['B3'];
  if (customerCell && customerCell.v !== undefined && customerCell.v !== '') {
    customerName = String(customerCell.v)
      .trim()
      .replace(/^(آقای|خانم)[\s\u200c]*/, '')
      .trim();
  }

  return { found: true, items, errors, invoiceDate, customerName };
}

/**
 * خواندن بافر فایل اکسل فروش با فرمت واقعی فاکتورهای کاربر:
 * ستون‌ها: ردیف | شرح کالا | تعداد | قیمت واحد | قیمت کل
 * چون بعضی فایل‌ها چند شیت دارند (مثلاً یک شیت نمودار قبل از شیت اصلی داده‌ها)،
 * همه‌ی شیت‌های فایل را به ترتیب امتحان می‌کند تا شیتی که واقعاً جدول کالاها را دارد پیدا شود.
 * خروجی: { items: [...], errors: [...], invoiceDate: string|null }
 */
function parseSalesExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue; // شیت‌های نموداری معمولاً اینجا داده‌ای ندارند
    const result = tryParseSalesSheet(sheet);
    if (result.found) {
      const { found, ...rest } = result;
      return rest;
    }
  }

  return {
    items: [],
    errors: ['سطر هدر جدول (شرح کالا، تعداد، قیمت واحد) در هیچ‌کدام از شیت‌های فایل پیدا نشد.'],
    invoiceDate: null,
    customerName: null,
  };
}

/**
 * تولید فایل اکسل خروجی برای یک فاکتور فروش با فرمت اختصاصی
 */
function buildSalesInvoiceExcel(invoice) {
  const header = [
    ['شماره فاکتور', invoice.invoice_number],
    ['تاریخ فروش', invoice.sales_date],
    ['نام خریدار', invoice.customer_name],
    ['درصد تخفیف', invoice.discount_percent],
    ['مبلغ تخفیف', invoice.discount_amount],
    ['هزینه حمل', invoice.shipping_cost],
    ['وضعیت تسویه', invoice.settlement_status],
    [],
    ['کد محصول', 'تعداد', 'قیمت فروش تومان', 'جمع قیمت فروش'],
  ];
  const itemRows = invoice.items.map((it) => [
    it.product_code, it.quantity, it.unit_price_toman, it.total_price,
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([...header, ...itemRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'فاکتور فروش');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { parsePurchaseExcel, parseSalesExcel, buildSalesInvoiceExcel };
