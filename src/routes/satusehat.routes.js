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

// API to GET Encounter detail directly from SATUSEHAT
router.get('/encounter/:encounterId', satusehatController.getEncounterDetail);

// API to GET List of all Encounters for Monitoring
router.get('/encounters', satusehatController.getMonitoringEncounters);

// API to GET Resource (Observation, Condition, ClinicalImpression, Goal) by Encounter ID
router.get('/resource-by-encounter/:resourceType/:encounterId', satusehatController.getResourceByEncounter);

// API to retry sync Bundle for a kunjungan
router.post('/kunjungan/:kunjunganId/sync', satusehatController.retrySyncEncounter);

module.exports = router;
