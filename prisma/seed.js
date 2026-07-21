const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'admin',
      role: 'ADMIN',
    },
    {
      username: 'administrasi',
      role: 'ADMINISTRASI',
    },
    {
      username: 'apoteker',
      role: 'APOTEKER',
    },
    {
      username: 'laboratorium',
      role: 'LABORATORIUM',
    },
    {
      username: 'kasir',
      role: 'KASIR',
    },
    {
      username: 'petugas_ukm',
      role: 'PETUGAS_UKM',
    },
  ];

  for (const user of users) {
    const existingUser = await prisma.user.findUnique({
      where: { username: user.username },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          username: user.username,
          password: passwordHash,
          role: user.role,
        },
      });
      console.log(`Created user: ${user.username} with role ${user.role}`);
    } else {
      console.log(`User ${user.username} already exists. Skipping.`);
    }
  }

  // --- Seed Poliklinik & Layanan (MENGACU PENUH KE PDF) ---
  const masterPolis = [
    {
      kodePoli: 'RAD',
      namaPoli: 'Radiologi',
      layanans: [
        { kode: '01.24', nama: 'CT Scan Kepala', tarif: 800000 },
        { kode: '87.44', nama: 'Foto Thoraks', tarif: 150000 },
        { kode: '88.72', nama: 'USG Abdomen', tarif: 250000 },
      ]
    },
    {
      kodePoli: 'NEURO',
      namaPoli: 'Poli Saraf / Neurologi',
      layanans: [
        { kode: '03.31', nama: 'Pungsi Lumbal', tarif: 450000 },
      ]
    },
    {
      kodePoli: 'BEDAH',
      namaPoli: 'Poli Bedah',
      layanans: [
        { kode: '06.02', nama: 'Biopsi Tiroid', tarif: 550000 },
        { kode: '86.04', nama: 'Debridement Luka', tarif: 100000 },
        { kode: '86.59', nama: 'Penjahitan Luka (Bedah Minor)', tarif: 120000 },
      ]
    },
    {
      kodePoli: 'THT',
      namaPoli: 'Poli THT',
      layanans: [
        { kode: '21.01', nama: 'Pemeriksaan Rongga Hidung', tarif: 60000 },
      ]
    },
    {
      kodePoli: 'GIGI',
      namaPoli: 'Poli Gigi (Kedokteran Gigi)',
      layanans: [
        { kode: '23.09', nama: 'Ekstraksi Gigi', tarif: 150000 },
      ]
    },
    {
      kodePoli: 'UMUM',
      namaPoli: 'Poli Umum / Tindakan Umum',
      layanans: [
        { kode: '38.93', nama: 'Pemasangan Infus', tarif: 50000 },
        { kode: '57.94', nama: 'Pemasangan Kateter Urin', tarif: 75000 },
        { kode: '89.52', nama: 'Elektrokardiogram (EKG)', tarif: 85000 },
        { kode: '96.04', nama: 'Pemberian Oksigen (Tindakan Respirasi)', tarif: 40000 },
      ]
    },
    {
      kodePoli: 'KIA',
      namaPoli: 'Poli KIA & Kebidanan',
      layanans: [
        { kode: '70.50', nama: 'Persalinan Normal', tarif: 1200000 },
        { kode: '73.59', nama: 'Episiotomi', tarif: 300000 },
        { kode: '99.15', nama: 'Imunisasi/Injeksi Vaksin', tarif: 45000 },
      ]
    },
    {
      kodePoli: 'LAB',
      namaPoli: 'Laboratorium',
      layanans: [
        { kode: '90.59', nama: 'Pemeriksaan Darah Lengkap', tarif: 65000 },
        { kode: '91.46', nama: 'Pemeriksaan Urinalisis', tarif: 35000 },
      ]
    },
    {
      kodePoli: 'REHAB',
      namaPoli: 'Rehabilitasi Medik',
      layanans: [
        { kode: '93.11', nama: 'Latihan Fisioterapi', tarif: 120000 },
      ]
    },
    {
      kodePoli: 'INAP',
      namaPoli: 'Rawat Inap / Terapi Lainnya',
      layanans: [
        { kode: '99.04', nama: 'Transfusi Darah', tarif: 350000 },
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
        deskripsi: poliData.namaPoli,
        statusAktif: true
      }
    });

    console.log(`Upserted Poli: ${poli.namaPoli}`);

    for (const lay of poliData.layanans) {
      await prisma.layananKlinik.upsert({
        where: { kodeLayanan: lay.kode },
        update: {
          namaLayanan: lay.nama,
          tarifDasar: lay.tarif,
          poliklinikId: poli.id
        },
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

    const dokterUsername = `dokter_${poliData.kodePoli.toLowerCase()}`;
    await prisma.user.upsert({
      where: { username: dokterUsername },
      update: {},
      create: {
        username: dokterUsername,
        password: passwordHash,
        namaLengkap: `Dr. ${poliData.namaPoli} untuk Poli ${poliData.kodePoli}`,
        role: 'DOKTER',
        poliklinikId: poli.id
      }
    });
    console.log(`Upserted Dokter: Dr. ${poliData.namaPoli} untuk Poli ${poliData.kodePoli}`);

    const perawatUsername = `perawat_${poliData.kodePoli.toLowerCase()}`;
    await prisma.user.upsert({
      where: { username: perawatUsername },
      update: {},
      create: {
        username: perawatUsername,
        password: passwordHash,
        namaLengkap: `Perawat ${poliData.namaPoli} untuk Poli ${poliData.kodePoli}`,
        role: 'PERAWAT',
        poliklinikId: poli.id
      }
    });
    console.log(`Upserted Perawat: Perawat ${poliData.namaPoli} untuk Poli ${poliData.kodePoli}`);
  }

  // --- Seed Program UKM ---
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
      create: {
        kodeProgram: prog.kode,
        namaProgram: prog.nama,
        deskripsi: prog.nama
      }
    });
    console.log(`Upserted Program UKM: ${prog.nama}`);
  }

  // --- Seed Master Obat (ARV Khusus HIV) ---
  const obatARV = await prisma.masterObat.findFirst({
    where: { kodeObat: 'OBT-ARV' }
  });
  if (!obatARV) {
    await prisma.masterObat.create({
      data: {
        kodeObat: 'OBT-ARV',
        namaObat: 'Obat ARV (Anti Retroviral)',
        kategori: 'Antiviral',
        sediaan: 'Tablet',
        stok: 1000,
        harga: 0
      }
    });
    console.log(`Created MasterObat: Obat ARV`);
  }

  // --- Seed Master Tarif Pelayanan (Perda) ---
  const tarifPelayananData = [
    { kodeTarif: 'TRF-ADM-01', namaTarif: 'Karcis Pendaftaran Rawat Jalan', kategori: 'PENDAFTARAN', tarif: 15000, deskripsi: 'Pendaftaran dan pemeriksaan awal Rawat Jalan' },
    { kodeTarif: 'TRF-ADM-02', namaTarif: 'Karcis Pendaftaran Rawat Inap', kategori: 'PENDAFTARAN', tarif: 25000, deskripsi: 'Pendaftaran masuk Rawat Inap' },
    { kodeTarif: 'TRF-ADM-03', namaTarif: 'Karcis Pendaftaran IGD', kategori: 'PENDAFTARAN', tarif: 20000, deskripsi: 'Pendaftaran unit Gawat Darurat' },
    { kodeTarif: 'TRF-RI-01', namaTarif: 'Sewa Bed Rawat Inap Kelas 1', kategori: 'RAWAT_INAP', tarif: 150000, deskripsi: 'Biaya sewa tempat tidur rawat inap Kelas 1 per hari' },
    { kodeTarif: 'TRF-RI-02', namaTarif: 'Sewa Bed Rawat Inap Kelas 2', kategori: 'RAWAT_INAP', tarif: 100000, deskripsi: 'Biaya sewa tempat tidur rawat inap Kelas 2 per hari' },
    { kodeTarif: 'TRF-RI-03', namaTarif: 'Sewa Bed Rawat Inap Kelas 3', kategori: 'RAWAT_INAP', tarif: 60000, deskripsi: 'Biaya sewa tempat tidur rawat inap Kelas 3 per hari' },
  ];

  for (const t of tarifPelayananData) {
    await prisma.masterTarifPelayanan.upsert({
      where: { kodeTarif: t.kodeTarif },
      update: {
        namaTarif: t.namaTarif,
        kategori: t.kategori,
        tarif: t.tarif,
        deskripsi: t.deskripsi
      },
      create: {
        kodeTarif: t.kodeTarif,
        namaTarif: t.namaTarif,
        kategori: t.kategori,
        tarif: t.tarif,
        deskripsi: t.deskripsi
      }
    });
    console.log(`Upserted Tarif Pelayanan: ${t.namaTarif}`);
  }

  // --- Seed Master Tarif Farmasi (Margin & Tuslah) ---
  const tarifFarmasiData = [
    { kategoriObat: 'Obat Bebas', marginPersen: 15, tuslah: 1000, deskripsi: 'Margin obat bebas (OTC)' },
    { kategoriObat: 'Obat Keras', marginPersen: 25, tuslah: 2000, deskripsi: 'Margin obat dengan resep dokter' },
    { kategoriObat: 'Narkotika', marginPersen: 30, tuslah: 5000, deskripsi: 'Margin obat golongan narkotika/psikotropika' },
    { kategoriObat: 'Vaksin', marginPersen: 10, tuslah: 1000, deskripsi: 'Margin vaksinasi' },
    { kategoriObat: 'BHP Medis', marginPersen: 20, tuslah: 0, deskripsi: 'Margin bahan habis pakai medis' },
  ];

  for (const tf of tarifFarmasiData) {
    await prisma.masterTarifFarmasi.upsert({
      where: { kategoriObat: tf.kategoriObat },
      update: {
        marginPersen: tf.marginPersen,
        tuslah: tf.tuslah,
        deskripsi: tf.deskripsi
      },
      create: {
        kategoriObat: tf.kategoriObat,
        marginPersen: tf.marginPersen,
        tuslah: tf.tuslah,
        deskripsi: tf.deskripsi
      }
    });
    console.log(`Upserted Tarif Farmasi Kategori: ${tf.kategoriObat}`);
  }

  // --- Seed Master ICD-9 ---
  const icd9Data = [
    { kode_icd9: '01.24', nama_prosedur: 'CT Scan Kepala', kategori: 'Radiologi' },
    { kode_icd9: '03.31', nama_prosedur: 'Pungsi Lumbal', kategori: 'Neurologi' },
    { kode_icd9: '06.02', nama_prosedur: 'Biopsi Tiroid', kategori: 'Bedah' },
    { kode_icd9: '21.01', nama_prosedur: 'Pemeriksaan Rongga Hidung', kategori: 'THT' },
    { kode_icd9: '23.09', nama_prosedur: 'Ekstraksi Gigi', kategori: 'Kedokteran Gigi' },
    { kode_icd9: '38.93', nama_prosedur: 'Pemasangan Infus', kategori: 'Tindakan Umum' },
    { kode_icd9: '57.94', nama_prosedur: 'Pemasangan Kateter Urin', kategori: 'Urologi' },
    { kode_icd9: '70.50', nama_prosedur: 'Persalinan Normal', kategori: 'Kebidanan' },
    { kode_icd9: '73.59', nama_prosedur: 'Episiotomi', kategori: 'Kebidanan' },
    { kode_icd9: '86.04', nama_prosedur: 'Debridement Luka', kategori: 'Bedah' },
    { kode_icd9: '86.59', nama_prosedur: 'Penjahitan Luka Bedah Minor', kategori: 'Bedah' },
    { kode_icd9: '87.44', nama_prosedur: 'Foto Thoraks', kategori: 'Radiologi' },
    { kode_icd9: '88.72', nama_prosedur: 'USG Abdomen', kategori: 'Radiologi' },
    { kode_icd9: '89.52', nama_prosedur: 'Elektrokardiogram (EKG)', kategori: 'Pemeriksaan Penunjang' },
    { kode_icd9: '90.59', nama_prosedur: 'Pemeriksaan Darah Lengkap', kategori: 'Laboratorium' },
    { kode_icd9: '91.46', nama_prosedur: 'Pemeriksaan Urinalisis', kategori: 'Laboratorium' },
    { kode_icd9: '93.11', nama_prosedur: 'Latihan Fisioterapi', kategori: 'Rehabilitasi' },
    { kode_icd9: '96.04', nama_prosedur: 'Pemberian Oksigen', kategori: 'Tindakan Respirasi' },
    { kode_icd9: '99.04', nama_prosedur: 'Transfusi Darah', kategori: 'Terapi' },
    { kode_icd9: '99.15', nama_prosedur: 'Imunisasi/Injeksi Vaksin', kategori: 'Imunisasi' },
  ];

  for (const icd of icd9Data) {
    await prisma.masterICD9.upsert({
      where: { kode_icd9: icd.kode_icd9 },
      update: icd,
      create: icd,
    });
  }
  console.log('Seeded Master ICD-9.');

  // Petakan beberapa tindakan ICD-9 ke MasterTarifPelayanan
  const listIcd9 = await prisma.masterICD9.findMany();
  for (const item of listIcd9) {
    const codeTarif = `TRF-TND-${item.kode_icd9}`;
    // Cari tarif dasar dari LayananKlinik yang memiliki kode sama
    const relatedLayanan = await prisma.layananKlinik.findFirst({
      where: { kodeLayanan: item.kode_icd9 }
    });

    let price = relatedLayanan ? relatedLayanan.tarifDasar : 50000;

    await prisma.masterTarifPelayanan.upsert({
      where: { kodeTarif: codeTarif },
      update: {
        namaTarif: `Tindakan: ${item.nama_prosedur}`,
        kategori: 'TINDAKAN',
        tarif: price,
        icd9Id: item.id_icd9
      },
      create: {
        kodeTarif: codeTarif,
        namaTarif: `Tindakan: ${item.nama_prosedur}`,
        kategori: 'TINDAKAN',
        tarif: price,
        icd9Id: item.id_icd9
      }
    });
    console.log(`Linked Tindakan ${item.nama_prosedur} to Perda Tariff`);
  }

  // --- Seed Master Laboratorium ---
  const labCategories = {
    'HEMATOLOGI': ['Hematologi Rutin/CBC', 'Hematologi Lengkap (CBC, LED, Hitung Jenis)', 'Hemoglobin', 'LED', 'Eritrosit', 'Leukosit', 'Trombosit', 'Hematokrit', 'Golongan Darah A,B,O & Rh', 'Gambaran Darah Tepi'],
    'URINALISA & FAECES': ['Urine Rutin', 'Protein Total (Urine 24 jam)', 'Faeces Rutin', 'Darah Samar (FIT)'],
    'KIMIA DARAH DASAR': ['Glukosa Puasa', 'Glukosa 2 Jam PP', 'Glukosa Sewaktu', 'Ureum', 'Kreatinin', 'Cholesterol Total', 'Trigliserida', 'SGOT', 'SGPT'],
    'ANEMIA': ['Hematologi Rutin + Retikulosit', 'Retikulosit', 'Besi', 'UIBC Direk', 'TIBC', 'Ferritin', 'Transferrin'],
    'FAAL HEMOSTASIS': ['Waktu Perdarahan', 'Waktu Pembekuan', 'Waktu Protrombin', 'Waktu Trombin', 'APTT', 'Fibrinogen', 'D-Dimer', 'AT III'],
    'FAAL HATI (Lanjutan)': ['Gamma GT', 'Fosfatase Alkali', 'CHE', 'Bilirubin Total', 'Bilirubin Direk', 'Protein Total', 'Albumin', 'Globulin'],
    'DIABETES (Lanjutan)': ['TTGO', 'HbA1c', 'Insulin'],
    'LEMAK (Lanjutan)': ['Cholesterol LDL Direk', 'Cholesterol HDL', 'Apo A1', 'Apo B'],
    'JANTUNG': ['CK', 'CK-MB', 'Troponin I', 'hs-Troponin I Kuantitatif', 'LDH', 'NT-Pro BNP'],
    'GINJAL - HIPERTENSI (Lanjutan)': ['Asam Urat', 'Cystatin-C', 'Albumin Urine Kuantitatif', 'Rasio Albumin-Kreatinin', 'Renin (PRA)', 'Aldosteron'],
    'ELEKTROLIT - GAS DARAH': ['Na, K, Cl', 'Kalsium', 'Fosfor Anorganik', 'Magnesium', 'Analisis Gas Darah'],
    'INFEKSI & HEPATITIS': ['HBsAg', 'Anti-HBs', 'Anti-HCV', 'Anti-HAV IgM', 'Widal', 'Dengue NS1 Antigen', 'Anti-Dengue IgG & IgM', 'Malaria (Mikroskopik)', 'Anti-HIV', 'VDRL/RPR'],
    'TIROID': ['FT3', 'FT4', 'TSHs', 'T3 (Total)', 'T4 (Total)'],
    'TUMOR MARKER': ['AFP', 'CEA', 'PSA', 'CA 125', 'CA 15-3', 'CA 19-9'],
    'IMUNOLOGI': ['ASTO', 'RF', 'CRP Kualitatif', 'hs-CRP', 'ANA (IF)', 'Anti-dsDNA']
  };

  for (const [kategori, parameters] of Object.entries(labCategories)) {
    for (const parameter of parameters) {
      const exists = await prisma.masterLaboratorium.findFirst({
        where: { kategori, parameter }
      });
      if (!exists) {
        await prisma.masterLaboratorium.create({
          data: { kategori, parameter }
        });
      }
    }
  }
  console.log('Seeded Master Laboratorium.');

  // Petakan parameter Lab ke MasterTarifPelayanan
  const listLab = await prisma.masterLaboratorium.findMany();
  for (const item of listLab) {
    const codeTarif = `TRF-LAB-${item.id}`;
    let price = 30000; // default
    if (item.parameter.toLowerCase().includes('darah')) price = 65000;
    else if (item.parameter.toLowerCase().includes('urin')) price = 35000;

    await prisma.masterTarifPelayanan.upsert({
      where: { kodeTarif: codeTarif },
      update: {
        namaTarif: `Pemeriksaan Lab: ${item.parameter}`,
        kategori: 'LABORATORIUM',
        tarif: price,
        labId: item.id
      },
      create: {
        kodeTarif: codeTarif,
        namaTarif: `Pemeriksaan Lab: ${item.parameter}`,
        kategori: 'LABORATORIUM',
        tarif: price,
        labId: item.id
      }
    });
    console.log(`Linked Lab Parameter ${item.parameter} to Perda Tariff`);
  }

  console.log('Seeding finished.');
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
