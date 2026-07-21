const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai proses Seeding Data Puskesmas & HL7 FHIR SATUSEHAT (Simulasi Real-World)...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ==============================================================
  // 1. SEED USERS & ROLES
  // ==============================================================
  const users = [
    { username: 'admin', role: 'ADMIN', namaLengkap: 'Administrator Sistem' },
    { username: 'administrasi', role: 'ADMINISTRASI', namaLengkap: 'Petugas Loket Pendaftaran' },
    { username: 'apoteker', role: 'APOTEKER', namaLengkap: 'Budi Farmasi, S.Farm., Apt.' },
    { username: 'laboratorium', role: 'LABORATORIUM', namaLengkap: 'Siti Analis, Amd.AK' },
    { username: 'kasir', role: 'KASIR', namaLengkap: 'Petugas Kasir Utama' },
    { username: 'petugas_ukm', role: 'PETUGAS_UKM', namaLengkap: 'Perawat Program UKM' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { namaLengkap: user.namaLengkap },
      create: {
        username: user.username,
        password: passwordHash,
        namaLengkap: user.namaLengkap,
        role: user.role,
      },
    });
  }
  console.log('✅ Users berhasi di-seed.');

  // ==============================================================
  // 2. SEED REFERENSI ENUM (DYNAMIC DROPDOWNS FOR FE)
  // ==============================================================
  const refJenisPenjamins = [
    { kode: 'UMUM', label: 'Umum / Mandiri', isBpjs: false, urutan: 1 },
    { kode: 'BPJS', label: 'BPJS Kesehatan', isBpjs: true, urutan: 2 },
    { kode: 'ASURANSI', label: 'Asuransi Swasta', isBpjs: false, urutan: 3 },
    { kode: 'PERUSAHAAN', label: 'Perusahaan', isBpjs: false, urutan: 4 },
    { kode: 'JAMINAN_DAERAH', label: 'Jaminan Kesehatan Daerah (Jamkesda)', isBpjs: false, urutan: 5 },
  ];
  for (const item of refJenisPenjamins) {
    await prisma.refJenisPenjamin.upsert({
      where: { kode: item.kode },
      update: { label: item.label, isBpjs: item.isBpjs, urutan: item.urutan },
      create: item,
    });
  }

  const refJenisPelayanans = [
    { kode: 'RAWAT_JALAN', label: 'Rawat Jalan' },
    { kode: 'RAWAT_INAP', label: 'Rawat Inap' },
    { kode: 'IGD', label: 'Instalasi Gawat Darurat (IGD)' },
    { kode: 'UKM', label: 'Usaha Kesehatan Masyarakat (UKM)' },
  ];
  for (const item of refJenisPelayanans) {
    await prisma.refJenisPelayanan.upsert({
      where: { kode: item.kode },
      update: { label: item.label },
      create: item,
    });
  }

  const refCaraDatangs = [
    { kode: 'MANDIRI', label: 'Datang Sendiri', butuhDataRujukan: false },
    { kode: 'AMBULANS', label: 'Ambulans', butuhDataRujukan: false },
    { kode: 'RUJUKAN', label: 'Rujukan', butuhDataRujukan: true },
  ];
  for (const item of refCaraDatangs) {
    await prisma.refCaraDatang.upsert({
      where: { kode: item.kode },
      update: { label: item.label, butuhDataRujukan: item.butuhDataRujukan },
      create: item,
    });
  }

  const refPrioritass = [
    { kode: 'UMUM', label: 'Umum', warnaBadge: 'gray', urutan: 1 },
    { kode: 'LANSIA', label: 'Lansia (>60 Tahun)', warnaBadge: 'yellow', urutan: 2 },
    { kode: 'DISABILITAS', label: 'Disabilitas', warnaBadge: 'blue', urutan: 3 },
    { kode: 'HAMIL', label: 'Ibu Hamil / Menyusui', warnaBadge: 'pink', urutan: 4 },
    { kode: 'ANAK', label: 'Bayi & Anak-anak', warnaBadge: 'green', urutan: 5 },
  ];
  for (const item of refPrioritass) {
    await prisma.refPrioritas.upsert({
      where: { kode: item.kode },
      update: { label: item.label, warnaBadge: item.warnaBadge, urutan: item.urutan },
      create: item,
    });
  }

  const refKategoriTriages = [
    { kode: 'MERAH', label: 'Resusitasi / Merah (Gawat Darurat)', warna: '#EF4444', urutan: 1 },
    { kode: 'KUNING', label: 'Urgent / Kuning (Darurat Tidak Gawat)', warna: '#F59E0B', urutan: 2 },
    { kode: 'HIJAU', label: 'Non-Urgent / Hijau (Tidak Gawat Tidak Darurat)', warna: '#10B981', urutan: 3 },
    { kode: 'HITAM', label: 'Meninggal Dunia / Hitam', warna: '#1F2937', urutan: 4 },
  ];
  for (const item of refKategoriTriages) {
    await prisma.refKategoriTriage.upsert({
      where: { kode: item.kode },
      update: { label: item.label, warna: item.warna, urutan: item.urutan },
      create: item,
    });
  }

  const refMetodePembayarans = [
    { kode: 'TUNAI', label: 'Tunai', isBpjs: false },
    { kode: 'TRANSFER', label: 'Transfer Bank', isBpjs: false },
    { kode: 'QRIS', label: 'QRIS', isBpjs: false },
    { kode: 'BPJS', label: 'Klaim BPJS', isBpjs: true },
  ];
  for (const item of refMetodePembayarans) {
    await prisma.refMetodePembayaran.upsert({
      where: { kode: item.kode },
      update: { label: item.label, isBpjs: item.isBpjs },
      create: item,
    });
  }

  const refSediaanObats = [
    { kode: 'TABLET', label: 'Tablet' },
    { kode: 'KAPSUL', label: 'Kapsul' },
    { kode: 'SIRUP', label: 'Sirup / Larutan' },
    { kode: 'INJEKSI', label: 'Injeksi / Ampul / Vial' },
    { kode: 'SALEP', label: 'Salep / Krim / Gel' },
  ];
  for (const item of refSediaanObats) {
    await prisma.refSediaanObat.upsert({
      where: { kode: item.kode },
      update: { label: item.label },
      create: item,
    });
  }

  const refKategoriObats = [
    { kode: 'OBAT_BEBAS', label: 'Obat Bebas', warnaBadge: 'green' },
    { kode: 'OBAT_BEBAS_TERBATAS', label: 'Obat Bebas Terbatas', warnaBadge: 'blue' },
    { kode: 'OBAT_KERAS', label: 'Obat Keras', warnaBadge: 'red' },
    { kode: 'NARKOTIKA', label: 'Narkotika', warnaBadge: 'purple' },
    { kode: 'PSIKOTROPIKA', label: 'Psikotropika', warnaBadge: 'yellow' },
  ];
  for (const item of refKategoriObats) {
    await prisma.refKategoriObat.upsert({
      where: { kode: item.kode },
      update: { label: item.label, warnaBadge: item.warnaBadge },
      create: item,
    });
  }
  console.log('✅ Referensi Enum berhasil di-seed.');

  // ==============================================================
  // 3. SEED POLIKLINIK, LAYANAN, & DOKTER POLI
  // ==============================================================
  const masterPolis = [
    {
      kodePoli: 'RAD', namaPoli: 'Radiologi',
      layanans: [
        { kode: '01.24', nama: 'CT Scan Kepala', tarif: 800000 },
        { kode: '87.44', nama: 'Foto Thoraks PA', tarif: 150000 },
        { kode: '88.72', nama: 'USG Abdomen', tarif: 250000 },
      ]
    },
    {
      kodePoli: 'UMUM', namaPoli: 'Poli Umum / Tindakan Umum',
      layanans: [
        { kode: 'KONSUL-UMUM', nama: 'Konsultasi Dokter Umum', tarif: 15000 },
        { kode: '38.93', nama: 'Pemasangan Infus', tarif: 50000 },
        { kode: '86.59', nama: 'Penjahitan Luka (Bedah Minor)', tarif: 120000 },
      ]
    },
    {
      kodePoli: 'KIA', namaPoli: 'Poli KIA & Kebidanan',
      layanans: [
        { kode: 'KONSUL-KIA', nama: 'Konsultasi Ibu Hamil (ANC)', tarif: 20000 },
        { kode: '99.15', nama: 'Imunisasi/Injeksi Vaksin', tarif: 45000 },
        { kode: '70.50', nama: 'Persalinan Normal', tarif: 1200000 },
      ]
    },
    {
      kodePoli: 'GIGI', namaPoli: 'Poli Gigi',
      layanans: [
        { kode: '23.09', nama: 'Ekstraksi Gigi', tarif: 150000 },
        { kode: '23.20', nama: 'Tumpatan Gigi (Tambal)', tarif: 200000 },
      ]
    }
  ];

  const dokterMap = {};

  for (const poliData of masterPolis) {
    const poli = await prisma.poliklinik.upsert({
      where: { kodePoli: poliData.kodePoli },
      update: {},
      create: {
        kodePoli: poliData.kodePoli,
        namaPoli: poliData.namaPoli,
        deskripsi: `Layanan untuk ${poliData.namaPoli}`,
        statusAktif: true
      }
    });

    for (const lay of poliData.layanans) {
      await prisma.layananKlinik.upsert({
        where: { kodeLayanan: lay.kode },
        update: { namaLayanan: lay.nama, tarifDasar: lay.tarif },
        create: {
          kodeLayanan: lay.kode,
          namaLayanan: lay.nama,
          deskripsi: lay.nama,
          tarifDasar: lay.tarif,
          poliklinikId: poli.id,
          statusAktif: true
        }
      });
    }

    const dokterUsername = `dr_${poliData.kodePoli.toLowerCase()}`;
    const dokterUser = await prisma.user.upsert({
      where: { username: dokterUsername },
      update: {},
      create: {
        username: dokterUsername,
        password: passwordHash,
        namaLengkap: `Dr. ${poliData.namaPoli}`,
        role: 'DOKTER',
        poliklinikId: poli.id
      }
    });
    dokterMap[poliData.kodePoli] = dokterUser;
  }
  console.log('✅ Poliklinik & Layanan berhasil di-seed.');

  // ==============================================================
  // 4. SEED DUMMY PASIEN REALISTIS (FHIR PATIENT)
  // ==============================================================
  const dummyPatients = [
    {
      noRM: 'RM-000001', nik: '3201010101900001', noIHS: 'P10000000001',
      namaLengkap: 'Bapak Rahmat Susanto', tempatLahir: 'Jakarta', tanggalLahir: new Date('1980-05-15'),
      jenisKelamin: 'Laki-laki', agama: 'Islam', pekerjaan: 'Wiraswasta', statusPerkawinan: 'Menikah', kewarganegaraan: 'WNI'
    },
    {
      noRM: 'RM-000002', nik: '3201010101900002', noIHS: 'P10000000002',
      namaLengkap: 'Ibu Siti Aminah', tempatLahir: 'Bandung', tanggalLahir: new Date('1995-08-22'),
      jenisKelamin: 'Perempuan', agama: 'Islam', pekerjaan: 'Ibu Rumah Tangga', statusPerkawinan: 'Menikah', kewarganegaraan: 'WNI'
    },
    {
      noRM: 'RM-000003', nik: '3201010101900003', noIHS: 'P10000000003',
      namaLengkap: 'Bayi Dilan', tempatLahir: 'Surabaya', tanggalLahir: new Date('2023-10-10'),
      jenisKelamin: 'Laki-laki', agama: 'Islam', pekerjaan: 'Belum Bekerja', statusPerkawinan: 'Belum Kawin', kewarganegaraan: 'WNI'
    }
  ];

  const pasienMap = {};
  for (const pasien of dummyPatients) {
    const p = await prisma.pasien.upsert({
      where: { nik: pasien.nik },
      update: {},
      create: { ...pasien }
    });
    pasienMap[pasien.noRM] = p;
  }
  console.log('✅ Data Pasien Dummy berhasil di-seed.');

  // ==============================================================
  // 5. SEED MASTER OBAT & ICD-10 & LAB
  // ==============================================================
  const masterObatData = [
    { kodeObat: 'OBT-ARV', namaObat: 'Obat ARV (Anti Retroviral)', kategori: 'Antiviral', sediaan: 'Tablet', stok: 1000, harga: 0 },
    { kodeObat: 'OBT-OAT', namaObat: 'OAT (Obat Anti Tuberkulosis) FDC', kategori: 'Antibiotik', sediaan: 'Tablet', stok: 500, harga: 0 },
    { kodeObat: 'OBT-001', namaObat: 'Paracetamol 500mg', kategori: 'Obat Bebas', sediaan: 'Tablet', stok: 2000, harga: 5000 },
    { kodeObat: 'OBT-002', namaObat: 'Amoxicillin 500mg', kategori: 'Obat Keras', sediaan: 'Kapsul', stok: 1500, harga: 15000 },
    { kodeObat: 'OBT-003', namaObat: 'Amlodipine 5mg', kategori: 'Obat Keras', sediaan: 'Tablet', stok: 800, harga: 12000 },
    { kodeObat: 'OBT-004', namaObat: 'Metformin 500mg', kategori: 'Obat Keras', sediaan: 'Tablet', stok: 1200, harga: 10000 },
  ];

  for (const obat of masterObatData) {
    await prisma.masterObat.upsert({
      where: { kodeObat: obat.kodeObat },
      update: { stok: obat.stok, harga: obat.harga },
      create: { ...obat }
    });
  }

  const icd10Data = [
    { kode_icd10: 'A15.0', nama_diagnosis: 'Tuberkulosis paru, terkonfirmasi mikroskopis', kategori: 'Tuberkulosis', wajib_lapor: true, kode_program: 'TB' },
    { kode_icd10: 'B20', nama_diagnosis: 'Penyakit infeksi HIV', kategori: 'HIV/AIDS', wajib_lapor: true, kode_program: 'HIV' },
    { kode_icd10: 'Z34', nama_diagnosis: 'Pengawasan kehamilan normal', kategori: 'Kehamilan', wajib_lapor: false, kode_program: 'KIA' },
    { kode_icd10: 'J06.9', nama_diagnosis: 'Infeksi Saluran Pernapasan Akut (ISPA)', kategori: 'Pernapasan', wajib_lapor: false, kode_program: null },
    { kode_icd10: 'I10', nama_diagnosis: 'Hipertensi Esensial (Primer)', kategori: 'Kardiovaskular', wajib_lapor: false, kode_program: null },
    { kode_icd10: 'E11.9', nama_diagnosis: 'Diabetes Melitus Tipe 2', kategori: 'Endokrin', wajib_lapor: false, kode_program: null },
  ];

  for (const data of icd10Data) {
    await prisma.masterICD10.upsert({
      where: { kode_icd10: data.kode_icd10 },
      update: { nama_diagnosis: data.nama_diagnosis },
      create: { ...data, status_aktif: true }
    });
  }

  const labData = [
    { kategori: 'Hematologi', parameter: 'Hemoglobin (Hb)', satuan: 'g/dL', nilaiRujukan: '12.0 - 16.0', hargaTarif: 25000, kodePanelLab: 'LOINC-5792-7' },
    { kategori: 'Kimia Klinik', parameter: 'Gula Darah Sewaktu (GDS)', satuan: 'mg/dL', nilaiRujukan: '< 200', hargaTarif: 30000, kodePanelLab: 'LOINC-2345-7' },
    { kategori: 'Kimia Klinik', parameter: 'Kolesterol Total', satuan: 'mg/dL', nilaiRujukan: '< 200', hargaTarif: 35000, kodePanelLab: 'LOINC-2093-3' },
    { kategori: 'Mikrobiologi', parameter: 'BTA Sputum (Dahak)', satuan: 'Kualitatif', nilaiRujukan: 'Negatif', hargaTarif: 40000, kodePanelLab: 'LOINC-11545-1' },
  ];

  for (const lab of labData) {
    await prisma.masterLaboratorium.createMany({
      data: lab,
      skipDuplicates: true,
    });
  }

  console.log('✅ Master Obat, ICD-10, & Lab berhasil di-seed.');

  // ==============================================================
  // 6. SIMULASI ALUR KLINIS LENGKAP & HL7 FHIR RESOURCE DATA
  // ==============================================================
  console.log('⏳ Membuat Simulasi Transaksi Klinis HL7 FHIR (Encounter, SOAP, ServiceRequest, Specimen, DiagnosticReport, Composition)...');

  const pasienRahmat = pasienMap['RM-000001'];
  const dokterUmum = dokterMap['UMUM'];
  const poliUmum = await prisma.poliklinik.findUnique({ where: { kodePoli: 'UMUM' } });

  // A. Kunjungan / Encounter FHIR
  const kunjungan = await prisma.kunjungan.create({
    data: {
      pasienId: pasienRahmat.id,
      satusehatId: 'Enc-FHIR-889001',
      tanggalRegistrasi: new Date(),
      jamRegistrasi: '08:30',
      poliklinikId: poliUmum.id,
      jenisPelayanan: 'Rawat Jalan',
      statusPasien: 'Lama',
      noAntrian: 'A-001',
      prioritas: 'Umum',
      caraDatang: 'Datang Sendiri',
      dokterTujuanId: dokterUmum.id,
      statusKunjungan: 'SELESAI',
    },
  });

  // B. Screening Vital Signs (Observation)
  await prisma.screening.create({
    data: {
      pasienId: pasienRahmat.id,
      kunjunganId: kunjungan.id,
      petugas: 'Perawat Siti',
      jenisKedatangan: 'Rawat Jalan',
      kategoriTriage: 'Hijau',
      tinggiBadan: 170,
      beratBadan: 68,
      tekananDarahSistolik: 130,
      tekananDarahDiastolik: 85,
      nadi: 80,
      frekuensiNapas: 18,
      suhuTubuh: 37.2,
      saturasiOksigen: 98,
      keluhanUtama: 'Batuk berdahak lebih dari 2 minggu, demam sumeng malam hari.',
      observationIds: ['Obs-Vital-Sistole-001', 'Obs-Vital-Diastole-001', 'Obs-Vital-Suhu-001'],
    },
  });

  // C. Rekam Medis (SOAP Dokter)
  const rekamMedis = await prisma.rekamMedis.create({
    data: {
      kunjunganId: kunjungan.id,
      pasienId: pasienRahmat.id,
      dokterId: dokterUmum.id,
      keluhanUtama: 'Batuk berdahak 2 minggu, keringat malam.',
      riwayatPenyakitSekarang: 'Pasien mengeluh batuk tak kunjung sembuh sejak 14 hari yang lalu.',
      keadaanUmum: 'Tampak Sakit Ringan',
      kesadaran: 'Compos Mentis',
      pemeriksaanFisik: 'Thoraks: Rhonchi basah halus di apeks paru kanan (+).',
      diagnosisKlinis: 'Suspek Tuberkulosis Paru (A15.0)',
      rencanaTerapi: 'Pemeriksaan BTA Sputum 2x. Resep Obat Antipiretik & Ekspektoran.',
      statusPemeriksaan: 'SELESAI',
    },
  });

  // D. FHIR ClinicalImpression (Evaluasi & Prognosis SOAP)
  await prisma.clinicalImpression.create({
    data: {
      satusehatId: 'Imp-FHIR-990123',
      rekamMedisId: rekamMedis.id,
      pasienId: pasienRahmat.id,
      kunjunganId: kunjungan.id,
      dokterId: dokterUmum.id,
      status: 'completed',
      statusReason: 'A15.0',
      summary: 'Pasien menunjukkan gejala khas TB Paru dengan ronki apeks. Memerlukan pemeriksaan spesimen dahak.',
      description: 'Asesmen awal TB Paru Rawat Jalan.',
      prognosisKode: 'PR000001',
      prognosisDisplay: 'Prognosis Baik (Bonam) bila patuh pengobatan OAT',
      investigationJson: ['Obs-Vital-001', 'Cond-TB-001'],
      satusehatSync: { status: 'SYNCED', timestamp: new Date() },
    },
  });

  // E. FHIR ServiceRequest (Order Laboratorium BTA Sputum)
  const orderLab = await prisma.orderLaboratorium.create({
    data: {
      satusehatId: 'ServReq-Lab-771001',
      intent: 'original-order',
      priority: 'routine',
      categoryCode: '108252007', // SNOMED CT: Laboratory procedure
      requestCode: 'LOINC-11545-1', // BTA Sputum
      kunjunganId: kunjungan.id,
      pasienId: pasienRahmat.id,
      dokterId: dokterUmum.id,
      status: 'SELESAI',
      catatanKlinis: 'Pemeriksaan Mikroskopis BTA Dahak Sewaktu-Pagi',
      details: {
        create: [
          { parameter: 'BTA Sputum (Dahak)', hasil: 'Positif (+1)', satuan: 'Kualitatif', nilaiRujukan: 'Negatif' }
        ]
      }
    },
  });

  // F. FHIR Specimen (SampelLaboratorium Dahak/Sputum)
  await prisma.sampelLaboratorium.create({
    data: {
      satusehatId: 'Specimen-Sputum-554001',
      orderLabId: orderLab.id,
      pasienId: pasienRahmat.id,
      kunjunganId: kunjungan.id,
      collectorId: dokterUmum.id,
      jenisSpesimenKode: '119297000', // SNOMED CT: Sputum specimen
      jenisSpesimenNama: 'Dahak/Sputum Pagi',
      waktuPengambilan: new Date(),
      volume: 3.5,
      satuanVolume: 'mL',
      kondisiSpesimen: 'available',
      catatan: 'Spesimen kental mukopurulen',
      satusehatSync: { status: 'SYNCED', timestamp: new Date() },
    },
  });

  // G. FHIR DiagnosticReport (Laporan Hasil Lab BTA)
  await prisma.laporanDiagnostik.create({
    data: {
      satusehatId: 'DiagRep-Lab-332001',
      kunjunganId: kunjungan.id,
      pasienId: pasienRahmat.id,
      dokterId: dokterUmum.id,
      kategori: 'LABORATORIUM',
      kodePemeriksaan: 'LOINC-11545-1',
      namaPemeriksaan: 'BTA Sputum Mikroskopis',
      status: 'final',
      kesimpulan: 'Ditemukan Basil Tahan Asam (BTA) Positif (+1). Pasien terkonfirmasi TB Paru.',
      orderLabId: orderLab.id,
      observationIds: ['Obs-BTA-Result-001'],
      satusehatSync: { status: 'SYNCED', timestamp: new Date() },
    },
  });

  // H. FHIR Composition (Resume Medis Rawat Jalan)
  await prisma.resumeMedis.create({
    data: {
      satusehatId: 'Comp-Resume-110001',
      kunjunganId: kunjungan.id,
      pasienId: pasienRahmat.id,
      dokterId: dokterUmum.id,
      typeCode: '11488-4', // LOINC: Consultation note / Discharge summary
      status: 'final',
      title: 'Resume Medis Rawat Jalan - TB Paru',
      ringkasanKlinis: 'Pasien Rahmat Susanto didiagnosis TB Paru BTA (+1). Telah diberikan edukasi etika batuk dan peresepan OAT FDC.',
      instruksiTindakLanjut: 'Kontrol ulang 2 minggu lagi untuk evaluasi efisiensi pengobatan OAT. Patuhi minum obat setiap hari.',
      conditionIds: ['Cond-A15.0-UUID'],
      observationIds: ['Obs-Vital-UUID', 'Obs-BTA-UUID'],
      procedureIds: ['Proc-Edukasi-UUID'],
      medicationRequestIds: ['MedReq-OAT-UUID'],
      satusehatSync: { status: 'SYNCED', timestamp: new Date() },
    },
  });

  console.log('✅ Simulasi Alur Transaksi Klinis & HL7 FHIR SATUSEHAT berhasil di-seed!');
  console.log('🎉 SEEDING SANGAT LENGKAP & DETIL SELESAI!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });