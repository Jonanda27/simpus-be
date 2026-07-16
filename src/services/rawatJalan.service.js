const prisma = require('../config/prisma');
const ukmService = require('./ukm.service');

/**
 * Get antrian pasien untuk dokter (status MENUNGGU_DOKTER)
 * Include pasien + screening perawat
 */
const getAntrianDokter = async (user) => {
  const whereClause = {
    statusKunjungan: {
      in: ['MENUNGGU_DOKTER', 'DIPERIKSA', 'MENUNGGU_LAB'],
    },
  };

  // Filter isolasi data: 
  // Dokter/Perawat hanya melihat antrian jika pasien masuk ke Poli-nya.
  if (user && (user.role === 'DOKTER' || user.role === 'PERAWAT') && user.poliklinikId) {
    whereClause.OR = [
      { poliklinikId: user.poliklinikId },
      { dokterTujuanId: user.id }
    ];
  }

  const kunjungans = await prisma.kunjungan.findMany({
    where: whereClause,
    include: {
      pasien: true,
      poliklinik: true,
      screening: true,
      rekamMedis: true,
      dokterTujuan: {
        select: { id: true, namaLengkap: true, username: true },
      },
      orderLab: {
        include: {
          details: true
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
 * Get riwayat rekam medis (pasien selesai) untuk dokter
 */
const getRiwayatDokter = async (user) => {
  const whereClause = {
    statusKunjungan: {
      in: ['SELESAI', 'MENUNGGU_FARMASI', 'PULANG'],
    },
  };

  if (user && user.role === 'DOKTER') {
    whereClause.OR = [
      { poliklinikId: user.poliklinikId },
      { dokterTujuanId: user.id }
    ];
  }

  const kunjungans = await prisma.kunjungan.findMany({
    where: whereClause,
    include: {
      pasien: true,
      poliklinik: true,
      rekamMedis: true,
      diagnosis: {
        include: {
          icd10: true
        }
      },
      dokterTujuan: {
        select: { id: true, namaLengkap: true },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 100, // Limit to 100 recent histories
  });

  return kunjungans;
};

/**
 * Get seluruh riwayat kunjungan detail satu pasien berdasarkan noRM
 */
const getRiwayatPasienByRM = async (noRM) => {
  const pasien = await prisma.pasien.findUnique({
    where: { noRM },
    include: {
      kunjungans: {
        where: {
          statusKunjungan: {
            in: ['SELESAI', 'MENUNGGU_FARMASI', 'PULANG'],
          },
        },
        orderBy: [
          { tanggalRegistrasi: 'desc' },
          { jamRegistrasi: 'desc' },
        ],
        include: {
          poliklinik: true,
          dokterTujuan: {
            select: { id: true, namaLengkap: true },
          },
          screening: true,
          rekamMedis: true,
          diagnosis: {
            include: { icd10: true }
          },
          tindakans: {
            include: { icd9: true }
          },
          resep: {
            include: {
              details: {
                include: { obat: true }
              }
            }
          },
          orderLab: {
            include: { details: true }
          }
        },
      },
    },
  });

  if (!pasien) {
    const err = new Error('Data pasien tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  return pasien;
};

/**
 * Mulai pemeriksaan: lock status → DIPERIKSA, buat RekamMedis DRAFT
 */
const mulaiPemeriksaan = async (kunjunganId, dokterId) => {
  return await prisma.$transaction(async (tx) => {
    const kunjungan = await tx.kunjungan.findUnique({
      where: { id: kunjunganId },
      include: { rekamMedis: true },
    });

    if (!kunjungan) {
      const err = new Error('Data kunjungan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Jika sudah ada rekam medis (sudah pernah dimulai), kembalikan saja
    if (kunjungan.rekamMedis) {
      // Update status hanya jika masih MENUNGGU atau MENUNGGU_DOKTER
      if (['MENUNGGU', 'MENUNGGU_DOKTER'].includes(kunjungan.statusKunjungan)) {
        await tx.kunjungan.update({
          where: { id: kunjunganId },
          data: { statusKunjungan: 'DIPERIKSA' },
        });
      }
      return kunjungan.rekamMedis;
    }

    // Lock status kunjungan jika masih baru
    if (['MENUNGGU', 'MENUNGGU_DOKTER'].includes(kunjungan.statusKunjungan)) {
      await tx.kunjungan.update({
        where: { id: kunjunganId },
        data: { statusKunjungan: 'DIPERIKSA' },
      });
    }

    // Buat RekamMedis baru (DRAFT)
    const rekamMedis = await tx.rekamMedis.create({
      data: {
        kunjunganId,
        pasienId: kunjungan.pasienId,
        dokterId,
        statusPemeriksaan: 'DRAFT',
      },
    });

    return rekamMedis;
  });
};

/**
 * Simpan / Update data SOAP
 */
const simpanSOAP = async (rekamMedisId, data) => {
  const updated = await prisma.rekamMedis.update({
    where: { id: rekamMedisId },
    data: {
      // S - Subjektif
      keluhanUtama: data.keluhanUtama ?? undefined,
      riwayatPenyakitSekarang: data.riwayatPenyakitSekarang ?? undefined,
      riwayatPenyakitDahulu: data.riwayatPenyakitDahulu ?? undefined,
      riwayatAlergi: data.riwayatAlergi ?? undefined,

      // O - Objektif
      keadaanUmum: data.keadaanUmum ?? undefined,
      kesadaran: data.kesadaran ?? undefined,
      pemeriksaanFisik: data.pemeriksaanFisik ?? undefined,
      hasilPenunjang: data.hasilPenunjang ?? undefined,

      // A - Asesmen
      diagnosisKlinis: data.diagnosisKlinis ?? undefined,

      // P - Plan
      rencanaTerapi: data.rencanaTerapi ?? undefined,
      instruksiMedis: data.instruksiMedis ?? undefined,
    },
  });

  return updated;
};

/**
 * Simpan diagnosa ICD-10 (bulk create)
 */
const simpanDiagnosa = async (kunjunganId, user, diagnosaArr) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId },
  });

  if (!kunjungan) {
    const err = new Error('Data kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const dokterId = kunjungan.dokterTujuanId || user.id;
  const penginputId = user.role === 'PERAWAT' ? user.id : null;

  // Hapus diagnosa lama untuk kunjungan ini (replace strategy)
  await prisma.diagnosisPasien.deleteMany({
    where: { kunjunganId },
  });

  // Bulk create diagnosa baru
  const created = await prisma.diagnosisPasien.createMany({
    data: diagnosaArr.map((d) => ({
      pasienId: kunjungan.pasienId,
      kunjunganId,
      icd10Id: d.icd10Id,
      dokterId,
      penginputId,
      jenisDiagnosis: d.jenisDiagnosis || 'Utama',
      diagnosisKlinis: d.diagnosisKlinis || null,
      statusDiagnosis: 'Kerja',
    })),
  });

  // Auto-register ke modul UKM jika terdeteksi penyakit menular
  for (const d of diagnosaArr) {
    if (d.icd10Id) {
      const icd10 = await prisma.masterICD10.findUnique({ where: { id_icd10: d.icd10Id } });
      if (icd10 && icd10.kode_icd10) {
        await ukmService.autoRegisterUKM(kunjungan.pasienId, icd10.kode_icd10);
      }
    }
  }

  return created;
};

/**
 * Simpan tindakan ICD-9 (bulk create)
 */
const simpanTindakan = async (kunjunganId, user, tindakanArr) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId },
  });

  if (!kunjungan) {
    const err = new Error('Data kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  // Hapus tindakan lama untuk kunjungan ini (replace strategy)
  await prisma.tindakanPasien.deleteMany({
    where: { kunjunganId },
  });

  // Bulk create tindakan baru
  const created = await prisma.tindakanPasien.createMany({
    data: tindakanArr.map((t) => ({
      pasienId: kunjungan.pasienId,
      kunjunganId,
      icd9Id: t.icd9Id,
      pelaksanaId: user.id,
      pelaksanaTeks: t.pelaksana || (user.role === 'PERAWAT' ? 'Perawat' : 'Dokter'),
      catatanTindakan: t.catatan || null,
    })),
  });

  return created;
};

/**
 * Selesaikan pemeriksaan: update status RekamMedis + Kunjungan
 */
const selesaikanPemeriksaan = async (kunjunganId, user) => {
  return await prisma.$transaction(async (tx) => {
    // Update rekam medis → SELESAI
    const updateData = { statusPemeriksaan: 'SELESAI' };
    
    // Jika yang menyelesaikan adalah PERAWAT, rekam ID penginputnya
    if (user && user.role === 'PERAWAT') {
      updateData.penginputId = user.id;
    }

    const rm = await tx.rekamMedis.update({
      where: { kunjunganId },
      data: updateData,
    });

    return rm;
  });
};

/**
 * Get rekam medis by kunjungan ID
 */
const getRekamMedisByKunjungan = async (kunjunganId) => {
  const rm = await prisma.rekamMedis.findUnique({
    where: { kunjunganId },
    include: {
      pasien: true,
      dokter: { select: { id: true, namaLengkap: true } },
    },
  });
  return rm;
};

/**
 * Get diagnosa by kunjungan ID
 */
const getDiagnosaByKunjungan = async (kunjunganId) => {
  const diagnosa = await prisma.diagnosisPasien.findMany({
    where: { kunjunganId },
    include: {
      icd10: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return diagnosa;
};

/**
 * Get tindakan by kunjungan ID
 */
const getTindakanByKunjungan = async (kunjunganId) => {
  const tindakan = await prisma.tindakanPasien.findMany({
    where: { kunjunganId },
    include: {
      icd9: true,
    },
    orderBy: { waktuTindakan: 'asc' },
  });
  return tindakan;
};

/**
 * Simpan Resep
 */
const simpanResep = async (kunjunganId, user, resepArr) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId },
  });

  if (!kunjungan) {
    const err = new Error('Data kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const dokterId = kunjungan.dokterTujuanId || user.id;
  const penginputId = user.role === 'PERAWAT' ? user.id : null;

  return await prisma.$transaction(async (tx) => {
    // Buat record Resep
    const resep = await tx.resep.create({
      data: {
        kunjunganId,
        pasienId: kunjungan.pasienId,
        dokterId,
        penginputId,
        status: 'MENUNGGU_FARMASI',
      },
    });

    // Buat detail resep
    const details = resepArr.map((r) => ({
      resepId: resep.id,
      obatId: r.obatId,
      jumlah: r.qty,
      aturanPakai: r.signa,
      catatan: r.catatan || null,
    }));

    await tx.resepDetail.createMany({ data: details });

    // Akhiri kunjungan dari poli
    await tx.kunjungan.update({
      where: { id: kunjunganId },
      data: { statusKunjungan: 'MENUNGGU_KASIR' },
    });

    return resep;
  });
};

/**
 * Simpan Rujukan
 */
const simpanRujukan = async (kunjunganId, dokterId, rujukanData) => {
  const kunjungan = await prisma.kunjungan.findUnique({ where: { id: kunjunganId } });
  if (!kunjungan) throw new Error('Kunjungan tidak ditemukan');

  return await prisma.$transaction(async (tx) => {
    const rujukan = await tx.rujukanKeluar.create({
      data: {
        kunjunganId,
        pasienId: kunjungan.pasienId,
        dokterId,
        faskesTujuan: rujukanData.faskesTujuan,
        poliTujuan: rujukanData.poliTujuan,
        alasanRujukan: rujukanData.alasanRujukan,
      },
    });

    // Akhiri kunjungan dari poli
    await tx.kunjungan.update({
      where: { id: kunjunganId },
      data: { statusKunjungan: 'MENUNGGU_KASIR' },
    });

    return rujukan;
  });
};

/**
 * Pulang tanpa resep/rujukan
 */
const pulang = async (kunjunganId) => {
  return await prisma.kunjungan.update({
    where: { id: kunjunganId },
    data: { statusKunjungan: 'MENUNGGU_KASIR' },
  });
};

module.exports = {
  getAntrianDokter,
  mulaiPemeriksaan,
  simpanSOAP,
  simpanDiagnosa,
  simpanTindakan,
  selesaikanPemeriksaan,
  getRekamMedisByKunjungan,
  getDiagnosaByKunjungan,
  getTindakanByKunjungan,
  simpanResep,
  simpanRujukan,
  pulang,
  getRiwayatDokter,
  getRiwayatPasienByRM,
};
