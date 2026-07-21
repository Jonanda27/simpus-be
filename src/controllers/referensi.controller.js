'use strict';

const referensiService = require('../services/referensi.service');

/**
 * Controller untuk Referensi Enum (Master Dropdown)
 */

const getAllReferensi = async (req, res, next) => {
  try {
    const data = await referensiService.getAllReferensi();
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil seluruh data referensi dropdown',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getReferensiByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const data = await referensiService.getReferensiByType(type);
    res.status(200).json({
      success: true,
      message: `Berhasil mengambil data referensi: ${type}`,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReferensi,
  getReferensiByType,
};
