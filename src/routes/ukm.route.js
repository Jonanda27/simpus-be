const express = require('express');
const router = express.Router();
const ukmController = require('../controllers/ukm.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/dashboard', ukmController.getDashboardStats);
router.get('/program/:programId/pasien', ukmController.getPasienByProgram);
router.post('/register/:registerId/log', ukmController.addLogPemantauan);

module.exports = router;
