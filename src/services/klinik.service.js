const prisma = require('../config/prisma');

const klinikService = {
  // === Poliklinik ===
  getAllPoliklinik: async () => {
    return await prisma.poliklinik.findMany({
      orderBy: { namaPoli: 'asc' },
    });
  },

  createPoliklinik: async (data) => {
    return await prisma.poliklinik.create({
      data: {
        kodePoli: data.kodePoli,
        namaPoli: data.namaPoli,
        deskripsi: data.deskripsi,
        statusAktif: data.statusAktif !== undefined ? data.statusAktif : true,
      },
    });
  },

  updatePoliklinik: async (id, data) => {
    return await prisma.poliklinik.update({
      where: { id },
      data,
    });
  },

  // === Dokter Klinik ===
  getDokterByPoli: async (poliklinikId) => {
    return await prisma.user.findMany({
      where: {
        poliklinikId: poliklinikId,
        role: 'DOKTER',
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
      orderBy: { username: 'asc' },
    });
  },

  // === Layanan Klinik ===
  getLayananByPoli: async (poliklinikId) => {
    return await prisma.layananKlinik.findMany({
      where: { poliklinikId },
      orderBy: { namaLayanan: 'asc' },
    });
  },

  createLayanan: async (data) => {
    return await prisma.$transaction(async (tx) => {
      const layanan = await tx.layananKlinik.create({
        data: {
          poliklinikId: data.poliklinikId,
          kodeLayanan: data.kodeLayanan,
          namaLayanan: data.namaLayanan,
          deskripsi: data.deskripsi,
          tarifDasar: data.tarifDasar ? parseFloat(data.tarifDasar) : 0,
          statusAktif: data.statusAktif !== undefined ? data.statusAktif : true,
        },
      });

      // Sinkronisasi ke MasterTarifPelayanan via MasterICD9 jika kode layanan ada di ICD-9
      const icd9 = await tx.masterICD9.findUnique({
        where: { kode_icd9: data.kodeLayanan }
      });
      if (icd9) {
        await tx.masterTarifPelayanan.updateMany({
          where: { icd9Id: icd9.id_icd9, kategori: 'TINDAKAN' },
          data: { tarif: parseFloat(data.tarifDasar) || 0 }
        });
      }

      return layanan;
    });
  },

  updateLayanan: async (id, data) => {
    if (data.tarifDasar !== undefined) {
      data.tarifDasar = parseFloat(data.tarifDasar);
    }
    return await prisma.$transaction(async (tx) => {
      const layanan = await tx.layananKlinik.update({
        where: { id },
        data,
      });

      // Sinkronisasi ke MasterTarifPelayanan via MasterICD9 jika kode layanan ada di ICD-9
      const icd9 = await tx.masterICD9.findUnique({
        where: { kode_icd9: layanan.kodeLayanan }
      });
      if (icd9) {
        await tx.masterTarifPelayanan.updateMany({
          where: { icd9Id: icd9.id_icd9, kategori: 'TINDAKAN' },
          data: { tarif: parseFloat(layanan.tarifDasar) || 0 }
        });
      }

      return layanan;
    });
  }
};

module.exports = klinikService;
