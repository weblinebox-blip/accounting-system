const expenseService = require('../services/expenseService');

function buildImagePath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

async function create(req, res) {
  try {
    const payload = { ...req.body, receipt_image_path: buildImagePath(req.file) };
    const expense = await expenseService.createExpense(payload);
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function list(req, res) {
  try {
    const result = await expenseService.listExpenses(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOne(req, res) {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'هزینه یافت نشد.' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const payload = { ...req.body };
    if (req.file) payload.receipt_image_path = buildImagePath(req.file);
    const expense = await expenseService.updateExpense(req.params.id, payload);
    res.json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

function categories(req, res) {
  res.json(expenseService.ALLOWED_CATEGORIES);
}

module.exports = { create, list, getOne, update, remove, categories };
