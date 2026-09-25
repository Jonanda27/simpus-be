const express = require('express');
const router = express.Router();
const kodeposController = require('../controllers/kodepos.controller');

// GET /api/kodepos?kelurahan={nama_desa}&kecamatan={nama_kecamatan}
router.get('/', kodeposController.getKodePos);

module.exports = router;
