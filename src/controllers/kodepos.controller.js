const kodeposService = require('../services/kodepos.service');

/**
 * Controller to search postal code (Kode Pos) dynamically based on kelurahan & kecamatan
 * GET /api/kodepos?kelurahan={nama_desa}&kecamatan={nama_kecamatan}
 */
const getKodePos = async (req, res, next) => {
  try {
    const { kelurahan, kecamatan } = req.query;

    const result = await kodeposService.getKodePos(kelurahan, kecamatan);

    return res.status(200).json({
      success: true,
      kode_pos: result.kode_pos,
      data: result.data
    });
  } catch (error) {
    console.error('Error in getKodePos controller:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Gagal mencari data kode pos'
    });
  }
};

module.exports = {
  getKodePos
};
