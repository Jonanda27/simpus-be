const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const masterAlergiData = [
  // --- KATEGORI: MAKANAN (SNOMED CT) ---
  { kode_snomed: '91935009', nama_alergi: 'Alergi Kacang (Peanut)', kategori: 'food', status_aktif: true },
  { kode_snomed: '417532002', nama_alergi: 'Alergi Makanan Laut (Seafood)', kategori: 'food', status_aktif: true },
  { kode_snomed: '91930004', nama_alergi: 'Alergi Telur (Egg)', kategori: 'food', status_aktif: true },
  { kode_snomed: '425525006', nama_alergi: 'Alergi Susu Sapi (Cow\'s Milk)', kategori: 'food', status_aktif: true },

  // --- KATEGORI: LINGKUNGAN (SNOMED CT) ---
  { kode_snomed: '256277009', nama_alergi: 'Alergi Tungau Debu Rumah', kategori: 'environment', status_aktif: true },
  { kode_snomed: '256278004', nama_alergi: 'Alergi Bulu Kucing', kategori: 'environment', status_aktif: true },
  { kode_snomed: '1157263004', nama_alergi: 'Alergi Cuaca Dingin', kategori: 'environment', status_aktif: true },

  // --- KATEGORI: OBAT / MEDICATION (KFA) ---
  { kode_snomed: '91000101', nama_alergi: 'Paracetamol (KFA)', kategori: 'medication', status_aktif: true },
  { kode_snomed: '91000343', nama_alergi: 'Amoxicillin (KFA)', kategori: 'medication', status_aktif: true },
  { kode_snomed: '91000125', nama_alergi: 'Ibuprofen (KFA)', kategori: 'medication', status_aktif: true }
];

async function main() {
  console.log('Memulai seeder Master Alergi...');

  for (const item of masterAlergiData) {
    const existing = await prisma.masterAlergi.findUnique({
      where: { kode_snomed: item.kode_snomed }
    });

    if (!existing) {
      await prisma.masterAlergi.create({
        data: item
      });
      console.log(`✅ Berhasil menambahkan: ${item.nama_alergi}`);
    } else {
      console.log(`⚠️ Melewati: ${item.nama_alergi} (Sudah ada)`);
    }
  }

  console.log('Seeder Master Alergi selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
