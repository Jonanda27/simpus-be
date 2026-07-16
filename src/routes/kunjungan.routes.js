const express = require('express');
const kunjunganController = require('../controllers/kunjungan.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Semua API Kunjungan harus login
router.use(protect);

router.get('/screening', kunjunganController.getKunjunganScreening);
router.get('/:id', kunjunganController.getKunjunganById);
router.post('/:id/panggil', kunjunganController.panggilKunjungan);

module.exports = router;
