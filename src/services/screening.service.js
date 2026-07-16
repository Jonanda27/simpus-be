const prisma = require('../config/prisma');

const createScreening = async (data, petugasId) => {
  return await prisma.$transaction(async (tx) => {

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
