const masterAlergiService = require('../services/masterAlergi.service');
const satusehatService = require('../services/satusehat.service');

// Get all master alergi
exports.getAllAlergi = async (req, res) => {
  try {
    const alergi = await masterAlergiService.getAllAlergi();
    res.json(alergi);
  } catch (error) {
    console.error('Error fetching master alergi:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Create master alergi
exports.createAlergi = async (req, res) => {
  try {
    const newAlergi = await masterAlergiService.createAlergi(req.body);
    res.status(201).json(newAlergi);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating master alergi:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Update master alergi
exports.updateAlergi = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await masterAlergiService.updateAlergi(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating master alergi:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Delete master alergi
exports.deleteAlergi = async (req, res) => {
  try {
    const { id } = req.params;
    await masterAlergiService.deleteAlergi(id);
    res.json({ message: 'Master Alergi berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting master alergi:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Search KFA
exports.searchKfa = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 3) {
      return res.status(400).json({ error: 'Keyword minimal 3 karakter' });
    }
    const result = await satusehatService.searchKFA(keyword);
    res.json(result);
  } catch (error) {
    console.error('Error searching KFA:', error);
    res.status(500).json({ error: 'Gagal mencari data KFA' });
  }
};
