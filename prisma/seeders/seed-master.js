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
    'Hematologi': ['Hemoglobin (Hb)', 'Leukosit', 'Eritrosit', 'Hematokrit', 'Trombosit', 'Hitung Jenis Leukosit', 'LED', 'Golongan Darah', 'Rhesus'],
    'Kimia Klinik': ['Gula Darah (Sewaktu, Puasa, 2 Jam PP)', 'HbA1c', 'Kolesterol Total', 'HDL', 'LDL', 'Trigliserida', 'Asam Urat', 'Ureum', 'Kreatinin', 'SGOT', 'SGPT', 'Bilirubin', 'Albumin'],
    'Urinalisis': ['Urinalisis Lengkap', 'Protein Urine', 'Glukosa Urine', 'Sedimen Urine', 'Tes Kehamilan'],
    'Mikrobiologi': ['BTA TB', 'TCM/Xpert MTB-RIF', 'Kultur Bakteri', 'Uji Resistensi Antibiotik', 'Pewarnaan Gram'],
    'Imunologi/Serologi': ['HIV', 'HBsAg', 'Anti HCV', 'VDRL', 'TPHA', 'Dengue (NS1, IgM, IgG)'],
    'Parasitologi': ['Feses Lengkap', 'Telur Cacing', 'Malaria'],
    'Patologi Klinik Lain': ['Analisa Gas Darah', 'Elektrolit', 'CRP', 'Prokalsitonin'],
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
