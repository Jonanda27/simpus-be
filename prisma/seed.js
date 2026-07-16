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
