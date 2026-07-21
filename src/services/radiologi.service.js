const prisma = require('../config/prisma');

const radiologiService = {
    /**
     * 1. Dokter Poli membuat Order Radiologi
     * (Alur: Poli -> Radiologi)
     */
    createOrder: async (data) => {
        const { kunjunganId, pasienId, dokterId, catatanKlinis } = data;

        // Validasi Integritas: Cek apakah Kunjungan ada
        const kunjungan = await prisma.kunjungan.findUnique({
            where: { id: kunjunganId },
        });

        if (!kunjungan) {
            const error = new Error('Data kunjungan tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }

        return await prisma.$transaction(async (tx) => {
            const newOrder = await tx.orderRadiologi.create({
                data: {
                    kunjunganId,
                    pasienId,
                    dokterId,
                    catatanKlinis,
                    status: 'MENUNGGU_RADIOLOGI',
                },
            });

            // Update status kunjungan
            await tx.kunjungan.update({
                where: { id: kunjunganId },
                data: { statusKunjungan: 'MENUNGGU_RADIOLOGI' },
            });

            return newOrder;
        });
    },

    /**
     * 2. Menampilkan antrian untuk petugas Radiologi
     */
    getAntrianRadiologi: async () => {
        return await prisma.orderRadiologi.findMany({
            where: {
                status: { in: ['MENUNGGU_RADIOLOGI', 'DIPROSES'] },
            },
            include: {
                pasien: true,
                dokter: { select: { id: true, namaLengkap: true } },
                kunjungan: { select: { id: true, noAntrian: true, satusehatId: true } },
                pemeriksaan: true,
            },
            orderBy: { tanggalOrder: 'asc' },
        });
    },

    /**
     * 3. Petugas Radiologi melakukan pemeriksaan (Foto Rontgen/USG)
     */
    prosesPemeriksaan: async (orderId, dataPemeriksaan) => {
        const { modalityId, studyInstanceUid, bodySite } = dataPemeriksaan;

        const order = await prisma.orderRadiologi.findUnique({
            where: { id: orderId },
            include: { kunjungan: true },
        });

        if (!order) throw new Error('Order Radiologi tidak ditemukan.');

        return await prisma.$transaction(async (tx) => {
            // Buat record pemeriksaan radiologi
            const pemeriksaan = await tx.pemeriksaanRadiologi.create({
                data: {
                    orderId,
                    kunjunganId: order.kunjunganId,
                    modalityId,
                    studyInstanceUid,
                    bodySite,
                    waktuPemeriksaan: new Date(),
                },
            });

            // Update status order
            await tx.orderRadiologi.update({
                where: { id: orderId },
                data: { status: 'DIPROSES' },
            });

            return pemeriksaan;
        });
    },

    /**
     * 4. Dokter Spesialis Radiologi mengisi hasil bacaan (Ekspertise)
     */
    simpanEkspertise: async (pemeriksaanId, dokterPembacaId, hasilData) => {
        const { interpretasi, kesan, fileDicomUrl } = hasilData;

        return await prisma.$transaction(async (tx) => {
            const pemeriksaan = await tx.pemeriksaanRadiologi.update({
                where: { id: pemeriksaanId },
                data: {
                    interpretasi,
                    kesan,
                    dokterPembacaId,
                    fileDicomUrl,
                },
                include: {
                    order: true,
                    kunjungan: true,
                }
            });

            // Tandai order selesai
            await tx.orderRadiologi.update({
                where: { id: pemeriksaan.orderId },
                data: { status: 'SELESAI' },
            });

            // Kembalikan pasien ke Poli/Dokter perujuk
            await tx.kunjungan.update({
                where: { id: pemeriksaan.kunjunganId },
                data: { statusKunjungan: 'DIPERIKSA' },
            });

            return pemeriksaan;
        });
    },

    /**
     * 5. Mengambil Data Lengkap Radiologi untuk Sinkronisasi SATUSEHAT
     */
    getPemeriksaanLengkapById: async (pemeriksaanId) => {
        return await prisma.pemeriksaanRadiologi.findUnique({
            where: { id: pemeriksaanId },
            include: {
                kunjungan: {
                    include: {
                        pasien: true,
                        persetujuan: true
                    }
                },
                modality: true,
                dokterPembaca: true
            },
        });
    }
};

module.exports = radiologiService;