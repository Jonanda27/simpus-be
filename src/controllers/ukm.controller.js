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

// =========================================================================
// [BARU] FUNGSI ORKESTRASI INTEGRASI SATUSEHAT
// =========================================================================
const syncKeSatuSehat = async (req, res, next) => {
  try {
    const { registerId } = req.params;

    // Panggil mesin integrasi (Service) yang sudah kita buat
    const result = await ukmService.syncEpisodeOfCare(registerId);

    // Kembalikan respons sukses beserta "Tanda Terima" dari Kemenkes
    res.status(200).json({
      success: true,
      message: result.pesan,
      data: {
        satusehatConditionId: result.satusehatConditionId,
        satusehatEpisodeId: result.satusehatEpisodeId
      }
    });

  } catch (error) {
    // Tangkap error validasi spesifik dari FHIR SATUSEHAT (jika ada)
    // Ini sangat penting agar developer Frontend tahu bagian data mana yang ditolak Kemenkes
    if (error.details) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        satusehat_error: error.details
      });
    }

    // Jika error lokal (misal database mati), lempar ke middleware error handler global
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getPasienByProgram,
  addLogPemantauan,
  syncKeSatuSehat // Jangan lupa diekspor!
};