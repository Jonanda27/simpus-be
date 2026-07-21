const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// === TARIF PELAYANAN SERVICES ===
const getTarifPelayanan = async (search, kategori) => {
  const where = {};
  
  if (kategori) {
    where.kategori = kategori;
  }
  
  if (search) {
    where.OR = [
      { namaTarif: { contains: search, mode: 'insensitive' } },
      { kodeTarif: { contains: search, mode: 'insensitive' } }
    ];
  }

  return await prisma.masterTarifPelayanan.findMany({
    where,
    include: {
      icd9: true,
      lab: true
    },
    orderBy: { kodeTarif: 'asc' }
  });
};

const createTarifPelayanan = async (data) => {
  return await prisma.$transaction(async (tx) => {
    const tarif = await tx.masterTarifPelayanan.create({
      data: {
        kodeTarif: data.kodeTarif,
        namaTarif: data.namaTarif,
        kategori: data.kategori,
        tarif: parseFloat(data.tarif) || 0,
        deskripsi: data.deskripsi || null,
        statusAktif: data.statusAktif !== undefined ? (data.statusAktif === 'true' || data.statusAktif === true) : true,
        icd9Id: data.icd9Id || null,
        labId: data.labId || null,
      },
      include: {
        icd9: true,
        lab: true
      }
    });

    // Sinkronisasi ke LayananKlinik jika kategori adalah TINDAKAN
    if (tarif.kategori === 'TINDAKAN' && tarif.icd9Id) {
      const icd9 = await tx.masterICD9.findUnique({
        where: { id_icd9: tarif.icd9Id }
      });
      if (icd9) {
        await tx.layananKlinik.updateMany({
          where: { kodeLayanan: icd9.kode_icd9 },
          data: { tarifDasar: tarif.tarif }
        });
      }
    }

    return tarif;
  });
};

const updateTarifPelayanan = async (id, data) => {
  return await prisma.$transaction(async (tx) => {
    const tarif = await tx.masterTarifPelayanan.update({
      where: { id },
      data: {
        kodeTarif: data.kodeTarif,
        namaTarif: data.namaTarif,
        kategori: data.kategori,
        tarif: parseFloat(data.tarif) || 0,
        deskripsi: data.deskripsi || null,
        statusAktif: data.statusAktif !== undefined ? (data.statusAktif === 'true' || data.statusAktif === true) : true,
        icd9Id: data.icd9Id || null,
        labId: data.labId || null,
      },
      include: {
        icd9: true,
        lab: true
      }
    });

    // Sinkronisasi ke LayananKlinik jika kategori adalah TINDAKAN
    if (tarif.kategori === 'TINDAKAN' && tarif.icd9Id) {
      const icd9 = await tx.masterICD9.findUnique({
        where: { id_icd9: tarif.icd9Id }
      });
      if (icd9) {
        await tx.layananKlinik.updateMany({
          where: { kodeLayanan: icd9.kode_icd9 },
          data: { tarifDasar: tarif.tarif }
        });
      }
    }

    return tarif;
  });
};

const deleteTarifPelayanan = async (id) => {
  return await prisma.masterTarifPelayanan.delete({
    where: { id }
  });
};


// === TARIF FARMASI SERVICES ===
const getTarifFarmasi = async (search) => {
  const where = {};
  
  if (search) {
    where.kategoriObat = { contains: search, mode: 'insensitive' };
  }

  return await prisma.masterTarifFarmasi.findMany({
    where,
    orderBy: { kategoriObat: 'asc' }
  });
};

const createTarifFarmasi = async (data) => {
  return await prisma.masterTarifFarmasi.create({
    data: {
      kategoriObat: data.kategoriObat,
      marginPersen: parseFloat(data.marginPersen) || 0,
      tuslah: parseFloat(data.tuslah) || 0,
      deskripsi: data.deskripsi || null,
      statusAktif: data.statusAktif !== undefined ? (data.statusAktif === 'true' || data.statusAktif === true) : true,
    }
  });
};

const updateTarifFarmasi = async (id, data) => {
  return await prisma.masterTarifFarmasi.update({
    where: { id },
    data: {
      kategoriObat: data.kategoriObat,
      marginPersen: parseFloat(data.marginPersen) || 0,
      tuslah: parseFloat(data.tuslah) || 0,
      deskripsi: data.deskripsi || null,
      statusAktif: data.statusAktif !== undefined ? (data.statusAktif === 'true' || data.statusAktif === true) : true,
    }
  });
};

const deleteTarifFarmasi = async (id) => {
  return await prisma.masterTarifFarmasi.delete({
    where: { id }
  });
};

const getAllMasterICD9 = async () => {
  return await prisma.masterICD9.findMany({
    orderBy: { kode_icd9: 'asc' }
  });
};

const getAllMasterLab = async () => {
  return await prisma.masterLaboratorium.findMany({
    orderBy: { parameter: 'asc' }
  });
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
