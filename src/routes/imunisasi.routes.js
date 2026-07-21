const express = require('express');
const router = express.Router();
const imunisasiController = require('../controllers/imunisasi.controller');
const { protect } = require('../middlewares/auth.middleware');

// Menerapkan middleware autentikasi secara global untuk modul ini
// (Semua route di bawah ini wajib melampirkan Token JWT)
router.use(protect);

// ==========================================
// MASTER & LOGISTIK
// ==========================================

// GET: Ambil semua jenis vaksin (Untuk Dropdown pilihan vaksin)
router.get('/vaksin', imunisasiController.getMasterVaksin);

// GET: Ambil stok batch yang aktif untuk 1 jenis vaksin (Untuk Dropdown nomor lot)
router.get('/vaksin/:vaksinId/batch', imunisasiController.getBatchVaksin);

// ==========================================
// TRANSAKSI KLINIS (LOKAL)
// ==========================================

// POST: Catat penyuntikan imunisasi baru
router.post('/riwayat', imunisasiController.catatRiwayat);

// GET: Ambil seluruh riwayat imunisasi milik 1 pasien
router.get('/riwayat/pasien/:pasienId', imunisasiController.getRiwayatPasien);

// ==========================================
// INTEGRASI SATUSEHAT
// ==========================================

// POST: Trigger manual untuk mengirim riwayat imunisasi ke server Kemenkes
router.post('/riwayat/:id/sync', imunisasiController.syncKeSatuSehat);

module.exports = router;