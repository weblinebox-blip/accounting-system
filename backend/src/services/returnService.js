const pool = require('../config/db');
const { generateUnique5DigitNumber } = require('./invoiceNumberService');
const { adjustStock } = require('./inventoryService');

/**
 * پیدا کردن آی‌دی فاکتور فروش مرتبط از روی شماره فاکتور (اختیاری)
 */
async function resolveSalesInvoiceId(relatedInvoiceNumber) {
  if (!relatedInvoiceNumber) return null;
  const { rows } = await pool.query(
    'SELECT id FROM sales_invoices WHERE invoice_number = $1',
    [relatedInvoiceNumber]
  );
  return rows[0]?.id || null;
}

function calcLoss(items) {
  return items.reduce((sum, it) => {
    if (it.item_condition === 'خراب') {
      return sum + Number(it.quantity) * Number(it.unit_price_toman);
    }
    return sum;
  }, 0);
}

/**
 * ثبت فاکتور برگشتی جدید
 * payload: { return_date, customer_name, related_invoice_number, items: [{product_code, quantity, unit_price_toman, item_condition}] }
 */
async function createReturnInvoice(payload) {
  const { return_date, customer_name, related_invoice_number, items } = payload;

  if (!return_date || !customer_name) {
    throw new Error('تاریخ برگشت و نام مشتری الزامی است.');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('حداقل یک قلم کالای مرجوعی باید وارد شود.');
  }
  for (const it of items) {
    if (!['سالم', 'خراب'].includes(it.item_condition)) {
      throw new Error('وضعیت کالای مرجوعی باید «سالم» یا «خراب» باشد.');
    }
  }

  const invoiceNumber = await generateUnique5DigitNumber('return_invoices');
  const relatedId = await resolveSalesInvoiceId(related_invoice_number);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `INSERT INTO return_invoices (invoice_number, related_sales_invoice_id, return_date, customer_name)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [invoiceNumber, relatedId, return_date, customer_name]
    );
    const invoice = invoiceResult.rows[0];

    for (const it of items) {
      const isDamaged = it.item_condition === 'خراب';
      const lossAmount = isDamaged ? Number(it.quantity) * Number(it.unit_price_toman) : 0;

      await client.query(
        `INSERT INTO return_items
           (return_invoice_id, product_code, quantity, unit_price_toman, item_condition, loss_amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [invoice.id, it.product_code, it.quantity, it.unit_price_toman, it.item_condition, lossAmount]
      );

      // کالای سالم برمی‌گردد به موجودی؛ کالای خراب اثری روی موجودی ندارد (فقط به‌عنوان ضرر ثبت می‌شود)
      await adjustStock(client, {
        productCode: it.product_code,
        quantity: isDamaged ? 0 : Number(it.quantity),
        movementType: isDamaged ? 'return_damaged' : 'return_ok',
        referenceInvoice: invoiceNumber,
        movementDate: return_date,
      });
    }

    await client.query('COMMIT');
    return getReturnInvoiceById(invoice.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listReturnInvoices({ search, from, to, customer, sortBy = 'return_date', sortDir = 'DESC', page = 1, pageSize = 20 }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(invoice_number ILIKE $${idx} OR customer_name ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (from) {
    conditions.push(`return_date >= $${idx}`);
    values.push(from);
    idx++;
  }
  if (to) {
    conditions.push(`return_date <= $${idx}`);
    values.push(to);
    idx++;
  }
  if (customer) {
    conditions.push(`customer_name ILIKE $${idx}`);
    values.push(`%${customer}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = ['return_date', 'invoice_number', 'customer_name'];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'return_date';
  const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(pageSize);

  const dataQuery = `
    SELECT * FROM return_invoices
    ${whereClause}
    ORDER BY ${sortColumn} ${direction}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const countQuery = `SELECT COUNT(*) FROM return_invoices ${whereClause}`;

  const dataValues = [...values, pageSize, offset];
  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataValues),
    pool.query(countQuery, values),
  ]);

  // برای نمایش سریع در لیست، جمع مبلغ و جمع ضرر هر فاکتور را هم برمی‌گردانیم
  const ids = dataResult.rows.map((r) => r.id);
  let itemTotalsMap = {};
  if (ids.length) {
    const itemsResult = await pool.query(
      `SELECT return_invoice_id,
              SUM(total_price) AS total_amount,
              SUM(loss_amount) AS total_loss
       FROM return_items
       WHERE return_invoice_id = ANY($1)
       GROUP BY return_invoice_id`,
      [ids]
    );
    itemTotalsMap = Object.fromEntries(
      itemsResult.rows.map((r) => [r.return_invoice_id, { total_amount: Number(r.total_amount), total_loss: Number(r.total_loss) }])
    );
  }

  const data = dataResult.rows.map((inv) => ({
    ...inv,
    total_amount: itemTotalsMap[inv.id]?.total_amount || 0,
    total_loss: itemTotalsMap[inv.id]?.total_loss || 0,
  }));

  return {
    data,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    pageSize: Number(pageSize),
  };
}

async function getReturnInvoiceById(id) {
  const invoiceResult = await pool.query('SELECT * FROM return_invoices WHERE id = $1', [id]);
  if (invoiceResult.rows.length === 0) return null;
  const itemsResult = await pool.query(
    'SELECT * FROM return_items WHERE return_invoice_id = $1 ORDER BY id',
    [id]
  );

  const invoice = invoiceResult.rows[0];
  let related_invoice_number = null;
  if (invoice.related_sales_invoice_id) {
    const relatedResult = await pool.query(
      'SELECT invoice_number FROM sales_invoices WHERE id = $1',
      [invoice.related_sales_invoice_id]
    );
    related_invoice_number = relatedResult.rows[0]?.invoice_number || null;
  }

  return { ...invoice, related_invoice_number, items: itemsResult.rows };
}

async function updateReturnInvoice(id, payload) {
  const { return_date, customer_name, related_invoice_number, items } = payload;
  const existing = await getReturnInvoiceById(id);
  if (!existing) throw new Error('فاکتور برگشتی یافت نشد.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // برگرداندن اثر موجودی اقلام قبلی (فقط اقلام سالم موجودی را افزایش داده بودند)
    for (const oldItem of existing.items) {
      if (oldItem.item_condition === 'سالم') {
        await adjustStock(client, {
          productCode: oldItem.product_code,
          quantity: -Number(oldItem.quantity),
          movementType: 'return_ok',
          referenceInvoice: `${existing.invoice_number}-EDIT-REVERT`,
          movementDate: return_date || existing.return_date,
        });
      }
    }
    await client.query('DELETE FROM return_items WHERE return_invoice_id = $1', [id]);

    const relatedId = related_invoice_number !== undefined
      ? await resolveSalesInvoiceId(related_invoice_number)
      : existing.related_sales_invoice_id;

    await client.query(
      `UPDATE return_invoices SET
         return_date = $1, customer_name = $2, related_sales_invoice_id = $3
       WHERE id = $4`,
      [return_date || existing.return_date, customer_name || existing.customer_name, relatedId, id]
    );

    for (const it of items) {
      const isDamaged = it.item_condition === 'خراب';
      const lossAmount = isDamaged ? Number(it.quantity) * Number(it.unit_price_toman) : 0;

      await client.query(
        `INSERT INTO return_items
           (return_invoice_id, product_code, quantity, unit_price_toman, item_condition, loss_amount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, it.product_code, it.quantity, it.unit_price_toman, it.item_condition, lossAmount]
      );

      await adjustStock(client, {
        productCode: it.product_code,
        quantity: isDamaged ? 0 : Number(it.quantity),
        movementType: isDamaged ? 'return_damaged' : 'return_ok',
        referenceInvoice: existing.invoice_number,
        movementDate: return_date || existing.return_date,
      });
    }

    await client.query('COMMIT');
    return getReturnInvoiceById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteReturnInvoice(id) {
  const existing = await getReturnInvoiceById(id);
  if (!existing) throw new Error('فاکتور برگشتی یافت نشد.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of existing.items) {
      if (item.item_condition === 'سالم') {
        await adjustStock(client, {
          productCode: item.product_code,
          quantity: -Number(item.quantity),
          movementType: 'return_ok',
          referenceInvoice: `${existing.invoice_number}-DELETE`,
          movementDate: existing.return_date,
        });
      }
    }
    await client.query('DELETE FROM return_invoices WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createReturnInvoice,
  listReturnInvoices,
  getReturnInvoiceById,
  updateReturnInvoice,
  deleteReturnInvoice,
};
