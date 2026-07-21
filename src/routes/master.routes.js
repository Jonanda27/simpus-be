'use strict';

const express = require('express');
const masterController = require('../controllers/master.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadImage } = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(protect);

// 1. Master Obat
router.get('/obat', masterController.getMasterObat);
router.post('/obat', uploadImage.single('gambar'), masterController.createMasterObat);
router.put('/obat/:id', uploadImage.single('gambar'), masterController.updateMasterObat);
router.delete('/obat/:id', masterController.deleteMasterObat);

// 2. Master Laboratorium
router.get('/laboratorium', masterController.getMasterLaboratorium);
router.post('/laboratorium', masterController.createMasterLaboratorium);
router.put('/laboratorium/:id', masterController.updateMasterLaboratorium);
router.delete('/laboratorium/:id', masterController.deleteMasterLaboratorium);

// 3. Master Modality Radiologi
router.get('/modality', masterController.getMasterModality);
router.post('/modality', masterController.createMasterModality);
router.put('/modality/:id', masterController.updateMasterModality);
router.delete('/modality/:id', masterController.deleteMasterModality);

// 4. Master Vaksin
router.get('/vaksin', masterController.getMasterVaksin);
router.post('/vaksin', masterController.createMasterVaksin);
router.put('/vaksin/:id', masterController.updateMasterVaksin);
router.delete('/vaksin/:id', masterController.deleteMasterVaksin);

module.exports = router;

