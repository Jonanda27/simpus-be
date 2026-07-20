const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoring.controller');

router.get('/', monitoringController.getMonitoringData);

module.exports = router;
