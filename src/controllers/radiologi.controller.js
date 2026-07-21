const radiologiService = require('../services/radiologi.service');
const SatuSehatMapper = require('../services/satusehat/mapper.service');
const SatuSehatGateway = require('../services/satusehat/gateway.service');
const prisma = require('../config/prisma');

const radiologiController = {

    // 1. Order dari Dokter Poli
    createOrder: async (req, res, next) => {
        try {
            // Asumsi req.user di-inject oleh auth.middleware.js
            const dokterId = req.user?.id || req.body.dokterId;
            const data = { ...req.body, dokterId };

            const order = await radiologiService.createOrder(data);

            res.status(201).json({
                success: true,
                message: 'Order radiologi berhasil dibuat',
                data: order,
            });
        } catch (error) {
            next(error);
        }
    },

    // 2. Daftar Antrian untuk Petugas Radiologi
    getAntrian: async (req, res, next) => {
        try {
            const antrian = await radiologiService.getAntrianRadiologi();
            res.status(200).json({
                success: true,
                data: antrian,
            });
        } catch (error) {
            next(error);
        }
    },

    // 3. Petugas menginput data saat rontgen dilakukan
    prosesPemeriksaan: async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const pemeriksaan = await radiologiService.prosesPemeriksaan(orderId, req.body);

            res.status(200).json({
                success: true,
                message: 'Pemeriksaan radiologi sedang diproses',
                data: pemeriksaan,
            });
        } catch (error) {
            next(error);
        }
    },

    // 4. Dokter Radiologi mengisi hasil bacaan (Ekspertise)
    simpanEkspertise: async (req, res, next) => {
        try {
            const { pemeriksaanId } = req.params;
            const dokterPembacaId = req.user?.id || req.body.dokterPembacaId;

            const hasil = await radiologiService.simpanEkspertise(pemeriksaanId, dokterPembacaId, req.body);

            res.status(200).json({
                success: true,
                message: 'Hasil ekspertise berhasil disimpan',
                data: hasil,
            });
        } catch (error) {
            next(error);
        }
    },

    // 5. ORKESTRASI INTEGRASI SATUSEHAT
    syncKeSatuSehat: async (req, res, next) => {
        try {
            const { pemeriksaanId } = req.params;

            // Langkah 1: Ambil data komplit dari lokal (Information Expert)
            const dataLokal = await radiologiService.getPemeriksaanLengkapById(pemeriksaanId);
            if (!dataLokal) {
                return res.status(404).json({ success: false, message: 'Data pemeriksaan tidak ditemukan' });
            }

            // Langkah 2: Cek Guard Privacy Pasien (Larman Protocol)
            if (!dataLokal.kunjungan.persetujuan?.persetujuanSatusehat) {
                return res.status(403).json({
                    success: false,
                    message: 'DITOLAK: Pasien tidak memberikan persetujuan pengiriman data ke SATUSEHAT.',
                });
            }

            // Langkah 3: Transformasi Data via Mapper (Pure Fabrication)
            const fhirPayload = SatuSehatMapper.toImagingStudy(dataLokal);

            // Langkah 4: Tembak ke API SATUSEHAT via Gateway (Indirection)
            const satusehatResponse = await SatuSehatGateway.postResource('ImagingStudy', fhirPayload);

            // Langkah 5: Simpan ID kembalian dari Kemenkes ke Database Lokal
            // (Untuk menjaga sinkronisasi, diupdate via transaksi ringan Prisma)
            const updatedPemeriksaan = await prisma.pemeriksaanRadiologi.update({
                where: { id: pemeriksaanId },
                data: {
                    satusehatId: satusehatResponse.id // Menyimpan ID Kemenkes!
                }
            });

            res.status(200).json({
                success: true,
                message: 'Berhasil sinkronisasi ImagingStudy ke SATUSEHAT',
                data: {
                    idLokal: updatedPemeriksaan.id,
                    satusehatId: updatedPemeriksaan.satusehatId,
                }
            });

        } catch (error) {
            // Jika error berasal dari API SATUSEHAT, kita bisa mengembalikan detailnya ke Frontend
            if (error.details) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    satusehat_error: error.details
                });
            }
            next(error); // Lempar ke global error middleware
        }
    }

};

module.exports = radiologiController;