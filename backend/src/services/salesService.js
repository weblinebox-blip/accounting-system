const pool = require('../config/db');
const { generateUnique5DigitNumber } = require('./invoiceNumberService');
const { adjustStock } = require('./inventoryService');

function calcTotals(items, discountPercent = 0, discountAmount = 0, shippingCost = 0) {
  let subtotal = 0;
  for (const it of items) {
    subtotal += Number(it.quantity) * Number(it.unit_price_toman);
  }
  const percentDiscount = subtotal * (Number(discountPercent) || 0) / 100;
  const totalDiscount = percentDiscount + (Number(discountAmount) || 0);
  const finalTotal = Math.max(0, subtotal - totalDiscount + (Number(shippingCost) || 0));
  return { subtotal, finalTotal };
}

/**
 * ثبت فاکتور فروش جدید (دستی یا از اکسل)
 * payload: { sales_date, customer_name, discount_percent, discount_amount, shipping_cost, settlement_status, items, source_type }
 */
async function createSalesInvoice(payload) {
  const { sales_date, customer_name, discount_percent, discount_amount, shipping_cost, settlement_status, items, source_type } = payload;

  if (!sales_date || !customer_name) {
    throw new Error('تاریخ فروش و نام خریدار الزامی است.');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('حداقل یک قلم کالا باید وارد شود.');
  }

  const invoiceNumber = await generateUnique5DigitNumber('sales_invoices');
  const { subtotal, finalTotal } = calcTotals(items, discount_percent, discount_amount, shipping_cost);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `INSERT INTO sales_invoices
         (invoice_number, sales_date, customer_name, discount_percent, discount_amount,
          shipping_cost, settlement_status, subtotal, final_total, source_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [invoiceNumber, sales_date, customer_name, discount_percent || 0, discount_amount || 0,
        shipping_cost || 0, settlement_status || 'نشده', subtotal, finalTotal, source_type || 'manual']
    );
    const invoice = invoiceResult.rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO sales_items (sales_invoice_id, product_code, quantity, unit_price_toman)
         VALUES ($1,$2,$3,$4)`,
        [invoice.id, it.product_code, it.quantity, it.unit_price_toman]
      );

      await adjustStock(client, {
        productCode: it.product_code,
        quantity: -Number(it.quantity), // فروش یعنی کاهش موجودی
        movementType: 'sale',
        referenceInvoice: invoiceNumber,
        movementDate: sales_date,
      });
    }

    await client.query('COMMIT');
    return getSalesInvoiceById(invoice.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listSalesInvoices({ search, from, to, customer, sortBy = 'sales_date', sortDir = 'DESC', page = 1, pageSize = 20 }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(invoice_number ILIKE $${idx} OR customer_name ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (from) {
    conditions.push(`sales_date >= $${idx}`);
    values.push(from);
    idx++;
  }
  if (to) {
    conditions.push(`sales_date <= $${idx}`);
    values.push(to);
    idx++;
  }
  if (customer) {
    conditions.push(`customer_name ILIKE $${idx}`);
    values.push(`%${customer}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = ['sales_date', 'invoice_number', 'customer_name', 'final_total'];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'sales_date';
  const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(pageSize);

  const dataQuery = `
    SELECT * FROM sales_invoices
    ${whereClause}
    ORDER BY ${sortColumn} ${direction}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const countQuery = `SELECT COUNT(*) FROM sales_invoices ${whereClause}`;

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

async function getSalesInvoiceById(id) {
  const invoiceResult = await pool.query('SELECT * FROM sales_invoices WHERE id = $1', [id]);
  if (invoiceResult.rows.length === 0) return null;
  const itemsResult = await pool.query(
    'SELECT * FROM sales_items WHERE sales_invoice_id = $1 ORDER BY id',
    [id]
  );
  return { ...invoiceResult.rows[0], items: itemsResult.rows };
}

/**
 * ویرایش فاکتور فروش: اثر موجودی اقلام قبلی برگردانده می‌شود، اقلام جدید جایگزین و دوباره اعمال می‌شود
 */
async function updateSalesInvoice(id, payload) {
  const { sales_date, customer_name, discount_percent, discount_amount, shipping_cost, settlement_status, items } = payload;
  const existing = await getSalesInvoiceById(id);
  if (!existing) throw new Error('فاکتور فروش یافت نشد.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // برگرداندن اثر موجودی اقلام قبلی (چون فروش موجودی را کم کرده بود، برگشتش یعنی اضافه کردن دوباره)
    for (const oldItem of existing.items) {
      await adjustStock(client, {
        productCode: oldItem.product_code,
        quantity: Number(oldItem.quantity),
        movementType: 'sale',
        referenceInvoice: `${existing.invoice_number}-EDIT-REVERT`,
        movementDate: sales_date || existing.sales_date,
      });
    }
    await client.query('DELETE FROM sales_items WHERE sales_invoice_id = $1', [id]);

    const { subtotal, finalTotal } = calcTotals(
      items,
      discount_percent !== undefined ? discount_percent : existing.discount_percent,
      discount_amount !== undefined ? discount_amount : existing.discount_amount,
      shipping_cost !== undefined ? shipping_cost : existing.shipping_cost
    );

    await client.query(
      `UPDATE sales_invoices SET
         sales_date = $1, customer_name = $2, discount_percent = $3, discount_amount = $4,
         shipping_cost = $5, settlement_status = $6, subtotal = $7, final_total = $8, updated_at = NOW()
       WHERE id = $9`,
      [sales_date || existing.sales_date, customer_name || existing.customer_name,
        discount_percent !== undefined ? discount_percent : existing.discount_percent,
        discount_amount !== undefined ? discount_amount : existing.discount_amount,
        shipping_cost !== undefined ? shipping_cost : existing.shipping_cost,
        settlement_status || existing.settlement_status, subtotal, finalTotal, id]
    );

    for (const it of items) {
      await client.query(
        `INSERT INTO sales_items (sales_invoice_id, product_code, quantity, unit_price_toman)
         VALUES ($1,$2,$3,$4)`,
        [id, it.product_code, it.quantity, it.unit_price_toman]
      );
      await adjustStock(client, {
        productCode: it.product_code,
        quantity: -Number(it.quantity),
        movementType: 'sale',
        referenceInvoice: existing.invoice_number,
        movementDate: sales_date || existing.sales_date,
      });
    }

    await client.query('COMMIT');
    return getSalesInvoiceById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteSalesInvoice(id) {
  const existing = await getSalesInvoiceById(id);
  if (!existing) throw new Error('فاکتور فروش یافت نشد.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of existing.items) {
      await adjustStock(client, {
        productCode: item.product_code,
        quantity: Number(item.quantity), // برگرداندن موجودی چون فروش لغو شد
        movementType: 'sale',
        referenceInvoice: `${existing.invoice_number}-DELETE`,
        movementDate: existing.sales_date,
      });
    }
    await client.query('DELETE FROM sales_invoices WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createSalesInvoice,
  listSalesInvoices,
  getSalesInvoiceById,
  updateSalesInvoice,
  deleteSalesInvoice,
};
