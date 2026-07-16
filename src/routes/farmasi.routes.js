const express = require('express');
const router = express.Router();
const farmasiController = require('../controllers/farmasi.controller');

// Rute untuk Antrian Farmasi
router.get('/antrian', farmasiController.getAntrianFarmasi);
router.get('/resep/:id', farmasiController.getResepById);
router.post('/resep/:id/proses', farmasiController.prosesResep);

module.exports = router;
