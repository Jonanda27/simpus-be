const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MasterICD9 data...');
  
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
  
  console.log('Seeding MasterICD9 completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
