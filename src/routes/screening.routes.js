const express = require('express');
const screeningController = require('../controllers/screening.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/', screeningController.createScreening);
router.get('/kunjungan/:kunjunganId', screeningController.getScreeningByKunjungan);

module.exports = router;
