const express = require('express');
const purchaseRoutes = require('./purchaseRoutes');
const salesRoutes = require('./salesRoutes');
const expenseRoutes = require('./expenseRoutes');
const returnRoutes = require('./returnRoutes');
const reportRoutes = require('./reportRoutes');

const router = express.Router();

router.use('/purchases', purchaseRoutes);
router.use('/sales', salesRoutes);
router.use('/expenses', expenseRoutes);
router.use('/returns', returnRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
