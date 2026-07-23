const prisma = require('../config/prisma');
const ukmService = require('./ukm.service');
const satusehatService = require('./satusehat.service');
const SatuSehatGateway = require('./satusehat/gateway.service');
const { toRawatJalanBundle } = require('../utils/fhir-mappers');

/**
 * Helper to extract Observation vital signs from screening record
 */
const extractObservationsFromScreening = (screening) => {
  if (!screening) return [];
  const obs = [];

  if (screening.tekananDarahSistolik || screening.tekananDarahDiastolik) {
    obs.push({
      loincCode: "85354-9",
      loincDisplay: "Blood pressure panel with all children optional",
      components: [
        {
          code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
          valueQuantity: { value: screening.tekananDarahSistolik || 120, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        },
        {
          code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
          valueQuantity: { value: screening.tekananDarahDiastolik || 80, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        }
      ]
    });
  }

  if (screening.nadi) {
    obs.push({
      loincCode: "8867-4",
      loincDisplay: "Heart rate",
      value: screening.nadi,
      unit: "/min",
      unitCode: "/min"
    });
  }

  if (screening.frekuensiNapas) {
    obs.push({
      loincCode: "9279-1",
      loincDisplay: "Respiratory rate",
      value: screening.frekuensiNapas,
      unit: "/min",
      unitCode: "/min"
    });
  }

  if (screening.suhuTubuh) {
    obs.push({
      loincCode: "8310-5",
      loincDisplay: "Body temperature",
      value: screening.suhuTubuh,
      unit: "C",
      unitCode: "Cel"
    });
  }

  if (screening.tinggiBadan) {
    obs.push({
      loincCode: "8302-2",
      loincDisplay: "Body height",
      value: screening.tinggiBadan,
      unit: "cm",
      unitCode: "cm"
    });
  }

  if (screening.beratBadan) {
    obs.push({
      loincCode: "29463-7",
      loincDisplay: "Body weight",
      value: screening.beratBadan,
      unit: "kg",
      unitCode: "kg"
    });
  }

  return obs;
};

/**
 * Get antrian pasien untuk dokter (status MENUNGGU_DOKTER)
 * Include pasien + screening perawat
 */
const getAntrianDokter = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const whereClause = {
    tanggalRegistrasi: { gte: today, lt: tomorrow },
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

  let kunjungans = await prisma.kunjungan.findMany({
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
    }
  });

  // Kalkulasi Skor Prioritas
  kunjungans = kunjungans.map(kunjungan => {
    let score = 1; // Default: Umum (Hijau)
    
    const triage = kunjungan.screening?.kategoriTriage?.toLowerCase() || '';
    if (triage === 'merah') {
      score = 4;
    } else if (triage === 'kuning') {
      score = 3;
    } else if (triage === 'hitam') {
      score = 0; // Ditangani khusus, biasanya tidak di poli
    } else {
      // Jika Hijau / Belum Triage, cek prioritas demografi
      const prioritas = kunjungan.prioritas?.toLowerCase() || '';
      if (['lansia', 'disabilitas', 'ibu hamil', 'bayi', 'anak'].some(p => prioritas.includes(p))) {
        score = 2;
      }
    }
    
    return { ...kunjungan, _priorityScore: score };
  });

  // Sort: Skor tertinggi di atas. Jika skor sama, urutkan berdasarkan waktu kedatangan.
  kunjungans.sort((a, b) => {
    if (b._priorityScore !== a._priorityScore) {
      return b._priorityScore - a._priorityScore;
    }
    
    // Konversi jam ke object Date untuk perbandingan akurat
    const dateStrA = a.tanggalRegistrasi.toISOString().split('T')[0];
    const dateStrB = b.tanggalRegistrasi.toISOString().split('T')[0];
    const dateTimeA = new Date(`${dateStrA}T${a.jamRegistrasi || '00:00'}:00`);
    const dateTimeB = new Date(`${dateStrB}T${b.jamRegistrasi || '00:00'}:00`);
    
    return dateTimeA - dateTimeB;
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
        data: {
          statusKunjungan: 'DIPERIKSA',
          waktuPemeriksaanMulai: new Date(),
        },
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
    include: {
      pasien: true,
      dokterTujuan: { include: { tenagaMedis: true } }
    }
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
      statusKlinis: d.statusKlinis || 'Aktif',
      statusDiagnosis: d.statusVerifikasi || 'Suspek',
    })),
  });

  let conditionCount = 0;

  // Proses lanjutan per diagnosa (UKM dan SATUSEHAT)
  for (const d of diagnosaArr) {
    if (d.icd10Id) {
      const icd10 = await prisma.masterICD10.findUnique({ where: { id_icd10: d.icd10Id } });
      
      if (icd10 && icd10.kode_icd10) {
        // Auto-register ke modul UKM
        await ukmService.autoRegisterUKM(kunjungan.pasienId, icd10.kode_icd10);
        
        // Sync ke SATUSEHAT Condition (Diagnosa)
        const dokterTujuan = kunjungan.dokterTujuan;
        if (kunjungan.encounterId && kunjungan.pasien?.noIHS && dokterTujuan?.tenagaMedis?.noIHS) {
          try {
            await satusehatService.createCondition({
              pasienIhs: kunjungan.pasien.noIHS,
              pasienName: kunjungan.pasien.namaLengkap,
              dokterIhs: dokterTujuan.tenagaMedis.noIHS,
              dokterName: dokterTujuan.namaLengkap,
              encounterId: kunjungan.encounterId,
              kodeIcd10: icd10.kode_icd10,
              namaDiagnosis: icd10.nama_diagnosis,
              statusDiagnosis: d.statusVerifikasi || 'Suspek',
              statusKlinis: d.statusKlinis || 'Aktif'
            });
            conditionCount++;
          } catch (err) {
            console.error(`Error sync Condition SATUSEHAT untuk ICD ${icd10.kode_icd10}:`, err.message);
          }
        }
      }
    }
  }

  // Update status SATUSEHAT di Kunjungan
  if (conditionCount > 0) {
    const syncStatus = (typeof kunjungan.satusehatSync === 'object' && kunjungan.satusehatSync !== null) 
      ? { ...kunjungan.satusehatSync } 
      : {};
    
    syncStatus.Condition = { status: 'SUCCESS', detail: `Sent ${conditionCount} diagnosis conditions` };
    
    await prisma.kunjungan.update({
      where: { id: kunjunganId },
      data: { satusehatSync: syncStatus }
    });
  }

  return created;
};

/**
 * Simpan tindakan ICD-9 (bulk create)
 */
const simpanTindakan = async (kunjunganId, user, tindakanArr) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId },
    include: {
      pasien: true,
      dokterTujuan: { include: { tenagaMedis: true } }
    }
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

  // -------------------------------------
  // Sinkronisasi SATUSEHAT (Procedure)
  // -------------------------------------
  let procedureCount = 0;
  for (const t of tindakanArr) {
    if (t.icd9Id) {
      const icd9 = await prisma.masterICD9.findUnique({ where: { id_icd9: t.icd9Id } });
      
      if (icd9 && icd9.kode_icd9) {
        // Sync ke SATUSEHAT Procedure (Tindakan)
        const dokterTujuan = kunjungan.dokterTujuan;
        // Kita menggunakan IHS dokter penanggung jawab sesuai kesepakatan plan
        if (kunjungan.encounterId && kunjungan.pasien?.noIHS && dokterTujuan?.tenagaMedis?.noIHS) {
          try {
            await satusehatService.createProcedure({
              pasienIhs: kunjungan.pasien.noIHS,
              pasienName: kunjungan.pasien.namaLengkap,
              dokterIhs: dokterTujuan.tenagaMedis.noIHS,
              dokterName: dokterTujuan.namaLengkap,
              encounterId: kunjungan.encounterId,
              kodeIcd9: icd9.kode_icd9,
              namaProsedur: icd9.nama_prosedur,
              tindakanId: `${kunjunganId}-${icd9.id_icd9}`, // ID unik lokal
              waktuTindakan: new Date().toISOString()
            });
            procedureCount++;
          } catch (err) {
            console.error(`Error sync Procedure SATUSEHAT untuk ICD-9 ${icd9.kode_icd9}:`, err.message);
          }
        }
      }
    }
  }

  // Update status SATUSEHAT di Kunjungan
  if (procedureCount > 0) {
    const syncStatus = (typeof kunjungan.satusehatSync === 'object' && kunjungan.satusehatSync !== null) 
      ? { ...kunjungan.satusehatSync } 
      : {};
    
    syncStatus.Procedure = { status: 'SUCCESS', detail: `Sent ${procedureCount} procedures` };
    
    await prisma.kunjungan.update({
      where: { id: kunjunganId },
      data: { satusehatSync: syncStatus }
    });
  }

  return created;
};

/**
 * Simpan data alergi pasien (bulk create) dan sinkronisasi ke SATUSEHAT
 */
const simpanAlergi = async (kunjunganId, alergiArr, user) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId },
    include: {
      pasien: true,
      dokterTujuan: { include: { tenagaMedis: true } }
    }
  });

  if (!kunjungan) {
    const err = new Error('Data kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  // Hapus alergi lama
  await prisma.alergiPasien.deleteMany({
    where: { kunjunganId }
  });

  if (!alergiArr || alergiArr.length === 0) return [];

  // Create new alergi
  await prisma.alergiPasien.createMany({
    data: alergiArr.map((a) => ({
      pasienId: kunjungan.pasienId,
      kunjunganId,
      alergiId: a.alergiId,
      manifestasiKode: a.manifestasiKode,
      manifestasiNama: a.manifestasiNama,
      tingkatKeparahan: a.tingkatKeparahan || 'low'
    }))
  });

  // Fetch inserted data to get the relations
  const insertedAlergis = await prisma.alergiPasien.findMany({
    where: { kunjunganId },
    include: { alergiMaster: true }
  });

  // Sinkronisasi ke SATUSEHAT secara asinkron hanya jika yang menyimpan adalah DOKTER
  if (user && user.role === 'DOKTER') {
    const { createAllergyIntolerance } = require('./satusehat.service');
    let syncLogs = kunjungan.satusehatSync || {};
    if (typeof syncLogs !== 'object') syncLogs = {};
    if (!syncLogs.allergy) syncLogs.allergy = [];

    for (const alergi of insertedAlergis) {
    if (kunjungan.encounterId && kunjungan.dokterTujuan?.tenagaMedis?.noIHS && kunjungan.pasien?.noIHS) {
      try {
        const res = await createAllergyIntolerance(kunjungan.pasien, kunjungan.dokterTujuan, kunjungan, alergi);
        if (res.success) {
          syncLogs.allergy.push({
            idLokal: alergi.id,
            allergyId: res.allergyId,
            status: 'SUCCESS',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Gagal sinkronisasi alergi ke SATUSEHAT:", error.message);
      }
    }
  }

    // Update kunjungan sync logs
    await prisma.kunjungan.update({
      where: { id: kunjunganId },
      data: { satusehatSync: syncLogs }
    });
  }

  return insertedAlergis;
};

/**
 * Selesaikan pemeriksaan: update status RekamMedis + Kunjungan
 * Dan trigger FHIR Transaction Bundle ke SATUSEHAT
 */
const selesaikanPemeriksaan = async (kunjunganId, user) => {
  // 1. Selesaikan transaksi medis lokal (RekamMedis & Kunjungan)
  const rm = await prisma.$transaction(async (tx) => {
    const updateData = { statusPemeriksaan: 'SELESAI' };
    if (user && user.role === 'PERAWAT') {
      updateData.penginputId = user.id;
    }

    const updatedRm = await tx.rekamMedis.update({
      where: { kunjunganId },
      data: updateData,
    });

    await tx.kunjungan.update({
      where: { id: kunjunganId },
<<<<<<< HEAD
      data: {
        statusPulang: 'PULANG_SEMBUH',
        waktuPemeriksaanSelesai: new Date(),
      },
    });

    return rm;
=======
      data: { 
        statusKunjungan: 'SELESAI',
        waktuDischarge: new Date()
      },
    });

    return updatedRm;
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
  });

  // 2. Tarik data lengkap untuk Bundle Transaction SATUSEHAT
  let syncStatus = 'PENDING';
  let lastError = null;

  try {
    const dataComplete = await prisma.kunjungan.findUnique({
      where: { id: kunjunganId },
      include: {
        pasien: true,
        poliklinik: true,
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
        dokterTujuan: {
          include: { tenagaMedis: true }
        }
      }
    });

    if (dataComplete) {
      // Ekstrak detail resep
      const resepDetails = [];
      if (Array.isArray(dataComplete.resep)) {
        dataComplete.resep.forEach(r => {
          if (Array.isArray(r.details)) {
            r.details.forEach(d => resepDetails.push({ ...d, resepId: r.id }));
          }
        });
      }

      // Ekstrak vital signs dari screening
      const observations = extractObservationsFromScreening(dataComplete.screening);

      const completePayload = {
        ...dataComplete,
        observations,
        resepDetails,
        satusehat_encounter_id: dataComplete.satusehat_encounter_id || dataComplete.satusehatId || dataComplete.encounterId
      };

      // 3. Buat Bundle Transaction Payload
      const bundlePayload = toRawatJalanBundle(completePayload);

      // 4. Kirim ke SATUSEHAT
      console.log(`[SATUSEHAT RawatJalan] Mengirim Bundle Transaction untuk kunjungan ${kunjunganId}...`);
      const response = await SatuSehatGateway.sendBundleTransaction(bundlePayload);
      
      syncStatus = 'SUCCESS';
      lastError = null;

      // Update DB lokal dengan status SUCCESS
      await prisma.kunjungan.update({
        where: { id: kunjunganId },
        data: {
          satusehat_sync_status: 'SUCCESS',
          satusehat_last_error: null,
          satusehatSync: {
            bundleTransaction: {
              status: 'SUCCESS',
              response,
              timestamp: new Date().toISOString()
            }
          }
        }
      });
    }
  } catch (error) {
    syncStatus = 'FAILED';
    lastError = error.message || String(error);
    console.error(`[SATUSEHAT RawatJalan] Gagal sync Bundle Transaction untuk kunjungan ${kunjunganId}:`, lastError);

    // Update DB lokal dengan status FAILED tanpa membatalkan transaksi medis lokal
    try {
      await prisma.kunjungan.update({
        where: { id: kunjunganId },
        data: {
          satusehat_sync_status: 'FAILED',
          satusehat_last_error: lastError
        }
      });
    } catch (dbErr) {
      console.error(`[DB Error] Gagal update satusehat_last_error:`, dbErr.message);
    }
  }

  return {
    rekamMedis: rm,
    satusehat_sync_status: syncStatus,
    satusehat_last_error: lastError
  };
};

/**
 * Tunda pemeriksaan: kembalikan status Kunjungan ke MENUNGGU_DOKTER
 */
const tundaPemeriksaan = async (kunjunganId) => {
  return await prisma.kunjungan.update({
    where: { id: kunjunganId },
    data: { statusKunjungan: 'MENUNGGU_DOKTER' },
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
 * Get alergi by kunjungan ID
 */
const getAlergiByKunjungan = async (kunjunganId) => {
  return await prisma.alergiPasien.findMany({
    where: { kunjunganId },
    include: { alergiMaster: true },
    orderBy: { createdAt: 'asc' }
  });
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
    include: {
      pasien: true,
      dokterTujuan: { include: { tenagaMedis: true } }
    }
  });

  if (!kunjungan) {
    const err = new Error('Data kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const dokterId = kunjungan.dokterTujuanId || user.id;
  const penginputId = user.role === 'PERAWAT' ? user.id : null;

  const result = await prisma.$transaction(async (tx) => {
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

    return { resep, details };
  });

  // -------------------------------------
  // Sinkronisasi SATUSEHAT (Luar transaksi)
  // -------------------------------------
  let medCount = 0;
  for (const det of result.details) {
    const obat = await prisma.masterObat.findUnique({ where: { id: det.obatId } });
    if (obat && obat.kodeObat && kunjungan.encounterId && kunjungan.pasien?.noIHS && kunjungan.dokterTujuan?.tenagaMedis?.noIHS) {
      try {
        await satusehatService.createPrescription({
          pasienIhs: kunjungan.pasien.noIHS,
          pasienName: kunjungan.pasien.namaLengkap,
          dokterIhs: kunjungan.dokterTujuan.tenagaMedis.noIHS,
          dokterName: kunjungan.dokterTujuan.namaLengkap,
          encounterId: kunjungan.encounterId,
          kodeObat: obat.kodeObat,
          namaObat: obat.namaObat,
          sediaan: obat.sediaan,
          resepId: result.resep.id,
          resepDetailId: `${result.resep.id}-${obat.id}`, // ID unik lokal
          jumlah: det.jumlah,
          aturanPakai: det.aturanPakai
        });
        medCount++;
      } catch (err) {
        console.error(`Error sync Prescription SATUSEHAT untuk Obat ${obat.kodeObat}:`, err.message);
      }
    }
  }

  // Update status SATUSEHAT di Kunjungan
  if (medCount > 0) {
    const syncStatus = (typeof kunjungan.satusehatSync === 'object' && kunjungan.satusehatSync !== null) 
      ? { ...kunjungan.satusehatSync } 
      : {};
    
    syncStatus.Medication = { status: 'SUCCESS', detail: `Sent ${medCount} medications` };
    syncStatus.MedicationRequest = { status: 'SUCCESS', detail: `Sent ${medCount} prescriptions` };
    
    await prisma.kunjungan.update({
      where: { id: kunjunganId },
      data: { satusehatSync: syncStatus }
    });
  }

  return result.resep;
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
      data: {
        statusKunjungan: 'MENUNGGU_KASIR',
        statusPulang: 'DIRUJUK_RS',
        waktuPemeriksaanSelesai: new Date()
      },
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
    data: {
      statusKunjungan: 'MENUNGGU_KASIR',
      statusPulang: 'PULANG_SEMBUH',
      waktuPemeriksaanSelesai: new Date()
    },
  });
};

module.exports = {
  getAntrianDokter,
  mulaiPemeriksaan,
  simpanSOAP,
  simpanDiagnosa,
  simpanTindakan,
  selesaikanPemeriksaan,
  selesaikanKunjungan: selesaikanPemeriksaan,
  tundaPemeriksaan,
  getRekamMedisByKunjungan,
  getDiagnosaByKunjungan,
  getTindakanByKunjungan,
  simpanAlergi,
  getAlergiByKunjungan,
  simpanResep,
  simpanRujukan,
  pulang,
  getRiwayatDokter,
  getRiwayatPasienByRM,
};
