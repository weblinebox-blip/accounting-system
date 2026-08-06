const pool = require('../config/db');

const DEFAULT_FROM = '1970-01-01';
const DEFAULT_TO = '2100-01-01';
const PERIOD_MAP = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };

function range(from, to) {
  return { from: from || DEFAULT_FROM, to: to || DEFAULT_TO };
}

function periodUnit(period) {
  return PERIOD_MAP[period] || 'day';
}

// ---------------- سود و زیان ----------------
async function getProfitLoss({ from, to }) {
  const { from: f, to: t } = range(from, to);

  const [salesRes, purchaseRes, expenseRes, lossRes] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(final_total),0) AS total FROM sales_invoices WHERE sales_date BETWEEN $1 AND $2', [f, t]),
    pool.query('SELECT COALESCE(SUM(total_toman),0) AS total FROM purchase_invoices WHERE purchase_date BETWEEN $1 AND $2', [f, t]),
    pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date BETWEEN $1 AND $2', [f, t]),
    pool.query(
      `SELECT COALESCE(SUM(ri.loss_amount),0) AS total
       FROM return_items ri JOIN return_invoices r ON ri.return_invoice_id = r.id
       WHERE r.return_date BETWEEN $1 AND $2`,
      [f, t]
    ),
  ]);

  const totalSales = Number(salesRes.rows[0].total);
  const totalPurchases = Number(purchaseRes.rows[0].total);
  const totalExpenses = Number(expenseRes.rows[0].total);
  const totalLoss = Number(lossRes.rows[0].total);
  const netProfit = totalSales - totalPurchases - totalExpenses - totalLoss;

  return { totalSales, totalPurchases, totalExpenses, totalLoss, netProfit };
}

// ---------------- مجموع فروش با فیلتر دوره ----------------
async function getSalesTotals({ period, from, to }) {
  const { from: f, to: t } = range(from, to);
  const unit = periodUnit(period);
  const { rows } = await pool.query(
    `SELECT date_trunc($1, sales_date) AS period, COALESCE(SUM(final_total),0) AS total, COUNT(*) AS invoice_count
     FROM sales_invoices
     WHERE sales_date BETWEEN $2 AND $3
     GROUP BY period ORDER BY period`,
    [unit, f, t]
  );
  return rows.map((r) => ({ period: r.period, total: Number(r.total), invoiceCount: Number(r.invoice_count) }));
}

// ---------------- مجموع خرید (یوان و تومان) ----------------
async function getPurchaseTotals({ from, to }) {
  const { from: f, to: t } = range(from, to);
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(total_yuan),0) AS total_yuan, COALESCE(SUM(total_toman),0) AS total_toman, COUNT(*) AS invoice_count
     FROM purchase_invoices WHERE purchase_date BETWEEN $1 AND $2`,
    [f, t]
  );
  const r = rows[0];
  return { totalYuan: Number(r.total_yuan), totalToman: Number(r.total_toman), invoiceCount: Number(r.invoice_count) };
}

// ---------------- مجموع هزینه‌ها (به تفکیک دسته‌بندی) ----------------
async function getExpensesTotal({ from, to }) {
  const { from: f, to: t } = range(from, to);
  const [totalRes, byCategoryRes] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date BETWEEN $1 AND $2', [f, t]),
    pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS total
       FROM expenses WHERE expense_date BETWEEN $1 AND $2
       GROUP BY category ORDER BY total DESC`,
      [f, t]
    ),
  ]);
  return {
    total: Number(totalRes.rows[0].total),
    byCategory: byCategoryRes.rows.map((r) => ({ category: r.category, total: Number(r.total) })),
  };
}

// ---------------- مانده حساب مشتریان (فاکتورهای فروش تسویه‌نشده) ----------------
async function getCustomerBalance() {
  const { rows } = await pool.query(
    `SELECT customer_name, COALESCE(SUM(final_total),0) AS balance, COUNT(*) AS unsettled_count
     FROM sales_invoices WHERE settlement_status = 'نشده'
     GROUP BY customer_name ORDER BY balance DESC`
  );
  return rows.map((r) => ({ customerName: r.customer_name, balance: Number(r.balance), unsettledCount: Number(r.unsettled_count) }));
}

// ---------------- مانده حساب تامین‌کنندگان (فاکتورهای خرید تسویه‌نشده) ----------------
async function getSupplierBalance() {
  const { rows } = await pool.query(
    `SELECT supplier_name, COALESCE(SUM(total_toman),0) AS balance, COUNT(*) AS unsettled_count
     FROM purchase_invoices WHERE settlement_status = 'نشده'
     GROUP BY supplier_name ORDER BY balance DESC`
  );
  return rows.map((r) => ({ supplierName: r.supplier_name, balance: Number(r.balance), unsettledCount: Number(r.unsettled_count) }));
}

// ---------------- کالاهای پرفروش / کم‌فروش ----------------
async function getTopProducts({ limit = 10, from, to }) {
  const { from: f, to: t } = range(from, to);
  const { rows } = await pool.query(
    `SELECT si.product_code, COALESCE(SUM(si.quantity),0) AS total_quantity, COALESCE(SUM(si.total_price),0) AS total_revenue
     FROM sales_items si JOIN sales_invoices s ON si.sales_invoice_id = s.id
     WHERE s.sales_date BETWEEN $1 AND $2
     GROUP BY si.product_code ORDER BY total_quantity DESC LIMIT $3`,
    [f, t, limit]
  );
  return rows.map((r) => ({ productCode: r.product_code, totalQuantity: Number(r.total_quantity), totalRevenue: Number(r.total_revenue) }));
}

async function getBottomProducts({ limit = 10, from, to }) {
  const { from: f, to: t } = range(from, to);
  const { rows } = await pool.query(
    `SELECT si.product_code, COALESCE(SUM(si.quantity),0) AS total_quantity, COALESCE(SUM(si.total_price),0) AS total_revenue
     FROM sales_items si JOIN sales_invoices s ON si.sales_invoice_id = s.id
     WHERE s.sales_date BETWEEN $1 AND $2
     GROUP BY si.product_code ORDER BY total_quantity ASC LIMIT $3`,
    [f, t, limit]
  );
  return rows.map((r) => ({ productCode: r.product_code, totalQuantity: Number(r.total_quantity), totalRevenue: Number(r.total_revenue) }));
}

// ---------------- موجودی کالا (به همراه تعداد خرید/فروش و جمع فروش) ----------------
async function getInventory() {
  const { rows } = await pool.query(
    `SELECT p.product_code,
            p.current_stock,
            COALESCE(pi.total_purchased, 0) AS total_purchased,
            COALESCE(si.total_sold_qty, 0) AS total_sold_qty,
            COALESCE(si.total_sold_amount, 0) AS total_sold_amount
     FROM products p
     LEFT JOIN (
       SELECT product_code, SUM(quantity) AS total_purchased
       FROM purchase_items GROUP BY product_code
     ) pi ON pi.product_code = p.product_code
     LEFT JOIN (
       SELECT product_code, SUM(quantity) AS total_sold_qty, SUM(total_price) AS total_sold_amount
       FROM sales_items GROUP BY product_code
     ) si ON si.product_code = p.product_code
     ORDER BY p.product_code`
  );
  return rows.map((r) => ({
    productCode: r.product_code,
    currentStock: Number(r.current_stock),
    totalPurchased: Number(r.total_purchased),
    totalSoldQty: Number(r.total_sold_qty),
    totalSoldAmount: Number(r.total_sold_amount),
  }));
}

// ---------------- نام‌های یکتای مشتریان (برای جستجوی زنده) ----------------
async function getCustomerNames() {
  const { rows } = await pool.query(
    'SELECT DISTINCT customer_name FROM sales_invoices ORDER BY customer_name'
  );
  return rows.map((r) => r.customer_name);
}

// ---------------- جستجوی زنده‌ی شماره فاکتور فروش ----------------
async function searchInvoiceNumbers(q) {
  if (!q || !String(q).trim()) return [];
  const { rows } = await pool.query(
    `SELECT invoice_number, customer_name FROM sales_invoices
     WHERE invoice_number ILIKE $1
     ORDER BY sales_date DESC LIMIT 8`,
    [`%${String(q).trim()}%`]
  );
  return rows.map((r) => ({ invoiceNumber: r.invoice_number, customerName: r.customer_name }));
}

// ---------------- نمودارها (سری زمانی) ----------------
async function getSalesChart({ period, from, to }) {
  return getSalesTotals({ period, from, to });
}

async function getExpensesChart({ period, from, to }) {
  const { from: f, to: t } = range(from, to);
  const unit = periodUnit(period);
  const { rows } = await pool.query(
    `SELECT date_trunc($1, expense_date) AS period, COALESCE(SUM(amount),0) AS total
     FROM expenses WHERE expense_date BETWEEN $2 AND $3
     GROUP BY period ORDER BY period`,
    [unit, f, t]
  );
  return rows.map((r) => ({ period: r.period, total: Number(r.total) }));
}

async function getProfitChart({ period, from, to }) {
  const { from: f, to: t } = range(from, to);
  const unit = periodUnit(period);

  const [salesRows, purchaseRows, expenseRows, lossRows] = await Promise.all([
    pool.query(
      `SELECT date_trunc($1, sales_date) AS period, COALESCE(SUM(final_total),0) AS total
       FROM sales_invoices WHERE sales_date BETWEEN $2 AND $3 GROUP BY period`,
      [unit, f, t]
    ),
    pool.query(
      `SELECT date_trunc($1, purchase_date) AS period, COALESCE(SUM(total_toman),0) AS total
       FROM purchase_invoices WHERE purchase_date BETWEEN $2 AND $3 GROUP BY period`,
      [unit, f, t]
    ),
    pool.query(
      `SELECT date_trunc($1, expense_date) AS period, COALESCE(SUM(amount),0) AS total
       FROM expenses WHERE expense_date BETWEEN $2 AND $3 GROUP BY period`,
      [unit, f, t]
    ),
    pool.query(
      `SELECT date_trunc($1, r.return_date) AS period, COALESCE(SUM(ri.loss_amount),0) AS total
       FROM return_items ri JOIN return_invoices r ON ri.return_invoice_id = r.id
       WHERE r.return_date BETWEEN $2 AND $3 GROUP BY period`,
      [unit, f, t]
    ),
  ]);

  const map = new Map();
  const addTo = (rows, key) => {
    rows.forEach((r) => {
      const k = r.period.toISOString();
      if (!map.has(k)) map.set(k, { period: r.period, sales: 0, purchases: 0, expenses: 0, loss: 0 });
      map.get(k)[key] = Number(r.total);
    });
  };
  addTo(salesRows.rows, 'sales');
  addTo(purchaseRows.rows, 'purchases');
  addTo(expenseRows.rows, 'expenses');
  addTo(lossRows.rows, 'loss');

  return Array.from(map.values())
    .sort((a, b) => a.period - b.period)
    .map((r) => ({ ...r, profit: r.sales - r.purchases - r.expenses - r.loss }));
}

// ---------------- گزارش فروش بر اساس مشتری ----------------
async function getSalesByCustomer({ from, to }) {
  const { from: f, to: t } = range(from, to);
  const { rows } = await pool.query(
    `SELECT customer_name, COUNT(*) AS invoice_count, COALESCE(SUM(final_total),0) AS total
     FROM sales_invoices WHERE sales_date BETWEEN $1 AND $2
     GROUP BY customer_name ORDER BY total DESC`,
    [f, t]
  );
  return rows.map((r) => ({ customerName: r.customer_name, invoiceCount: Number(r.invoice_count), total: Number(r.total) }));
}

// ---------------- آخرین فروش هر محصول ----------------
async function getLastSalePerProduct() {
  const { rows } = await pool.query(
    `SELECT si.product_code, MAX(s.sales_date) AS last_sale_date
     FROM sales_items si JOIN sales_invoices s ON si.sales_invoice_id = s.id
     GROUP BY si.product_code ORDER BY last_sale_date DESC`
  );
  return rows.map((r) => ({ productCode: r.product_code, lastSaleDate: r.last_sale_date }));
}

// ---------------- فاکتورهای تسویه‌نشده مشتریان ----------------
async function getUnsettledInvoices() {
  const { rows } = await pool.query(
    `SELECT invoice_number, sales_date, customer_name, final_total
     FROM sales_invoices WHERE settlement_status = 'نشده'
     ORDER BY sales_date DESC`
  );
  return rows;
}

// ---------------- طول عمر هر مشتری ----------------
async function getCustomerLifetime() {
  const { rows } = await pool.query(
    `SELECT customer_name,
            MIN(sales_date) AS first_purchase,
            MAX(sales_date) AS last_purchase,
            COUNT(*) AS invoice_count,
            COALESCE(SUM(final_total),0) AS total_spent
     FROM sales_invoices
     GROUP BY customer_name
     ORDER BY total_spent DESC`
  );
  return rows.map((r) => {
    const first = new Date(r.first_purchase);
    const last = new Date(r.last_purchase);
    const lifetimeDays = Math.round((last - first) / (1000 * 60 * 60 * 24));
    return {
      customerName: r.customer_name,
      firstPurchase: r.first_purchase,
      lastPurchase: r.last_purchase,
      invoiceCount: Number(r.invoice_count),
      totalSpent: Number(r.total_spent),
      lifetimeDays,
    };
  });
}

module.exports = {
  getProfitLoss,
  getSalesTotals,
  getPurchaseTotals,
  getExpensesTotal,
  getCustomerBalance,
  getSupplierBalance,
  getTopProducts,
  getBottomProducts,
  getInventory,
  getCustomerNames,
  searchInvoiceNumbers,
  getSalesChart,
  getExpensesChart,
  getProfitChart,
  getSalesByCustomer,
  getLastSalePerProduct,
  getUnsettledInvoices,
  getCustomerLifetime,
};
