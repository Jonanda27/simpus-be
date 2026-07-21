const express = require('express');
const router = express.Router();
const keuanganController = require('../controllers/keuangan.controller');
const { protect } = require('../middlewares/auth.middleware');

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

// All financial master routes require login & admin access
router.use(protect);
router.use(adminOnly);

// Tarif Pelayanan CRUD
router.get('/tarif-pelayanan', keuanganController.getTarifPelayanan);
router.post('/tarif-pelayanan', keuanganController.createTarifPelayanan);
router.put('/tarif-pelayanan/:id', keuanganController.updateTarifPelayanan);
router.delete('/tarif-pelayanan/:id', keuanganController.deleteTarifPelayanan);

// Tarif Farmasi CRUD
router.get('/tarif-farmasi', keuanganController.getTarifFarmasi);
router.post('/tarif-farmasi', keuanganController.createTarifFarmasi);
router.put('/tarif-farmasi/:id', keuanganController.updateTarifFarmasi);
router.delete('/tarif-farmasi/:id', keuanganController.deleteTarifFarmasi);

// Master Helper Endpoints
router.get('/master-icd9', keuanganController.getAllMasterICD9);
router.get('/master-lab', keuanganController.getAllMasterLab);

module.exports = router;
