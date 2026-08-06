const reportService = require('../services/reportService');

// یک هندلر عمومی برای گزارش‌هایی که فقط query params می‌گیرند و مستقیم نتیجه را برمی‌گردانند
function handlerFor(serviceFn) {
  return async (req, res) => {
    try {
      const data = await serviceFn(req.query);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = {
  profitLoss: handlerFor(reportService.getProfitLoss),
  salesTotals: handlerFor(reportService.getSalesTotals),
  purchaseTotals: handlerFor(reportService.getPurchaseTotals),
  expensesTotal: handlerFor(reportService.getExpensesTotal),
  customerBalance: handlerFor(reportService.getCustomerBalance),
  supplierBalance: handlerFor(reportService.getSupplierBalance),
  topProducts: handlerFor(reportService.getTopProducts),
  bottomProducts: handlerFor(reportService.getBottomProducts),
  inventory: handlerFor(reportService.getInventory),
  customerNames: handlerFor(reportService.getCustomerNames),
  salesChart: handlerFor(reportService.getSalesChart),
  expensesChart: handlerFor(reportService.getExpensesChart),
  profitChart: handlerFor(reportService.getProfitChart),
  salesByCustomer: handlerFor(reportService.getSalesByCustomer),
  lastSalePerProduct: handlerFor(reportService.getLastSalePerProduct),
  unsettledInvoices: handlerFor(reportService.getUnsettledInvoices),
  customerLifetime: handlerFor(reportService.getCustomerLifetime),
  searchInvoiceNumbers: async (req, res) => {
    try {
      const data = await reportService.searchInvoiceNumbers(req.query.q);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};
