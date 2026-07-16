const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MasterICD10 data...');
  
  const icd10Data = [
    { kode_icd10: 'A09', nama_diagnosis: 'Diare dan Gastroenteritis', bab: 'Penyakit Infeksi', kategori: 'Infeksi Saluran Cerna' },
    { kode_icd10: 'A15.0', nama_diagnosis: 'Tuberkulosis Paru Terkonfirmasi', bab: 'Penyakit Infeksi', kategori: 'Tuberkulosis' },
    { kode_icd10: 'A90', nama_diagnosis: 'Demam Berdarah Dengue', bab: 'Penyakit Infeksi', kategori: 'Dengue' },
    { kode_icd10: 'B20', nama_diagnosis: 'HIV Disease', bab: 'Penyakit Infeksi', kategori: 'HIV/AIDS' },
    { kode_icd10: 'E10', nama_diagnosis: 'Diabetes Melitus Tipe 1', bab: 'Endokrin', kategori: 'Diabetes' },
    { kode_icd10: 'E11', nama_diagnosis: 'Diabetes Melitus Tipe 2', bab: 'Endokrin', kategori: 'Diabetes' },
    { kode_icd10: 'E66', nama_diagnosis: 'Obesitas', bab: 'Endokrin', kategori: 'Gangguan Nutrisi' },
    { kode_icd10: 'F32', nama_diagnosis: 'Episode Depresi', bab: 'Gangguan Mental', kategori: 'Kesehatan Jiwa' },
    { kode_icd10: 'G40', nama_diagnosis: 'Epilepsi', bab: 'Sistem Saraf', kategori: 'Neurologi' },
    { kode_icd10: 'H10', nama_diagnosis: 'Konjungtivitis', bab: 'Mata', kategori: 'Oftalmologi' },
    { kode_icd10: 'I10', nama_diagnosis: 'Hipertensi Esensial', bab: 'Sistem Sirkulasi', kategori: 'Hipertensi' },
    { kode_icd10: 'I21', nama_diagnosis: 'Infark Miokard Akut', bab: 'Sistem Sirkulasi', kategori: 'Jantung' },
    { kode_icd10: 'J00', nama_diagnosis: 'Common Cold', bab: 'Sistem Pernapasan', kategori: 'ISPA' },
    { kode_icd10: 'J02', nama_diagnosis: 'Faringitis Akut', bab: 'Sistem Pernapasan', kategori: 'ISPA' },
    { kode_icd10: 'J06.9', nama_diagnosis: 'ISPA Tidak Spesifik', bab: 'Sistem Pernapasan', kategori: 'ISPA' },
    { kode_icd10: 'J18', nama_diagnosis: 'Pneumonia', bab: 'Sistem Pernapasan', kategori: 'Pneumonia' },
    { kode_icd10: 'J45', nama_diagnosis: 'Asma', bab: 'Sistem Pernapasan', kategori: 'Asma' },
    { kode_icd10: 'K02', nama_diagnosis: 'Karies Gigi', bab: 'Sistem Pencernaan', kategori: 'Kesehatan Gigi' },
    { kode_icd10: 'K30', nama_diagnosis: 'Dispepsia', bab: 'Sistem Pencernaan', kategori: 'Lambung' },
    { kode_icd10: 'K35', nama_diagnosis: 'Apendisitis Akut', bab: 'Sistem Pencernaan', kategori: 'Bedah' },
    { kode_icd10: 'M54.5', nama_diagnosis: 'Low Back Pain', bab: 'Muskuloskeletal', kategori: 'Nyeri Punggung' },
    { kode_icd10: 'N39.0', nama_diagnosis: 'Infeksi Saluran Kemih', bab: 'Genitourinaria', kategori: 'ISK' },
    { kode_icd10: 'O80', nama_diagnosis: 'Persalinan Normal', bab: 'Kehamilan & Persalinan', kategori: 'Kebidanan' },
    { kode_icd10: 'P07', nama_diagnosis: 'Bayi Berat Lahir Rendah', bab: 'Perinatal', kategori: 'Neonatal' },
    { kode_icd10: 'R50', nama_diagnosis: 'Demam Tidak Diketahui Penyebabnya', bab: 'Gejala', kategori: 'Demam' },
    { kode_icd10: 'S06', nama_diagnosis: 'Cedera Intrakranial', bab: 'Cedera', kategori: 'Trauma Kepala' },
    { kode_icd10: 'T14', nama_diagnosis: 'Cedera Tidak Spesifik', bab: 'Cedera', kategori: 'Trauma' },
    { kode_icd10: 'U07.1', nama_diagnosis: 'COVID-19 Terkonfirmasi', bab: 'Kode Khusus', kategori: 'COVID-19' },
    { kode_icd10: 'Z00', nama_diagnosis: 'Pemeriksaan Kesehatan Umum', bab: 'Faktor yang Mempengaruhi Kesehatan', kategori: 'Medical Check Up' },
    { kode_icd10: 'Z23', nama_diagnosis: 'Imunisasi', bab: 'Faktor yang Mempengaruhi Kesehatan', kategori: 'Vaksinasi' }
  ];

  for (const data of icd10Data) {
    await prisma.masterICD10.upsert({
      where: { kode_icd10: data.kode_icd10 },
      update: {},
      create: data,
    });
  }

  console.log(`Seeded ${icd10Data.length} MasterICD10 records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
