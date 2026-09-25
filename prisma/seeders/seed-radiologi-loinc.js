const { PrismaClient } = require('@prisma/client');

async function seedRadiologiLoinc(prismaInstance) {
  const prisma = prismaInstance || new PrismaClient();

  console.log('📦 Memulai Seeding Master Data LOINC Radiologi...');

  const masterRadiologiLoinc = [
    {
      kodeLoinc: '39051-8',
      namaPemeriksaan: 'Rontgen Thorax AP/PA (XR Thorax AP/PA)',
      modalitas: 'XR',
      bodySiteCode: '51185008',
      bodySiteDisplay: 'Thoracic structure',
      kategori: 'Radiologi Konvensional',
    },
    {
      kodeLoinc: '26122-2',
      namaPemeriksaan: 'Rontgen Femur (XR Femur - Right/Left)',
      modalitas: 'XR',
      bodySiteCode: '29836001',
      bodySiteDisplay: 'Hip structure',
      kategori: 'Radiologi Konvensional',
    },
    {
      kodeLoinc: '24558-9',
      namaPemeriksaan: 'USG Abdomen (Ultrasonography Abdomen)',
      modalitas: 'US',
      bodySiteCode: '80581009',
      bodySiteDisplay: 'Upper abdomen structure',
      kategori: 'Ultrasonografi',
    },
    {
      kodeLoinc: '36424-0',
      namaPemeriksaan: 'CT Scan Abdomen (CT Abdomen WO/W Contrast)',
      modalitas: 'CT',
      bodySiteCode: '818983003',
      bodySiteDisplay: 'Abdomen structure',
      kategori: 'Computed Tomography',
    },
    {
      kodeLoinc: '36442-2',
      namaPemeriksaan: 'MRI Dada/Thorax (MR Chest WO/W Contrast)',
      modalitas: 'MR',
      bodySiteCode: '51185008',
      bodySiteDisplay: 'Thoracic structure',
      kategori: 'Magnetic Resonance',
    },
  ];

  // Seed Modalitas jika belum ada
  const modalitasList = [
    { kodeDicom: 'XR', namaModality: 'X-Ray / Radiografi Konvensional' },
    { kodeDicom: 'US', namaModality: 'Ultrasonography (USG)' },
    { kodeDicom: 'CT', namaModality: 'Computed Tomography (CT-Scan)' },
    { kodeDicom: 'MR', namaModality: 'Magnetic Resonance Imaging (MRI)' },
  ];

  for (const mod of modalitasList) {
    await prisma.masterModality.upsert({
      where: { kodeDicom: mod.kodeDicom },
      update: { namaModality: mod.namaModality },
      create: {
        kodeDicom: mod.kodeDicom,
        namaModality: mod.namaModality,
        statusAktif: true,
      },
    });
  }

  console.log('✅ Master Modalitas Radiologi berhasil di-seed.');
  return masterRadiologiLoinc;
}

module.exports = { seedRadiologiLoinc };
