const kunjunganService = require('../services/kunjungan.service');

const getKunjunganScreening = async (req, res, next) => {
  try {
    const data = await kunjunganService.getKunjunganScreening(req.user);
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

const panggilKunjungan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const petugasId = req.user.id;
    const result = await kunjunganService.panggilKunjungan(id, petugasId);
    
    res.status(200).json({
      success: true,
      message: 'Berhasil memanggil pasien',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getKunjunganById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await kunjunganService.getKunjunganById(id);
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

const getKunjunganFhirPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await kunjunganService.getKunjunganFhirPreview(id);
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKunjunganScreening,
  panggilKunjungan,
  getKunjunganById,
  getKunjunganFhirPreview,
};
