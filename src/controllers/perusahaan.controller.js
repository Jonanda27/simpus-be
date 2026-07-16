const perusahaanService = require('../services/perusahaan.service');

// Get all Perusahaan
const getAllPerusahaan = async (req, res) => {
  try {
    const { statusKerjasama } = req.query;
    const perusahaanList = await perusahaanService.getAllPerusahaan(statusKerjasama);

    res.json({
      success: true,
      data: perusahaanList
    });
  } catch (error) {
    console.error('Error fetching perusahaan:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data perusahaan' });
  }
};

// Create new Perusahaan
const createPerusahaan = async (req, res) => {
  try {
    const {
      kodePerusahaan, namaPerusahaan, alamat, noTelepon, email,
      namaPic, noHpPic, noPks, tanggalMulai, tanggalBerakhir,
      statusKerjasama, cakupanLayanan, plafonTahunan
    } = req.body;

    let fileDokumenPks = null;
    if (req.file) {
      fileDokumenPks = `/uploads/pks/${req.file.filename}`;
    }

    const newPerusahaan = await perusahaanService.createPerusahaan({
      kodePerusahaan,
      namaPerusahaan,
      alamat,
      noTelepon,
      email,
      namaPic,
      noHpPic,
      noPks,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
      tanggalBerakhir: tanggalBerakhir ? new Date(tanggalBerakhir) : null,
      fileDokumenPks,
      statusKerjasama: statusKerjasama || 'AKTIF',
      cakupanLayanan,
      plafonTahunan: plafonTahunan ? parseFloat(plafonTahunan) : null
    });

    res.status(201).json({
      success: true,
      message: 'Berhasil menambahkan perusahaan',
      data: newPerusahaan
    });
  } catch (error) {
    console.error('Error creating perusahaan:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Kode perusahaan sudah digunakan' });
    }
    res.status(500).json({ success: false, message: 'Gagal menambahkan perusahaan' });
  }
};

// Update Perusahaan
const updatePerusahaan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      namaPerusahaan, alamat, noTelepon, email,
      namaPic, noHpPic, noPks, tanggalMulai, tanggalBerakhir,
      statusKerjasama, cakupanLayanan, plafonTahunan
    } = req.body;

    const updateData = {
      namaPerusahaan,
      alamat,
      noTelepon,
      email,
      namaPic,
      noHpPic,
      noPks,
      tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
      tanggalBerakhir: tanggalBerakhir ? new Date(tanggalBerakhir) : null,
      statusKerjasama,
      cakupanLayanan,
      plafonTahunan: plafonTahunan ? parseFloat(plafonTahunan) : null
    };

    if (req.file) {
      updateData.fileDokumenPks = `/uploads/pks/${req.file.filename}`;
    }

    const updatedPerusahaan = await perusahaanService.updatePerusahaan(id, updateData);

    res.json({
      success: true,
      message: 'Berhasil memperbarui perusahaan',
      data: updatedPerusahaan
    });
  } catch (error) {
    console.error('Error updating perusahaan:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui perusahaan' });
  }
};

module.exports = {
  getAllPerusahaan,
  createPerusahaan,
  updatePerusahaan
};
