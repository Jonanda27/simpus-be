const express = require('express');
const router = express.Router();
const radiologiController = require('../controllers/radiologi.controller');
const { protect } = require('../middlewares/auth.middleware');

// Menerapkan middleware autentikasi untuk semua endpoint di bawah ini
router.use(protect);

// ==========================================
// ALUR INTERNAL SIMPUS (LOKAL)
// ==========================================

// 1. Dokter Poli membuat Order Radiologi
router.post('/order', radiologiController.createOrder);

// 2. Petugas Radiologi melihat antrian kunjungan
router.get('/antrian', radiologiController.getAntrian);

// 3. Petugas Radiologi memproses pemeriksaan (memasukkan alat/modality)
router.post('/:orderId/proses', radiologiController.prosesPemeriksaan);

// 4. Dokter Radiologi mengisi hasil bacaan / ekspertise
router.put('/:pemeriksaanId/ekspertise', radiologiController.simpanEkspertise);

// ==========================================
// ALUR INTEGRASI PIHAK KETIGA (SATUSEHAT)
// ==========================================

// 5. Trigger manual / background job untuk mengirim ImagingStudy ke SATUSEHAT
router.post('/:pemeriksaanId/sync-satusehat', radiologiController.syncKeSatuSehat);

module.exports = router;