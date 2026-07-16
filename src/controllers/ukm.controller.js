const ukmService = require('../services/ukm.service');

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await ukmService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

const getPasienByProgram = async (req, res, next) => {
  try {
    const data = await ukmService.getPasienByProgram(req.params.programId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const addLogPemantauan = async (req, res, next) => {
  try {
    const petugasId = req.user.id;
    const data = await ukmService.addLogPemantauan(req.params.registerId, req.body, petugasId);
    res.json({ success: true, message: 'Log berhasil ditambahkan', data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getPasienByProgram,
  addLogPemantauan
};
