const express = require('express');
const asetController = require('../controllers/aset.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadImage } = require('../middlewares/upload.middleware');

const router = express.Router();

// Middleware to restrict access to ADMIN only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    const error = new Error('Akses ditolak, hanya Admin yang dapat mengakses modul ini');
    error.statusCode = 403;
    next(error);
  }
};

// All routes here require authentication and Admin role
router.use(protect);
router.use(adminOnly);

// Ruangan endpoints (Master Data)
router.get('/ruangan', asetController.getRuangan);
router.post('/ruangan', asetController.createRuangan);

// Aset endpoints
router.get('/', asetController.getAsets);
router.post('/', uploadImage.single('gambar'), asetController.createAset);
router.get('/:id', asetController.getAsetById);
router.put('/:id', uploadImage.single('gambar'), asetController.updateAset);

module.exports = router;
