'use strict';

const prisma = require('../config/prisma');

/**
 * Service Referensi Enum untuk Master Dropdown Frontend
 */

const getReferensiByType = async (type) => {
  const typeMap = {
    'jenis-penjamin': () => prisma.refJenisPenjamin.findMany({ where: { statusAktif: true }, orderBy: { urutan: 'asc' } }),
    'jenis-pelayanan': () => prisma.refJenisPelayanan.findMany({ where: { statusAktif: true } }),
    'cara-datang': () => prisma.refCaraDatang.findMany({ where: { statusAktif: true } }),
    'prioritas': () => prisma.refPrioritas.findMany({ where: { statusAktif: true }, orderBy: { urutan: 'asc' } }),
    'kategori-triage': () => prisma.refKategoriTriage.findMany({ orderBy: { urutan: 'asc' } }),
    'metode-pembayaran': () => prisma.refMetodePembayaran.findMany({ where: { statusAktif: true } }),
    'sediaan-obat': () => prisma.refSediaanObat.findMany({ where: { statusAktif: true } }),
    'kategori-obat': () => prisma.refKategoriObat.findMany({ where: { statusAktif: true } }),
  };

  const fetcher = typeMap[type];
  if (!fetcher) {
    const error = new Error(`Tipe referensi '${type}' tidak dikenal.`);
    error.statusCode = 400;
    throw error;
  }

  return await fetcher();
};

/**
 * Mengambil SELURUH referensi dropdown dalam 1 panggilan API (High Performance for FE Form Initial Load)
 */
const getAllReferensi = async () => {
  const [
    jenisPenjamin,
    jenisPelayanan,
    caraDatang,
    prioritas,
    kategoriTriage,
    metodePembayaran,
    sediaanObat,
    kategoriObat,
  ] = await Promise.all([
    prisma.refJenisPenjamin.findMany({ where: { statusAktif: true }, orderBy: { urutan: 'asc' } }),
    prisma.refJenisPelayanan.findMany({ where: { statusAktif: true } }),
    prisma.refCaraDatang.findMany({ where: { statusAktif: true } }),
    prisma.refPrioritas.findMany({ where: { statusAktif: true }, orderBy: { urutan: 'asc' } }),
    prisma.refKategoriTriage.findMany({ orderBy: { urutan: 'asc' } }),
    prisma.refMetodePembayaran.findMany({ where: { statusAktif: true } }),
    prisma.refSediaanObat.findMany({ where: { statusAktif: true } }),
    prisma.refKategoriObat.findMany({ where: { statusAktif: true } }),
  ]);

  return {
    jenisPenjamin,
    jenisPelayanan,
    caraDatang,
    prioritas,
    kategoriTriage,
    metodePembayaran,
    sediaanObat,
    kategoriObat,
  };
};

module.exports = {
  getReferensiByType,
  getAllReferensi,
};
