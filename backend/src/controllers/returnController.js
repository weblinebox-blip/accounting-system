const returnService = require('../services/returnService');

async function create(req, res) {
  try {
    const invoice = await returnService.createReturnInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const result = await returnService.listReturnInvoices(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await returnService.getReturnInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'فاکتور یافت نشد.' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const invoice = await returnService.updateReturnInvoice(req.params.id, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await returnService.deleteReturnInvoice(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { create, list, getOne, update, remove };
