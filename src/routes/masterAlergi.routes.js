const express = require('express');
const router = express.Router();
const alergiController = require('../controllers/masterAlergi.controller');

router.get('/', alergiController.getAllAlergi);
router.get('/kfa', alergiController.searchKfa);
router.post('/', alergiController.createAlergi);
router.put('/:id', alergiController.updateAlergi);
router.delete('/:id', alergiController.deleteAlergi);

module.exports = router;
