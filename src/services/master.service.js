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
  return await prisma.$transaction(async (tx) => {
    const obat = await tx.masterObat.update({
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

    // Cari AsetLogistik yang berelasi dengan masterObat ini
    const relatedAsets = await tx.asetLogistik.findMany({
      where: { masterObatId: id }
    });

    for (const logistik of relatedAsets) {
      // Update sediaan, hargaBeli & stok pada AsetLogistik
      await tx.asetLogistik.update({
        where: { id: logistik.id },
        data: {
          hargaBeli: parseFloat(data.harga) || 0,
          stok: parseInt(data.stok) || 0,
          sediaan: data.sediaan || null
        }
      });

      // Update namaAset dan kodeAset pada Aset parent
      await tx.aset.update({
        where: { id: logistik.asetId },
        data: {
          namaAset: data.namaObat,
          kodeAset: data.kodeObat
        }
      });
    }

    return obat;
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
