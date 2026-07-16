const express = require('express');
const router = express.Router();
const icd10Controller = require('../controllers/icd10.controller');

// Master ICD-10 Routes
router.get('/search', icd10Controller.searchICD10);
router.post('/master', icd10Controller.createICD10);
router.put('/master/:id', icd10Controller.updateICD10);
router.delete('/master/:id', icd10Controller.deleteICD10);

// Diagnosis Pasien Routes
router.post('/diagnosis', icd10Controller.saveDiagnosis);
router.get('/diagnosis/pasien/:pasienId', icd10Controller.getDiagnosisByPasien);
router.delete('/diagnosis/:id', icd10Controller.deleteDiagnosis);

module.exports = router;
