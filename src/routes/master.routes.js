const express = require('express');
const masterController = require('../controllers/master.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadImage } = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(protect);

// Master Obat
router.get('/obat', masterController.getMasterObat);
router.post('/obat', uploadImage.single('gambar'), masterController.createMasterObat);
router.put('/obat/:id', uploadImage.single('gambar'), masterController.updateMasterObat);
router.delete('/obat/:id', masterController.deleteMasterObat);

module.exports = router;
