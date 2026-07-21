const asetService = require('../services/aset.service');
const cloudinary = require('../utils/cloudinary');

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'puskesmas/aset' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

const getAsets = async (req, res, next) => {
  try {
    const { search, kategori } = req.query;
    const data = await asetService.getAsets(search, kategori);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createAset = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    
    // Parse boolean and number values from req.body since multipart/form-data sends them as strings
    if (payload.wajibKalibrasi !== undefined) {
      payload.wajibKalibrasi = payload.wajibKalibrasi === 'true' || payload.wajibKalibrasi === true;
    }
    if (payload.nilaiBeli !== undefined) {
      payload.nilaiBeli = parseFloat(payload.nilaiBeli) || 0;
    }
    if (payload.hargaBeli !== undefined) {
      payload.hargaBeli = parseFloat(payload.hargaBeli) || 0;
    }
    if (payload.hargaPerolehan !== undefined) {
      payload.hargaPerolehan = parseFloat(payload.hargaPerolehan) || 0;
    }
    if (payload.masaPakai !== undefined) {
      payload.masaPakai = parseInt(payload.masaPakai) || 0;
    }
    if (payload.stokMinimum !== undefined) {
      payload.stokMinimum = parseInt(payload.stokMinimum) || 0;
    }
    if (payload.stok !== undefined) {
      payload.stok = parseInt(payload.stok) || 0;
    }
    if (payload.intervalKalibrasi !== undefined) {
      payload.intervalKalibrasi = parseInt(payload.intervalKalibrasi) || null;
    }
    if (payload.intervalMaintenance !== undefined) {
      payload.intervalMaintenance = parseInt(payload.intervalMaintenance) || null;
    }
    if (payload.tahunPembuatan !== undefined) {
      payload.tahunPembuatan = parseInt(payload.tahunPembuatan) || null;
    }

    if (req.file) {
      payload.gambarUrl = await uploadToCloudinary(req.file.buffer);
    }
    
    const data = await asetService.createAset(payload);
    res.status(201).json({ success: true, data, message: 'Aset berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

const getRuangan = async (req, res, next) => {
  try {
    const data = await asetService.getRuangan();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createRuangan = async (req, res, next) => {
  try {
    const data = await asetService.createRuangan(req.body);
    res.status(201).json({ success: true, data, message: 'Ruangan berhasil ditambahkan' });
  } catch (error) {
    next(error);
  }
};

const getAsetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await asetService.getAsetById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateAset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    
    // Parse boolean and number values from req.body
    if (payload.wajibKalibrasi !== undefined) {
      payload.wajibKalibrasi = payload.wajibKalibrasi === 'true' || payload.wajibKalibrasi === true;
    }
    if (payload.nilaiBeli !== undefined) {
      payload.nilaiBeli = parseFloat(payload.nilaiBeli) || 0;
    }
    if (payload.hargaBeli !== undefined) {
      payload.hargaBeli = parseFloat(payload.hargaBeli) || 0;
    }
    if (payload.hargaPerolehan !== undefined) {
      payload.hargaPerolehan = parseFloat(payload.hargaPerolehan) || 0;
    }
    if (payload.masaPakai !== undefined) {
      payload.masaPakai = parseInt(payload.masaPakai) || 0;
    }
    if (payload.stokMinimum !== undefined) {
      payload.stokMinimum = parseInt(payload.stokMinimum) || 0;
    }
    if (payload.stok !== undefined) {
      payload.stok = parseInt(payload.stok) || 0;
    }
    if (payload.intervalKalibrasi !== undefined) {
      payload.intervalKalibrasi = parseInt(payload.intervalKalibrasi) || null;
    }
    if (payload.intervalMaintenance !== undefined) {
      payload.intervalMaintenance = parseInt(payload.intervalMaintenance) || null;
    }
    if (payload.tahunPembuatan !== undefined) {
      payload.tahunPembuatan = parseInt(payload.tahunPembuatan) || null;
    }

    if (req.file) {
      payload.gambarUrl = await uploadToCloudinary(req.file.buffer);
    }
    
    const data = await asetService.updateAset(id, payload);
    res.status(200).json({ success: true, data, message: 'Aset berhasil diubah' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAsets,
  createAset,
  getAsetById,
  updateAset,
  getRuangan,
  createRuangan
};
