const pool = require('../config/db');
const { generatePurchaseInvoiceNumber } = require('./invoiceNumberService');
const { adjustStock } = require('./inventoryService');

function calcTotals(items) {
  let totalYuan = 0, totalToman = 0;
  for (const it of items) {
    totalYuan += Number(it.quantity) * Number(it.unit_price_yuan);
    totalToman += Number(it.quantity) * Number(it.unit_price_toman);
  }
  return { totalYuan, totalToman };
}

/**
 * ثبت فاکتور خرید جدید (دستی یا از اکسل)
 * payload: { purchase_date, supplier_name, settlement_status, items: [...] }
 */
async function createPurchaseInvoice(payload) {
  const { purchase_date, supplier_name, settlement_status, items } = payload;

  if (!purchase_date || !supplier_name) {
    throw new Error('تاریخ خرید و نام تامین‌کننده الزامی است.');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('حداقل یک قلم کالا باید وارد شود.');
  }

  const invoiceNumber = await generatePurchaseInvoiceNumber(supplier_name, purchase_date);
  const { totalYuan, totalToman } = calcTotals(items);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `INSERT INTO purchase_invoices
         (invoice_number, purchase_date, supplier_name, settlement_status,
          total_yuan, total_toman)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [invoiceNumber, purchase_date, supplier_name, settlement_status || 'نشده',
        totalYuan, totalToman]
    );
    const invoice = invoiceResult.rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO purchase_items
           (purchase_invoice_id, product_code, quantity, unit_price_yuan,
            unit_price_toman)
         VALUES ($1,$2,$3,$4,$5)`,
        [invoice.id, it.product_code, it.quantity, it.unit_price_yuan,
          it.unit_price_toman]
      );

      await adjustStock(client, {
        productCode: it.product_code,
        quantity: Number(it.quantity),
        movementType: 'purchase',
        referenceInvoice: invoiceNumber,
        movementDate: purchase_date,
      });
    }

    await client.query('COMMIT');
    return getPurchaseInvoiceById(invoice.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listPurchaseInvoices({ search, from, to, supplier, sortBy = 'purchase_date', sortDir = 'DESC', page = 1, pageSize = 20 }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(invoice_number ILIKE $${idx} OR supplier_name ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (from) {
    conditions.push(`purchase_date >= $${idx}`);
    values.push(from);
    idx++;
  }
  if (to) {
    conditions.push(`purchase_date <= $${idx}`);
    values.push(to);
    idx++;
  }
  if (supplier) {
    conditions.push(`supplier_name ILIKE $${idx}`);
    values.push(`%${supplier}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = ['purchase_date', 'invoice_number', 'supplier_name', 'total_toman'];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'purchase_date';
  const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(pageSize);

  const dataQuery = `
    SELECT * FROM purchase_invoices
    ${whereClause}
    ORDER BY ${sortColumn} ${direction}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const countQuery = `SELECT COUNT(*) FROM purchase_invoices ${whereClause}`;

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

async function getPurchaseInvoiceById(id) {
  const invoiceResult = await pool.query('SELECT * FROM purchase_invoices WHERE id = $1', [id]);
  if (invoiceResult.rows.length === 0) return null;
  const itemsResult = await pool.query(
    'SELECT * FROM purchase_items WHERE purchase_invoice_id = $1 ORDER BY id',
    [id]
  );
  return { ...invoiceResult.rows[0], items: itemsResult.rows };
}

/**
 * ویرایش فاکتور خرید: موجودی قبلی برگردانده می‌شود، اقلام جدید جایگزین و موجودی دوباره اعمال می‌شود
 */
async function updatePurchaseInvoice(id, payload) {
  const { purchase_date, supplier_name, settlement_status, items } = payload;
  const existing = await getPurchaseInvoiceById(id);
  if (!existing) throw new Error('فاکتور خرید یافت نشد.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // برگرداندن اثر موجودی اقلام قبلی
    for (const oldItem of existing.items) {
      await adjustStock(client, {
        productCode: oldItem.product_code,
        quantity: -Number(oldItem.quantity),
        movementType: 'purchase',
        referenceInvoice: `${existing.invoice_number}-EDIT-REVERT`,
        movementDate: purchase_date || existing.purchase_date,
      });
    }
    await client.query('DELETE FROM purchase_items WHERE purchase_invoice_id = $1', [id]);

    const { totalYuan, totalToman } = calcTotals(items);

    await client.query(
      `UPDATE purchase_invoices SET
         purchase_date = $1, supplier_name = $2, settlement_status = $3,
         total_yuan = $4, total_toman = $5, updated_at = NOW()
       WHERE id = $6`,
      [purchase_date || existing.purchase_date, supplier_name || existing.supplier_name,
        settlement_status || existing.settlement_status, totalYuan, totalToman, id]
    );

    for (const it of items) {
      await client.query(
        `INSERT INTO purchase_items
           (purchase_invoice_id, product_code, quantity, unit_price_yuan,
            unit_price_toman)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, it.product_code, it.quantity, it.unit_price_yuan, it.unit_price_toman]
      );
      await adjustStock(client, {
        productCode: it.product_code,
        quantity: Number(it.quantity),
        movementType: 'purchase',
        referenceInvoice: existing.invoice_number,
        movementDate: purchase_date || existing.purchase_date,
      });
    }

    await client.query('COMMIT');
    return getPurchaseInvoiceById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deletePurchaseInvoice(id) {
  const existing = await getPurchaseInvoiceById(id);
  if (!existing) throw new Error('فاکتور خرید یافت نشد.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of existing.items) {
      await adjustStock(client, {
        productCode: item.product_code,
        quantity: -Number(item.quantity),
        movementType: 'purchase',
        referenceInvoice: `${existing.invoice_number}-DELETE`,
        movementDate: existing.purchase_date,
      });
    }
    await client.query('DELETE FROM purchase_invoices WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createPurchaseInvoice,
  listPurchaseInvoices,
  getPurchaseInvoiceById,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
};
