const masterService = require('../services/master.service');

const getMasterObat = async (req, res, next) => {
  try {
    const { search } = req.query;
    const data = await masterService.getMasterObat(search);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const cloudinary = require('../utils/cloudinary');

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'puskesmas/obat' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

const createMasterObat = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.gambarUrl = await uploadToCloudinary(req.file.buffer);
    }
    const data = await masterService.createMasterObat(payload);
    res.status(201).json({ success: true, data, message: 'Obat berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

const updateMasterObat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (req.file) {
      payload.gambarUrl = await uploadToCloudinary(req.file.buffer);
    }
    const data = await masterService.updateMasterObat(id, payload);
    res.status(200).json({ success: true, data, message: 'Obat berhasil diubah' });
  } catch (error) {
    next(error);
  }
};

const deleteMasterObat = async (req, res, next) => {
  try {
    const { id } = req.params;
    await masterService.deleteMasterObat(id);
    res.status(200).json({ success: true, message: 'Obat berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMasterObat,
  createMasterObat,
  updateMasterObat,
  deleteMasterObat,
};
