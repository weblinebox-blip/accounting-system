const express = require('express');
const multer = require('multer');
const controller = require('../controllers/purchaseController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/import-excel/preview', upload.single('file'), controller.previewExcel);

module.exports = router;
