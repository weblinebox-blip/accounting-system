const purchaseService = require('../services/purchaseService');
const { parsePurchaseExcel } = require('../services/excelService');

async function create(req, res) {
  try {
    const invoice = await purchaseService.createPurchaseInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const result = await purchaseService.listPurchaseInvoices(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await purchaseService.getPurchaseInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'فاکتور یافت نشد.' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const invoice = await purchaseService.updatePurchaseInvoice(req.params.id, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await purchaseService.deletePurchaseInvoice(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// آپلود اکسل و پیش‌نمایش (بدون ثبت نهایی) — کاربر بعد از تایید، create را صدا می‌زند
async function previewExcel(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'فایلی آپلود نشده است.' });
    const { items, errors } = parsePurchaseExcel(req.file.buffer);
    res.json({ items, errors });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { create, list, getOne, update, remove, previewExcel };
