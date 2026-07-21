const express = require('express');
const router = express.Router();
const satusehatController = require('../controllers/satusehat.controller');

// API to test SATUSEHAT Connection / Auth
router.get('/auth-test', satusehatController.testAuth);

// API to sync Patient IHS Number by NIK
router.get('/pasien/nik/:nik', satusehatController.syncPatientIHS);

// API to sync Practitioner (Tenaga Medis) IHS Number by NIK
router.get('/praktisioner/nik/:nik', satusehatController.syncPractitionerIHS);

// API to sync Location IHS for a Poliklinik
router.post('/lokasi/poli/:id', satusehatController.syncPoliklinikLocation);

// API to search KFA
router.get('/kfa', satusehatController.searchKFA);

// API to POST MedicationDispense
router.post('/medication-dispense', satusehatController.dispenseMedication);

module.exports = router;
