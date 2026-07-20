const express = require('express');
const rawatJalanController = require('../controllers/rawatJalan.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Semua API rawat jalan harus login
router.use(protect);

// Antrian pasien
router.get('/antrian', rawatJalanController.getAntrianDokter);

// Riwayat pasien selesai (semua pasien)
router.get('/riwayat', rawatJalanController.getRiwayatDokter);

// Riwayat detail satu pasien berdasarkan noRM
router.get('/riwayat/pasien/:noRM', rawatJalanController.getRiwayatPasienByRM);

// Mulai pemeriksaan (buat RekamMedis DRAFT + lock status)
router.post('/:kunjunganId/mulai', rawatJalanController.mulaiPemeriksaan);

// Simpan SOAP
router.put('/:rekamMedisId/soap', rawatJalanController.simpanSOAP);

// Simpan Diagnosa ICD-10 (bulk)
router.post('/:kunjunganId/diagnosa', rawatJalanController.simpanDiagnosa);

// Simpan Tindakan ICD-9 (bulk)
router.post('/:kunjunganId/tindakan', rawatJalanController.simpanTindakan);

// Simpan Alergi (bulk)
router.post('/:kunjunganId/alergi', rawatJalanController.simpanAlergi);

// Get rekam medis by kunjungan
router.get('/:kunjunganId/rekam-medis', rawatJalanController.getRekamMedis);

// Get diagnosa by kunjungan
router.get('/:kunjunganId/diagnosa', rawatJalanController.getDiagnosa);

// Get tindakan by kunjungan
router.get('/:kunjunganId/tindakan', rawatJalanController.getTindakan);

// Get alergi by kunjungan
router.get('/:kunjunganId/alergi', rawatJalanController.getAlergi);

// Selesaikan pemeriksaan (Fase 1 Klinis Selesai)
router.post('/:kunjunganId/selesai', rawatJalanController.selesaikanPemeriksaan);

// Tunda pemeriksaan (Kedaruratan / Ganti Pasien)
router.post('/:kunjunganId/tunda', rawatJalanController.tundaPemeriksaan);

// Tindak Lanjut: Simpan Resep Obat
router.post('/:kunjunganId/resep', rawatJalanController.simpanResep);

// Tindak Lanjut: Simpan Rujukan
router.post('/:kunjunganId/rujukan', rawatJalanController.simpanRujukan);

// Tindak Lanjut: Pasien Pulang (Tanpa resep/rujukan)
router.post('/:kunjunganId/pulang', rawatJalanController.pulang);

module.exports = router;
