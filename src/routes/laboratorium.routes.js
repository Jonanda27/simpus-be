const express = require('express');
const router = express.Router();
const laboratoriumController = require('../controllers/laboratorium.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Gunakan verifyToken jika autentikasi diwajibkan
// router.post('/order', verifyToken, laboratoriumController.createOrder);
router.post('/order', laboratoriumController.createOrder);
router.get('/antrian', laboratoriumController.getAntrian);
router.get('/order/kunjungan/:kunjunganId', laboratoriumController.getOrderByKunjungan);
router.put('/order/:id/hasil', laboratoriumController.simpanHasil);

module.exports = router;
