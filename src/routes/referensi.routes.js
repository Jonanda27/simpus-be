'use strict';

const express = require('express');
const referensiController = require('../controllers/referensi.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Semua API referensi dapat diakses pengguna yang terautentikasi
router.use(protect);

// Endpoint batch untuk mengambil semua dropdown sekaligus
router.get('/all', referensiController.getAllReferensi);

// Endpoint spesifik berdasarkan tipe (e.g., /api/referensi/jenis-penjamin)
router.get('/:type', referensiController.getReferensiByType);

module.exports = router;
