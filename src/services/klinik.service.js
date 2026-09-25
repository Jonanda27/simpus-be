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
        namaLengkap: true,
        role: true,
      },
      orderBy: [
        { namaLengkap: 'asc' },
        { username: 'asc' }
      ],
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
    return await prisma.layananKlinik.create({
      data: {
        poliklinikId: data.poliklinikId,
        kodeLayanan: data.kodeLayanan,
        namaLayanan: data.namaLayanan,
        deskripsi: data.deskripsi,
        tarifDasar: data.tarifDasar ? parseFloat(data.tarifDasar) : 0,
        statusAktif: data.statusAktif !== undefined ? data.statusAktif : true,
      },
    });
  },

  updateLayanan: async (id, data) => {
    if (data.tarifDasar !== undefined) {
      data.tarifDasar = parseFloat(data.tarifDasar);
    }
    return await prisma.layananKlinik.update({
      where: { id },
      data,
    });
  }
};

module.exports = klinikService;
