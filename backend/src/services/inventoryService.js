const pool = require('../config/db');

/**
 * افزایش/کاهش موجودی یک محصول و ثبت رکورد در inventory_movements
 * quantity: مثبت = افزایش موجودی (مثلا خرید) / منفی = کاهش (مثلا فروش)
 */
async function adjustStock(client, {
  productCode,
  quantity,
  movementType,
  referenceInvoice,
  movementDate,
}) {
  // اگر محصول وجود نداشت، بساز
  await client.query(
    `INSERT INTO products (product_code, current_stock)
     VALUES ($1, 0)
     ON CONFLICT (product_code) DO NOTHING`,
    [productCode]
  );

  await client.query(
    `UPDATE products SET current_stock = current_stock + $1, updated_at = NOW()
     WHERE product_code = $2`,
    [quantity, productCode]
  );

  await client.query(
    `INSERT INTO inventory_movements
       (product_code, movement_type, quantity, reference_invoice, movement_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [productCode, movementType, quantity, referenceInvoice, movementDate]
  );
}

module.exports = { adjustStock };
