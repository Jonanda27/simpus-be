const express = require('express');
const router = express.Router();
const perusahaanController = require('../controllers/perusahaan.controller');
const { uploadPks } = require('../middlewares/upload.middleware');
const { protect } = require('../middlewares/auth.middleware');

// Public or protected routes based on requirement. 
// For now, protecting it for authenticated users.
router.use(protect);

router.get('/', perusahaanController.getAllPerusahaan);
router.post('/', uploadPks.single('fileDokumenPks'), perusahaanController.createPerusahaan);
router.put('/:id', uploadPks.single('fileDokumenPks'), perusahaanController.updatePerusahaan);

module.exports = router;
