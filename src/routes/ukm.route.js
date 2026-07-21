const express = require('express');
const router = express.Router();
const ukmController = require('../controllers/ukm.controller');
const { protect } = require('../middlewares/auth.middleware');

// Menerapkan middleware autentikasi (wajib login)
router.use(protect);

// Alur Internal SIMPUS
router.get('/dashboard', ukmController.getDashboardStats);
router.get('/program/:programId/pasien', ukmController.getPasienByProgram);
router.post('/register/:registerId/log', ukmController.addLogPemantauan);

// =========================================================================
// [BARU] ENDPOINT INTEGRASI SATUSEHAT
// =========================================================================
// Endpoint untuk memicu sinkronisasi EpisodeOfCare (TBC, HIV, Ibu Hamil)
router.post('/register/:registerId/sync', ukmController.syncKeSatuSehat);

module.exports = router;