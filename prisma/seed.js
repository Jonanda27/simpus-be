const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai proses Seeding Data Puskesmas (Simulasi Real-World)...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ==============================================================
  // 1. SEED USERS & ROLES
  // ==========================================
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
  // 2. SEED POLIKLINIK, LAYANAN, & DOKTER POLI
  // ==========================================
  const masterPolis = [
    {
      kodePoli: 'RAD', namaPoli: 'Radiologi',
      layanans: [
        { kode: '01.24', nama: 'CT Scan Kepala', tarif: 800000 },
        { kode: '87.44', nama: 'Foto Thoraks', tarif: 150000 },
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

    // Buat akun dokter dan perawat untuk setiap poli
    const dokterUsername = `dr_${poliData.kodePoli.toLowerCase()}`;
    await prisma.user.upsert({
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
  }
  console.log('✅ Poliklinik & Layanan berhasil di-seed.');

  // ==============================================================
  // 3. SEED DUMMY PASIEN REALISTIS (UNTUK TESTING SATUSEHAT)
  // ==========================================
  const dummyPatients = [
    {
      noRM: 'RM-000001', nik: '3201010101900001', noIHS: 'P10000000001',
      namaLengkap: 'Bapak Rahmat Susanto', tempatLahir: 'Jakarta', tanggalLahir: new Date('1980-05-15'),
      jenisKelamin: 'Laki-laki', agama: 'Islam', pekerjaan: 'Wiraswasta', statusPerkawinan: 'Menikah', kewarganegaraan: 'WNI'
    }, // Pasien ideal untuk simulasi kasus TBC / Hipertensi
    {
      noRM: 'RM-000002', nik: '3201010101900002', noIHS: 'P10000000002',
      namaLengkap: 'Ibu Siti Aminah', tempatLahir: 'Bandung', tanggalLahir: new Date('1995-08-22'),
      jenisKelamin: 'Perempuan', agama: 'Islam', pekerjaan: 'Ibu Rumah Tangga', statusPerkawinan: 'Menikah', kewarganegaraan: 'WNI'
    }, // Pasien ideal untuk simulasi kasus Ibu Hamil (ANC)
    {
      noRM: 'RM-000003', nik: '3201010101900003', noIHS: 'P10000000003',
      namaLengkap: 'Bayi Dilan', tempatLahir: 'Surabaya', tanggalLahir: new Date('2023-10-10'),
      jenisKelamin: 'Laki-laki', agama: 'Islam', pekerjaan: 'Belum Bekerja', statusPerkawinan: 'Belum Kawin', kewarganegaraan: 'WNI'
    } // Pasien ideal untuk simulasi Imunisasi Bayi
  ];

  for (const pasien of dummyPatients) {
    await prisma.pasien.upsert({
      where: { nik: pasien.nik },
      update: {},
      create: { ...pasien }
    });
  }
  console.log('✅ Data Pasien Dummy berhasil di-seed.');

  // ==============================================================
  // 4. SEED PROGRAM UKM
  // ==========================================
  const programs = [
    { kode: 'HIV', nama: 'Program HIV/AIDS' },
    { kode: 'TB', nama: 'Program TB Paru' },
    { kode: 'STUNTING', nama: 'Program Pencegahan Stunting' },
    { kode: 'KIA', nama: 'Program Kesehatan Ibu & Anak' }
  ];

  for (const prog of programs) {
    await prisma.programUKM.upsert({
      where: { kodeProgram: prog.kode },
      update: {},
      create: { kodeProgram: prog.kode, namaProgram: prog.nama, deskripsi: prog.nama }
    });
  }

  // ==============================================================
  // 5. SEED MASTER OBAT (Farmasi Harian & Program)
  // ==========================================
  const masterObatData = [
    { kodeObat: 'OBT-ARV', namaObat: 'Obat ARV (Anti Retroviral)', kategori: 'Antiviral', sediaan: 'Tablet', stok: 1000, harga: 0 },
    { kodeObat: 'OBT-OAT', namaObat: 'OAT (Obat Anti Tuberkulosis) FDC', kategori: 'Antibiotik', sediaan: 'Tablet', stok: 500, harga: 0 },
    { kodeObat: 'OBT-001', namaObat: 'Paracetamol 500mg', kategori: 'Obat Bebas', sediaan: 'Tablet', stok: 2000, harga: 5000 },
    { kodeObat: 'OBT-002', namaObat: 'Amoxicillin 500mg', kategori: 'Antibiotik Keras', sediaan: 'Kapsul', stok: 1500, harga: 15000 },
    { kodeObat: 'OBT-003', namaObat: 'Amlodipine 5mg', kategori: 'Obat Keras (Hipertensi)', sediaan: 'Tablet', stok: 800, harga: 12000 },
    { kodeObat: 'OBT-004', namaObat: 'Metformin 500mg', kategori: 'Obat Keras (Diabetes)', sediaan: 'Tablet', stok: 1200, harga: 10000 },
  ];

  for (const obat of masterObatData) {
    await prisma.masterObat.upsert({
      where: { kodeObat: obat.kodeObat },
      update: { stok: obat.stok, harga: obat.harga },
      create: { ...obat }
    });
  }
  console.log('✅ Master Obat berhasil di-seed.');

  // ==============================================================
  // 6. SEED MASTER ICD-10 (Penyakit Harian & Program SATUSEHAT)
  // ==========================================
  const icd10Data = [
    // Penyakit Program (EpisodeOfCare)
    { kode_icd10: 'A15.0', nama_diagnosis: 'Tuberkulosis paru, terkonfirmasi', kategori: 'Tuberkulosis', wajib_lapor: true, kode_program: 'TB' },
    { kode_icd10: 'B20', nama_diagnosis: 'Penyakit infeksi HIV', kategori: 'HIV/AIDS', wajib_lapor: true, kode_program: 'HIV' },
    { kode_icd10: 'Z34', nama_diagnosis: 'Pengawasan kehamilan normal', kategori: 'Kehamilan', wajib_lapor: false, kode_program: 'KIA' },

    // Penyakit Harian Poli Umum (Rawat Jalan)
    { kode_icd10: 'J06.9', nama_diagnosis: 'Infeksi Saluran Pernapasan Akut (ISPA)', kategori: 'Pernapasan', wajib_lapor: false, kode_program: null },
    { kode_icd10: 'I10', nama_diagnosis: 'Hipertensi Esensial (Primer)', kategori: 'Kardiovaskular', wajib_lapor: false, kode_program: null },
    { kode_icd10: 'E11.9', nama_diagnosis: 'Diabetes Melitus Tipe 2', kategori: 'Endokrin', wajib_lapor: false, kode_program: null },
    { kode_icd10: 'A09', nama_diagnosis: 'Diare dan Gastroenteritis', kategori: 'Pencernaan', wajib_lapor: false, kode_program: null },
    { kode_icd10: 'K30', nama_diagnosis: 'Dispepsia (Maag)', kategori: 'Pencernaan', wajib_lapor: false, kode_program: null },
  ];

  for (const data of icd10Data) {
    await prisma.masterICD10.upsert({
      where: { kode_icd10: data.kode_icd10 },
      update: { nama_diagnosis: data.nama_diagnosis, kode_program: data.kode_program },
      create: { ...data, status_aktif: true }
    });
  }
  console.log('✅ Master ICD-10 berhasil di-seed.');

  // ==============================================================
  // 7. SEED MASTER LABORATORIUM
  // ==========================================
  const labData = [
    { kategori: 'Hematologi', parameter: 'Hemoglobin (Hb)', satuan: 'g/dL', nilaiRujukan: '12.0 - 16.0' },
    { kategori: 'Kimia Klinik', parameter: 'Gula Darah Sewaktu (GDS)', satuan: 'mg/dL', nilaiRujukan: '< 200' },
    { kategori: 'Kimia Klinik', parameter: 'Kolesterol Total', satuan: 'mg/dL', nilaiRujukan: '< 200' },
    { kategori: 'Kimia Klinik', parameter: 'Asam Urat', satuan: 'mg/dL', nilaiRujukan: '3.4 - 7.0' },
  ];

  for (const lab of labData) {
    await prisma.masterLaboratorium.createMany({
      data: lab,
      skipDuplicates: true,
    });
  }

  // ==============================================================
  // 8. SEED MODALITAS RADIOLOGI & VAKSIN (KFA SATUSEHAT)
  // ==========================================
  const modalities = [
    { kode: 'DX', nama: 'Digital Radiography (X-Ray)' },
    { kode: 'CT', nama: 'Computed Tomography (CT Scan)' },
    { kode: 'US', nama: 'Ultrasound (USG)' },
  ];

  for (const mod of modalities) {
    await prisma.masterModality.upsert({
      where: { kodeDicom: mod.kode },
      update: {},
      create: { kodeDicom: mod.kode, namaModality: mod.nama, statusAktif: true }
    });
  }

  const masterVaksins = [
    { kodeKfa: '93001282', nama: 'Vaksin COVID-19 (Sinovac)', targetPenyakit: 'COVID-19' },
    { kodeKfa: '93000601', nama: 'Vaksin BCG', targetPenyakit: 'TBC' },
    { kodeKfa: '93000862', nama: 'Vaksin DPT-HB-Hib (Pentabio)', targetPenyakit: 'Difteri, Pertusis' },
    { kodeKfa: '93000282', nama: 'Vaksin Polio Tetes (bOPV)', targetPenyakit: 'Polio' }
  ];

  for (const vak of masterVaksins) {
    const vaksinRecord = await prisma.masterVaksin.upsert({
      where: { kodeKfa: vak.kodeKfa },
      update: {},
      create: { kodeKfa: vak.kodeKfa, namaVaksin: vak.nama, targetPenyakit: vak.targetPenyakit, statusAktif: true }
    });

    const dummyBatchNo = `BATCH-${vak.kodeKfa}-2024`;
    await prisma.batchVaksin.upsert({
      where: { vaksinId_noBatch: { vaksinId: vaksinRecord.id, noBatch: dummyBatchNo } },
      update: { stok: 100 },
      create: {
        vaksinId: vaksinRecord.id,
        noBatch: dummyBatchNo,
        tanggalExpired: new Date('2027-12-31T23:59:59.000Z'),
        stok: 100,
        statusAktif: true
      }
    });
  }
  console.log('✅ Modul Radiologi & Imunisasi berhasil di-seed.');

  console.log('🎉 SEEDING SELESAI! Database siap digunakan untuk simulasi nyata.');
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