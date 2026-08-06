const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const controller = require('../controllers/expenseController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('فقط فایل تصویری (jpg, png, webp) مجاز است.'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/categories', controller.categories);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', upload.single('receipt'), controller.create);
router.put('/:id', upload.single('receipt'), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
