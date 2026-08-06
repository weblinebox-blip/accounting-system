const salesService = require('../services/salesService');
const { parseSalesExcel, buildSalesInvoiceExcel } = require('../services/excelService');

async function create(req, res) {
  try {
    const invoice = await salesService.createSalesInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const result = await salesService.listSalesInvoices(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await salesService.getSalesInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'فاکتور یافت نشد.' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const invoice = await salesService.updateSalesInvoice(req.params.id, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await salesService.deleteSalesInvoice(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function previewExcel(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'فایلی آپلود نشده است.' });
    const { items, errors, invoiceDate, customerName } = parseSalesExcel(req.file.buffer);
    res.json({ items, errors, invoiceDate, customerName });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// خروجی اکسل با فرمت اختصاصی برای یک فاکتور فروش مشخص
async function exportExcel(req, res) {
  try {
    const invoice = await salesService.getSalesInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'فاکتور یافت نشد.' });
    const buffer = buildSalesInvoiceExcel(invoice);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-${invoice.invoice_number}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { create, list, getOne, update, remove, previewExcel, exportExcel };
