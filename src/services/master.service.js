const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getMasterObat = async (search) => {
  if (!search) {
    return await prisma.masterObat.findMany({
      take: 50,
      orderBy: { namaObat: 'asc' },
    });
  }

  return await prisma.masterObat.findMany({
    where: {
      OR: [
        { namaObat: { contains: search, mode: 'insensitive' } },
        { kodeObat: { contains: search, mode: 'insensitive' } },
      ],
    },
    take: 50,
    orderBy: { namaObat: 'asc' },
  });
};

const createMasterObat = async (data) => {
  return await prisma.masterObat.create({
    data: {
      kodeObat: data.kodeObat,
      namaObat: data.namaObat,
      kategori: data.kategori,
      sediaan: data.sediaan,
      harga: parseFloat(data.harga) || 0,
      stok: parseInt(data.stok) || 0,
      gambarUrl: data.gambarUrl || null,
    },
  });
};

const updateMasterObat = async (id, data) => {
  return await prisma.masterObat.update({
    where: { id },
    data: {
      kodeObat: data.kodeObat,
      namaObat: data.namaObat,
      kategori: data.kategori,
      sediaan: data.sediaan,
      harga: parseFloat(data.harga) || 0,
      stok: parseInt(data.stok) || 0,
      gambarUrl: data.gambarUrl || null,
    },
  });
};

const deleteMasterObat = async (id) => {
  return await prisma.masterObat.delete({
    where: { id },
  });
};

module.exports = {
  getMasterObat,
  createMasterObat,
  updateMasterObat,
  deleteMasterObat,
};
