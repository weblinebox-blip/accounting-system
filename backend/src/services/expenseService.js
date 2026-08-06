const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { generateUnique5DigitNumber } = require('./invoiceNumberService');

const ALLOWED_CATEGORIES = [
  'اجاره', 'حقوق', 'قبوض', 'هزینه پست', 'حمل‌ونقل داخلی',
  'تبلیغات و سایت', 'هزینه های جاری', 'هزینه حمل چین تا دبی/ایران',
  'هزینه لنج', 'هزینه جنوب تا شمال', 'هزینه گمرک', 'سایر موارد',
];

async function createExpense(payload) {
  const { expense_date, amount, category, description, receipt_image_path } = payload;

  if (!expense_date || !amount || !category) {
    throw new Error('تاریخ، مبلغ و دسته‌بندی هزینه الزامی است.');
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error('دسته‌بندی هزینه نامعتبر است.');
  }

  const expenseNumber = await generateUnique5DigitNumber('expenses', 'expense_number');

  const { rows } = await pool.query(
    `INSERT INTO expenses (expense_number, expense_date, amount, category, description, receipt_image_path)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [expenseNumber, expense_date, amount, category, description || null, receipt_image_path || null]
  );
  return rows[0];
}

async function listExpenses({ search, from, to, category, sortBy = 'expense_date', sortDir = 'DESC', page = 1, pageSize = 20 }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(expense_number ILIKE $${idx} OR description ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (from) {
    conditions.push(`expense_date >= $${idx}`);
    values.push(from);
    idx++;
  }
  if (to) {
    conditions.push(`expense_date <= $${idx}`);
    values.push(to);
    idx++;
  }
  if (category) {
    conditions.push(`category = $${idx}`);
    values.push(category);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = ['expense_date', 'expense_number', 'amount', 'category'];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'expense_date';
  const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(pageSize);

  const dataQuery = `
    SELECT * FROM expenses
    ${whereClause}
    ORDER BY ${sortColumn} ${direction}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const countQuery = `SELECT COUNT(*) FROM expenses ${whereClause}`;

  const dataValues = [...values, pageSize, offset];
  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataValues),
    pool.query(countQuery, values),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    pageSize: Number(pageSize),
  };
}

async function getExpenseById(id) {
  const { rows } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
  return rows[0] || null;
}

async function updateExpense(id, payload) {
  const existing = await getExpenseById(id);
  if (!existing) throw new Error('هزینه یافت نشد.');

  const { expense_date, amount, category, description, receipt_image_path } = payload;
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    throw new Error('دسته‌بندی هزینه نامعتبر است.');
  }

  // اگر عکس جدید آپلود شده و عکس قبلی وجود داشت، فایل قبلی را پاک کن
  if (receipt_image_path && existing.receipt_image_path && receipt_image_path !== existing.receipt_image_path) {
    const oldPath = path.join(__dirname, '../../', existing.receipt_image_path.replace(/^\/uploads\//, 'src/uploads/'));
    fs.unlink(oldPath, () => {});
  }

  const { rows } = await pool.query(
    `UPDATE expenses SET
       expense_date = $1, amount = $2, category = $3, description = $4, receipt_image_path = $5
     WHERE id = $6
     RETURNING *`,
    [
      expense_date || existing.expense_date,
      amount !== undefined ? amount : existing.amount,
      category || existing.category,
      description !== undefined ? description : existing.description,
      receipt_image_path || existing.receipt_image_path,
      id,
    ]
  );
  return rows[0];
}

async function deleteExpense(id) {
  const existing = await getExpenseById(id);
  if (!existing) throw new Error('هزینه یافت نشد.');

  if (existing.receipt_image_path) {
    const oldPath = path.join(__dirname, '../../', existing.receipt_image_path.replace(/^\/uploads\//, 'src/uploads/'));
    fs.unlink(oldPath, () => {});
  }
  await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
}

module.exports = {
  ALLOWED_CATEGORIES,
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
