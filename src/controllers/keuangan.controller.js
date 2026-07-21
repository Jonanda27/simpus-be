const keuanganService = require('../services/keuangan.service');

// === TARIF PELAYANAN CONTROLLERS ===
const getTarifPelayanan = async (req, res, next) => {
  try {
    const { search, kategori } = req.query;
    const data = await keuanganService.getTarifPelayanan(search, kategori);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createTarifPelayanan = async (req, res, next) => {
  try {
    const data = await keuanganService.createTarifPelayanan(req.body);
    res.status(201).json({ success: true, data, message: 'Tarif pelayanan berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

const updateTarifPelayanan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await keuanganService.updateTarifPelayanan(id, req.body);
    res.status(200).json({ success: true, data, message: 'Tarif pelayanan berhasil diubah' });
  } catch (error) {
    next(error);
  }
};

const deleteTarifPelayanan = async (req, res, next) => {
  try {
    const { id } = req.params;
    await keuanganService.deleteTarifPelayanan(id);
    res.status(200).json({ success: true, message: 'Tarif pelayanan berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};


// === TARIF FARMASI CONTROLLERS ===
const getTarifFarmasi = async (req, res, next) => {
  try {
    const { search } = req.query;
    const data = await keuanganService.getTarifFarmasi(search);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createTarifFarmasi = async (req, res, next) => {
  try {
    const data = await keuanganService.createTarifFarmasi(req.body);
    res.status(201).json({ success: true, data, message: 'Tarif farmasi berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

const updateTarifFarmasi = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await keuanganService.updateTarifFarmasi(id, req.body);
    res.status(200).json({ success: true, data, message: 'Tarif farmasi berhasil diubah' });
  } catch (error) {
    next(error);
  }
};

const deleteTarifFarmasi = async (req, res, next) => {
  try {
    const { id } = req.params;
    await keuanganService.deleteTarifFarmasi(id);
    res.status(200).json({ success: true, message: 'Tarif farmasi berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

const getAllMasterICD9 = async (req, res, next) => {
  try {
    const data = await keuanganService.getAllMasterICD9();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAllMasterLab = async (req, res, next) => {
  try {
    const data = await keuanganService.getAllMasterLab();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTarifPelayanan,
  createTarifPelayanan,
  updateTarifPelayanan,
  deleteTarifPelayanan,
  getTarifFarmasi,
  createTarifFarmasi,
  updateTarifFarmasi,
  deleteTarifFarmasi,
  getAllMasterICD9,
  getAllMasterLab
};
