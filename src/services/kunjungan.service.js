const prisma = require('../config/prisma');

/**
 * Get all Kunjungan with status MENUNGGU for Screening
 */
const getKunjunganScreening = async (user) => {
  const whereClause = {
    statusKunjungan: 'MENUNGGU',
  };

  // Filter isolasi data: Perawat hanya melihat antrian di Polinya
  if (user && user.role === 'PERAWAT' && user.poliklinikId) {
    whereClause.poliklinikId = user.poliklinikId;
  }

  const kunjungans = await prisma.kunjungan.findMany({
    where: whereClause,
    include: {
      pasien: true,
      poliklinik: true,
      dokterTujuan: {
        select: {
          id: true,
          username: true,
          namaLengkap: true,
          role: true,
        }
      }
    },
    orderBy: [
      { tanggalRegistrasi: 'asc' },
      { jamRegistrasi: 'asc' },
    ],
  });

  return kunjungans;
};

/**
 * Panggil Kunjungan (Status Locking)
 */
const panggilKunjungan = async (kunjunganId, petugasId) => {
  // Gunakan transaction untuk locking
  return await prisma.$transaction(async (tx) => {
    const kunjungan = await tx.kunjungan.findUnique({
      where: { id: kunjunganId },
    });

    if (!kunjungan) {
      const err = new Error('Data Kunjungan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (kunjungan.statusKunjungan !== 'MENUNGGU') {
      const err = new Error('Maaf, pasien ini sudah dipanggil oleh perawat lain atau sudah diproses.');
      err.statusCode = 400;
      throw err;
    }

    // Lock status menjadi DIPROSES_SCREENING
    const updated = await tx.kunjungan.update({
      where: { id: kunjunganId },
      data: {
        statusKunjungan: 'DIPROSES_SCREENING',
        // Idealnya kita bisa menyimpan petugasScreeningId ke Kunjungan, tapi karena belum ada di schema,
        // kita cukup ganti status saja untuk me-lock antrean.
      },
    });

    return updated;
  });
};

const getKunjunganById = async (id) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id },
    include: {
      pasien: true,
      poliklinik: true,
      dokterTujuan: {
        select: { id: true, namaLengkap: true, username: true }
      }
    },
  });
  if (!kunjungan) {
    const err = new Error('Data Kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return kunjungan;
};

// Tambahkan fungsi ini di src/services/kunjungan.service.js
const updateStatusKunjungan = async (kunjunganId, statusBaru) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId }
  });

  if (!kunjungan) {
    const err = new Error('Data Kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  // Update status menggunakan Prisma
  return await prisma.kunjungan.update({
    where: { id: kunjunganId },
    data: { statusKunjungan: statusBaru }
  });
};


module.exports = {
  getKunjunganScreening,
  panggilKunjungan,
  getKunjunganById,
  updateStatusKunjungan
};
