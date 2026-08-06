import axios from 'axios';

const client = axios.create({ baseURL: '/api/reports' });

export const getProfitLoss = (params) => client.get('/profit-loss', { params }).then((r) => r.data);
export const getSalesTotals = (params) => client.get('/sales-totals', { params }).then((r) => r.data);
export const getPurchaseTotals = (params) => client.get('/purchase-totals', { params }).then((r) => r.data);
export const getExpensesTotal = (params) => client.get('/expenses-total', { params }).then((r) => r.data);
export const getCustomerBalance = () => client.get('/customer-balance').then((r) => r.data);
export const getSupplierBalance = () => client.get('/supplier-balance').then((r) => r.data);
export const getTopProducts = (params) => client.get('/top-products', { params }).then((r) => r.data);
export const getBottomProducts = (params) => client.get('/bottom-products', { params }).then((r) => r.data);
export const getInventory = () => client.get('/inventory').then((r) => r.data);
export const getCustomerNames = () => client.get('/customer-names').then((r) => r.data);
export const searchInvoiceNumbers = (q) => client.get('/invoice-search', { params: { q } }).then((r) => r.data);
export const getSalesChart = (params) => client.get('/sales-chart', { params }).then((r) => r.data);
export const getExpensesChart = (params) => client.get('/expenses-chart', { params }).then((r) => r.data);
export const getProfitChart = (params) => client.get('/profit-chart', { params }).then((r) => r.data);
export const getSalesByCustomer = (params) => client.get('/sales-by-customer', { params }).then((r) => r.data);
export const getLastSalePerProduct = () => client.get('/last-sale-per-product').then((r) => r.data);
export const getUnsettledInvoices = () => client.get('/unsettled-invoices').then((r) => r.data);
export const getCustomerLifetime = () => client.get('/customer-lifetime').then((r) => r.data);
