const express = require('express');
const router = express.Router();
const dokterController = require('../controllers/dokter.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/', dokterController.getAllDokter);
router.post('/', dokterController.createDokter);
router.put('/:id', dokterController.updateDokter);
router.delete('/:id', dokterController.deleteDokter);

module.exports = router;
