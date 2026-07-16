const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllPerusahaan = async (statusKerjasama) => {
  // Auto-update status if expired before fetching
  const today = new Date();
  await prisma.perusahaanRekanan.updateMany({
    where: {
      tanggalBerakhir: {
        lt: today
      },
      statusKerjasama: 'AKTIF'
    },
    data: {
      statusKerjasama: 'TIDAK_AKTIF'
    }
  });

  const filter = {};
  if (statusKerjasama) {
    filter.statusKerjasama = statusKerjasama;
  }

  const perusahaanList = await prisma.perusahaanRekanan.findMany({
    where: filter,
    orderBy: { namaPerusahaan: 'asc' }
  });

  return perusahaanList;
};

const createPerusahaan = async (data) => {
  const newPerusahaan = await prisma.perusahaanRekanan.create({
    data
  });
  return newPerusahaan;
};

const updatePerusahaan = async (id, data) => {
  const updatedPerusahaan = await prisma.perusahaanRekanan.update({
    where: { id },
    data
  });
  return updatedPerusahaan;
};

module.exports = {
  getAllPerusahaan,
  createPerusahaan,
  updatePerusahaan
};
