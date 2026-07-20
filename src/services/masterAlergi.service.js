const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllAlergi = async () => {
  return await prisma.masterAlergi.findMany({
    orderBy: { nama_alergi: 'asc' }
  });
};

const createAlergi = async (data) => {
  const { kode_snomed, nama_alergi, kategori, status_aktif } = data;
  
  // Check exist
  const existing = await prisma.masterAlergi.findUnique({
    where: { kode_snomed }
  });
  if (existing) {
    const error = new Error('Kode SNOMED sudah digunakan');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.masterAlergi.create({
    data: {
      kode_snomed,
      nama_alergi,
      kategori,
      status_aktif: status_aktif !== undefined ? status_aktif : true
    }
  });
};

const updateAlergi = async (id, data) => {
  const { kode_snomed, nama_alergi, kategori, status_aktif } = data;
  
  return await prisma.masterAlergi.update({
    where: { id_alergi: id },
    data: {
      kode_snomed,
      nama_alergi,
      kategori,
      status_aktif
    }
  });
};

const deleteAlergi = async (id) => {
  return await prisma.masterAlergi.delete({
    where: { id_alergi: id }
  });
};

module.exports = {
  getAllAlergi,
  createAlergi,
  updateAlergi,
  deleteAlergi
};
