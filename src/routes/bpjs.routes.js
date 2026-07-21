'use strict';

const express = require('express');
const bpjsController = require('../controllers/bpjs.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Semua endpoint BPJS memerlukan autentikasi petugas
router.use(protect);

/**
 * GET /api/bpjs/peserta/:noBpjs
 * Cek status kepesertaan BPJS berdasarkan nomor kartu.
 * Dipanggil oleh frontend SEBELUM form pendaftaran disimpan.
 *
 * Response: { aktif, statusLabel, nama, namaPPK, isRegisteredHere, kelasRawat, ... }
 */
router.get('/peserta/:noBpjs', bpjsController.cekPeserta);

/**
 * POST /api/bpjs/kunjungan/:kunjunganId/sync
 * Sync ulang kunjungan BPJS yang sebelumnya gagal (statusKlaimBpjs = PENDING_SYNC).
 * Dipanggil oleh tombol "Sync Ulang ke BPJS" di UI frontend.
 *
 * Response: { noKunjunganPcare, noUrutPcare, statusKlaimBpjs }
 */
router.post('/kunjungan/:kunjunganId/sync', bpjsController.syncKunjungan);

module.exports = router;
