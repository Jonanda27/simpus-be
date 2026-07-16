const express = require('express');
const router = express.Router();
const icd9Controller = require('../controllers/icd9.controller');

router.get('/search', icd9Controller.searchICD9);
router.get('/', icd9Controller.getAllICD9);
router.post('/master', icd9Controller.createICD9);
router.put('/master/:id', icd9Controller.updateICD9);
router.delete('/master/:id', icd9Controller.deleteICD9);

module.exports = router;
