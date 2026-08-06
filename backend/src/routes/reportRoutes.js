const express = require('express');
const controller = require('../controllers/reportController');

const router = express.Router();

router.get('/profit-loss', controller.profitLoss);
router.get('/sales-totals', controller.salesTotals);
router.get('/purchase-totals', controller.purchaseTotals);
router.get('/expenses-total', controller.expensesTotal);
router.get('/customer-balance', controller.customerBalance);
router.get('/supplier-balance', controller.supplierBalance);
router.get('/top-products', controller.topProducts);
router.get('/bottom-products', controller.bottomProducts);
router.get('/inventory', controller.inventory);
router.get('/customer-names', controller.customerNames);
router.get('/invoice-search', controller.searchInvoiceNumbers);
router.get('/sales-chart', controller.salesChart);
router.get('/expenses-chart', controller.expensesChart);
router.get('/profit-chart', controller.profitChart);
router.get('/sales-by-customer', controller.salesByCustomer);
router.get('/last-sale-per-product', controller.lastSalePerProduct);
router.get('/unsettled-invoices', controller.unsettledInvoices);
router.get('/customer-lifetime', controller.customerLifetime);

module.exports = router;
