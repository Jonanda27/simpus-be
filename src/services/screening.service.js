const prisma = require('../config/prisma');

const createScreening = async (data, petugasId) => {
  const result = await prisma.$transaction(async (tx) => {

    // Kemas semua data tambahan (Step 2-5) ke dalam JSON
    const dataTambahan = {
      // Step 2 - Triage
      triage: {
        jalanNapas: data.jalanNapas || null,
        sirkulasi: data.sirkulasi || null,
        kesadaran: data.kesadaran || null,
      },
      // Step 1 - Riwayat Klinis
      riwayat: {
        lamaKeluhan: data.lamaKeluhan || null,
        riwayatPenyakitSekarang: data.riwayatPenyakitSekarang || null,
        riwayatPenyakitDahulu: data.riwayatPenyakitDahulu || null,
        riwayatAlergi: data.riwayatAlergi || null,
        riwayatOperasi: data.riwayatOperasi || null,
        riwayatRawatInap: data.riwayatRawatInap || null,
        riwayatTransfusi: data.riwayatTransfusi || null,
      },
      // Step 3 - Gaya Hidup & PTM
      gayaHidup: {
        lamaMerokok: data.lamaMerokok || null,
        jumlahBatang: data.jumlahBatang || null,
        alkohol: data.alkohol || null,
        narkoba: data.narkoba || null,
        aktivitasFisik: data.aktivitasFisik || null,
        polaMakan: data.polaMakan || null,
        konsumsiBuah: data.konsumsiBuah || null,
        konsumsiSayur: data.konsumsiSayur || null,
        konsumsiGaram: data.konsumsiGaram || null,
        konsumsiGula: data.konsumsiGula || null,
        tidur: data.tidur || null,
      },
      faktorRisiko: {
        faktorRisikoLain: data.faktorRisikoLain || [],
        ptmJantung: data.ptmJantung || [],
        ptmStroke: data.ptmStroke || [],
        ptmKanker: data.ptmKanker || [],
        gulaDarahSewaktu: data.gulaDarahSewaktu || null,
      },
      // Step 4 - TB & Kesehatan Jiwa
      tb: {
        gejalaTB: data.gejalaTB || [],
        kontakTB: data.kontakTB || null,
        riwayatTB: data.riwayatTB || [],
        faktorRisikoTB: data.faktorRisikoTB || [],
        hasilTB: data.hasilTB || null,
      },
      jiwa: {
        jiwaEmosional: data.jiwaEmosional || [],
        jiwaSosial: data.jiwaSosial || [],
        jiwaPsikologis: data.jiwaPsikologis || [],
        jiwaBunuhDiri: data.jiwaBunuhDiri || [],
        jiwaZat: data.jiwaZat || [],
        jiwaRiwayat: data.jiwaRiwayat || [],
      },
      // Catatan per-step
      catatan: {
        catatanPenyakitKeluarga: data.catatanPenyakitKeluarga || null,
        catatanGayaHidup: data.catatanGayaHidup || null,
        catatanRisikoLain: data.catatanRisikoLain || null,
        catatanPtmKhusus: data.catatanPtmKhusus || null,
        catatanPengukuran: data.catatanPengukuran || null,
        catatanSkriningTB: data.catatanSkriningTB || null,
        catatanKesehatanJiwa: data.catatanKesehatanJiwa || null,
      },
    };

    // 1. Simpan data screening ke database
    const screening = await tx.screening.create({
      data: {
        pasienId: data.pasienId,
        kunjunganId: data.kunjunganId,
        petugas: data.petugasNama || 'Perawat',
        jenisKedatangan: data.jenisKedatangan || 'Poli',
        kategoriTriage: data.kategoriTriage || 'Hijau',
        // Tanda Vital & Antropometri
        tinggiBadan: data.tinggiBadan ? parseFloat(data.tinggiBadan) : null,
        beratBadan: data.beratBadan ? parseFloat(data.beratBadan) : null,
        lingkarPerut: data.lingkarPerut ? parseFloat(data.lingkarPerut) : null,
        imt: data.imt ? parseFloat(data.imt) : null,
        tekananDarahSistolik: data.tekananDarahSistolik ? parseInt(data.tekananDarahSistolik) : null,
        tekananDarahDiastolik: data.tekananDarahDiastolik ? parseInt(data.tekananDarahDiastolik) : null,
        nadi: data.nadi ? parseInt(data.nadi) : null,
        frekuensiNapas: data.frekuensiNapas ? parseInt(data.frekuensiNapas) : null,
        suhuTubuh: data.suhuTubuh ? parseFloat(data.suhuTubuh) : null,
        saturasiOksigen: data.saturasiOksigen ? parseInt(data.saturasiOksigen) : null,
        skalaNyeri: data.skalaNyeri !== undefined ? parseInt(data.skalaNyeri) : null,
        // Keluhan & Gaya Hidup
        keluhanUtama: data.keluhanUtama || null,
        riwayatKeluarga: data.riwayatKeluarga || [],
        merokok: data.merokok || null,
        // Hasil Screening
        statusKesehatan: data.statusKesehatan || null,
        prioritasPelayanan: data.prioritasPelayanan || null,
        catatanPetugas: data.catatanPetugas || null,
        // Semua data tambahan (JSON)
        dataTambahan,
      },
    });

    // 2. Update status kunjungan → pasien siap diperiksa dokter
    await tx.kunjungan.update({
      where: { id: data.kunjunganId },
      data: { statusKunjungan: 'MENUNGGU_DOKTER' },
    });

    return screening;
  });
  
  // 3. Trigger sinkronisasi SATUSEHAT (berjalan di background tanpa memblokir response UI)
  sendObservationToSatuSehat(result.id).catch(err => console.error(err));

  return result;
};

const sendObservationToSatuSehat = async (screeningId) => {
  const satusehatService = require('./satusehat.service');
  try {
    const screening = await prisma.screening.findUnique({
      where: { id: screeningId },
      include: {
        kunjungan: {
          include: {
            pasien: true,
            dokterTujuan: {
              include: { tenagaMedis: true }
            }
          }
        }
      }
    });

    if (!screening || !screening.kunjungan || !screening.kunjungan.encounterId) {
      console.log('Tidak dapat sinkron Observation: Encounter ID belum ada');
      return;
    }

    const { kunjungan } = screening;
    const { pasien, dokterTujuan } = kunjungan;

    if (!pasien.noIHS || !dokterTujuan?.tenagaMedis?.noIHS) {
      console.log('Tidak dapat sinkron Observation: IHS Pasien/Dokter belum lengkap');
      return;
    }

    const basePayload = {
      pasienIhs: pasien.noIHS,
      pasienName: pasien.namaLengkap,
      dokterIhs: dokterTujuan.tenagaMedis.noIHS,
      dokterName: dokterTujuan.namaLengkap,
      encounterId: kunjungan.encounterId,
    };

    const observationIds = [];

    // 1. Suhu
    if (screening.suhuTubuh) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "8310-5",
        loincDisplay: "Body temperature",
        value: screening.suhuTubuh,
        unit: "C",
        unitCode: "Cel"
      }).catch(e => console.error("Error Suhu:", e.message));
      if (res && res.success) observationIds.push({ type: 'Suhu', id: res.observationId });
    }

    // 2. Nadi
    if (screening.nadi) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "8867-4",
        loincDisplay: "Heart rate",
        value: screening.nadi,
        unit: "beats/minute",
        unitCode: "/min"
      }).catch(e => console.error("Error Nadi:", e.message));
      if (res && res.success) observationIds.push({ type: 'Nadi', id: res.observationId });
    }

    // 3. SpO2
    if (screening.saturasiOksigen) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "2708-6",
        loincDisplay: "Oxygen saturation in Arterial blood",
        value: screening.saturasiOksigen,
        unit: "%",
        unitCode: "%"
      }).catch(e => console.error("Error SpO2:", e.message));
      if (res && res.success) observationIds.push({ type: 'SpO2', id: res.observationId });
    }

    // 4. Tekanan Darah (Sistolik / Diastolik)
    if (screening.tekananDarahSistolik && screening.tekananDarahDiastolik) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "85354-9",
        loincDisplay: "Blood pressure panel with all children optional",
        components: [
          {
            code: {
              coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }]
            },
            valueQuantity: { value: screening.tekananDarahSistolik, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
          },
          {
            code: {
              coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }]
            },
            valueQuantity: { value: screening.tekananDarahDiastolik, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
          }
        ]
      }).catch(e => console.error("Error Tensi:", e.message));
      if (res && res.success) observationIds.push({ type: 'Tekanan Darah', id: res.observationId });
    }

    // 5. Frekuensi Napas (Respiratory Rate)
    if (screening.frekuensiNapas) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "9279-1",
        loincDisplay: "Respiratory rate",
        value: screening.frekuensiNapas,
        unit: "breaths/minute",
        unitCode: "/min"
      }).catch(e => console.error("Error Napas:", e.message));
      if (res && res.success) observationIds.push({ type: 'Napas', id: res.observationId });
    }

    // 6. Tinggi Badan
    if (screening.tinggiBadan) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "8302-2",
        loincDisplay: "Body height",
        value: screening.tinggiBadan,
        unit: "cm",
        unitCode: "cm"
      }).catch(e => console.error("Error Tinggi:", e.message));
      if (res && res.success) observationIds.push({ type: 'Tinggi Badan', id: res.observationId });
    }

    // 7. Berat Badan
    if (screening.beratBadan) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "29463-7",
        loincDisplay: "Body weight",
        value: screening.beratBadan,
        unit: "kg",
        unitCode: "kg"
      }).catch(e => console.error("Error Berat:", e.message));
      if (res && res.success) observationIds.push({ type: 'Berat Badan', id: res.observationId });
    }

    // 8. Lingkar Perut
    if (screening.lingkarPerut) {
      const res = await satusehatService.createObservation({
        ...basePayload,
        loincCode: "8280-0",
        loincDisplay: "Waist Circumference at umbilicus by Tape measure",
        value: screening.lingkarPerut,
        unit: "cm",
        unitCode: "cm"
      }).catch(e => console.error("Error Lingkar Perut:", e.message));
      if (res && res.success) observationIds.push({ type: 'Lingkar Perut', id: res.observationId });
    }

    // Update DB with observation Ids
    if (observationIds.length > 0) {
      await prisma.screening.update({
        where: { id: screeningId },
        data: { observationIds: observationIds }
      });
      
      // Update satusehatSync on Kunjungan
      const syncStatus = (typeof kunjungan.satusehatSync === 'object' && kunjungan.satusehatSync !== null) 
        ? { ...kunjungan.satusehatSync } 
        : {};
      
      syncStatus.Observation = { status: 'SUCCESS', detail: `Sent ${observationIds.length} observations` };
      
      await prisma.kunjungan.update({
        where: { id: kunjungan.id },
        data: { satusehatSync: syncStatus }
      });

      console.log('Berhasil sinkron Observation TTV ke SATUSEHAT:', observationIds);
    }
  } catch (err) {
    console.error('Gagal sinkron Observation TTV:', err.message);
  }
};

const getScreeningByKunjungan = async (kunjunganId) => {
  return await prisma.screening.findUnique({
    where: { kunjunganId },
  });
};

module.exports = {
  createScreening,
  getScreeningByKunjungan,
};
