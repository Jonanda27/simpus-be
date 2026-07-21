const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding master data...');

  // 1. Seed Master Diagnosa
  const diagnosaData = [
    { kode: 'A09', nama: 'Diare dan Gastroenteritis' },
    { kode: 'A15.0', nama: 'Tuberkulosis Paru Terkonfirmasi' },
    { kode: 'A90', nama: 'Demam Berdarah Dengue' },
    { kode: 'B20', nama: 'HIV Disease' },
    { kode: 'E11', nama: 'Diabetes Melitus Tipe 2' },
    { kode: 'I10', nama: 'Hipertensi Esensial' },
    { kode: 'J00', nama: 'Common Cold' },
    { kode: 'J06.9', nama: 'ISPA Tidak Spesifik' },
    { kode: 'K30', nama: 'Dispepsia' },
    { kode: 'R50', nama: 'Demam' },
    { kode: 'U07.1', nama: 'COVID-19' },
  ];

  for (const d of diagnosaData) {
    await prisma.masterDiagnosa.upsert({
      where: { kode: d.kode },
      update: {},
      create: d,
    });
  }
  console.log('Seeded Master Diagnosa');

  // 2. Seed Master Prosedur
  const prosedurData = [
    { kode: '38.93', nama: 'Pemasangan Infus' },
    { kode: '57.94', nama: 'Pemasangan Kateter Urin' },
    { kode: '73.59', nama: 'Persalinan Normal' },
    { kode: '86.59', nama: 'Penjahitan Luka' },
    { kode: '87.44', nama: 'Foto Thoraks' },
    { kode: '89.52', nama: 'Elektrokardiogram (EKG)' },
    { kode: '90.59', nama: 'Pemeriksaan Darah Lengkap' },
    { kode: '99.15', nama: 'Imunisasi/Injeksi Vaksin' },
  ];

  for (const p of prosedurData) {
    await prisma.masterProsedur.upsert({
      where: { kode: p.kode },
      update: {},
      create: p,
    });
  }
  console.log('Seeded Master Prosedur');

  // 3. Seed Master Laboratorium
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
      // Find existing to avoid duplicates if run multiple times (no unique constraint on combination in schema, but we can just check if exists)
      const exists = await prisma.masterLaboratorium.findFirst({
        where: { 
          // prisma syntax requires checking via AND or findFirst doesn't support complex unique without a real unique constraint. We use findFirst with where correctly.
          kategori: kategori,
          parameter: parameter
        }
      });
      if (!exists) {
        await prisma.masterLaboratorium.create({
          data: { kategori, parameter }
        });
      }
    }
  }
  console.log('Seeded Master Laboratorium');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
