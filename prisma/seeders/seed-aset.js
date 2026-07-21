const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Ruangan, Aset & Logistik...');

  // 1. Seed Ruangan
  const ruanganData = [
    { namaRuangan: 'Gudang Farmasi', lokasi: 'Gedung A Lantai 1' },
    { namaRuangan: 'Gudang Logistik Umum', lokasi: 'Gedung B Lantai 1' },
    { namaRuangan: 'Poli Umum', lokasi: 'Gedung A Lantai 1' },
    { namaRuangan: 'Poli Gigi', lokasi: 'Gedung A Lantai 1' },
    { namaRuangan: 'Poli KIA', lokasi: 'Gedung A Lantai 2' },
    { namaRuangan: 'Laboratorium', lokasi: 'Gedung A Lantai 1' },
    { namaRuangan: 'IGD', lokasi: 'Gedung A Lantai 1' },
    { namaRuangan: 'Garasi Ambulans', lokasi: 'Halaman Samping' }
  ];

  const ruanganMap = {};
  for (const r of ruanganData) {
    const dbRuangan = await prisma.ruangan.upsert({
      where: { namaRuangan: r.namaRuangan },
      update: {},
      create: r
    });
    ruanganMap[r.namaRuangan] = dbRuangan.id;
  }
  console.log('Seeded Ruangan.');

  // 2. Fetch Master Obat to link
  const paracetamol = await prisma.masterObat.findFirst({ where: { kodeObat: 'OBT-001' } });
  const amoxicillin = await prisma.masterObat.findFirst({ where: { kodeObat: 'OBT-002' } });

  // 3. Seed Aset Logistik Medis (Obat, Vaksin, BHP)
  const medLogistics = [
    {
      kodeAset: 'AST-MED-001',
      namaAset: 'Paracetamol 500mg - Batch A',
      kategori: 'LOGISTIK_MEDIS',
      deskripsi: 'Stok obat paracetamol di gudang farmasi',
      ruanganId: ruanganMap['Gudang Farmasi'],
      logistik: {
        masterObatId: paracetamol ? paracetamol.id : null,
        subKategori: 'OBAT',
        sediaan: 'Tablet',
        nomorBatch: 'PCT2026A',
        tanggalExpired: new Date('2028-12-31'),
        hargaBeli: 5000,
        stok: 150,
        stokMinimum: 50,
        supplier: 'PT. Kimia Farma',
        lokasiSpesifik: 'Gudang Farmasi Rak A'
      }
    },
    {
      kodeAset: 'AST-MED-002',
      namaAset: 'Amoxicillin 500mg - Batch B',
      kategori: 'LOGISTIK_MEDIS',
      deskripsi: 'Stok antibiotik amoxicillin',
      ruanganId: ruanganMap['Gudang Farmasi'],
      logistik: {
        masterObatId: amoxicillin ? amoxicillin.id : null,
        subKategori: 'OBAT',
        sediaan: 'Kapsul',
        nomorBatch: 'AMX2026B',
        tanggalExpired: new Date('2028-06-30'),
        hargaBeli: 12000,
        stok: 100,
        stokMinimum: 20,
        supplier: 'PT. Bio Farma',
        lokasiSpesifik: 'Gudang Farmasi Rak B'
      }
    },
    {
      kodeAset: 'AST-MED-003',
      namaAset: 'Spuit 3cc Terumo',
      kategori: 'LOGISTIK_MEDIS',
      deskripsi: 'Alat suntik disposibel 3cc',
      ruanganId: ruanganMap['Gudang Farmasi'],
      logistik: {
        subKategori: 'BHP_MEDIS',
        sediaan: 'Pcs',
        nomorBatch: 'SPT2026A',
        tanggalExpired: new Date('2029-12-31'),
        hargaBeli: 1500,
        stok: 500,
        stokMinimum: 100,
        supplier: 'PT. OneMed Indonesia',
        lokasiSpesifik: 'Lemari BHP A'
      }
    },
    {
      kodeAset: 'AST-MED-004',
      namaAset: 'Vaksin BCG BioFarma',
      kategori: 'LOGISTIK_MEDIS',
      deskripsi: 'Vaksin imunisasi BCG',
      ruanganId: ruanganMap['Gudang Farmasi'],
      logistik: {
        subKategori: 'VAKSIN',
        sediaan: 'Vial',
        nomorBatch: 'BCG2026X',
        tanggalExpired: new Date('2027-06-30'),
        hargaBeli: 45000,
        stok: 50,
        stokMinimum: 10,
        supplier: 'PT. Bio Farma',
        lokasiSpesifik: 'Kulkas Vaksin Suhu 2-8 C'
      }
    }
  ];

  for (const item of medLogistics) {
    const exist = await prisma.aset.findUnique({ where: { kodeAset: item.kodeAset } });
    if (!exist) {
      const asset = await prisma.aset.create({
        data: {
          kodeAset: item.kodeAset,
          namaAset: item.namaAset,
          kategori: item.kategori,
          deskripsi: item.deskripsi,
          ruanganId: item.ruanganId,
          status: 'AKTIF'
        }
      });
      await prisma.asetLogistik.create({
        data: {
          asetId: asset.id,
          ...item.logistik
        }
      });
    }
  }
  console.log('Seeded Med Logistics.');

  // 4. Seed Aset Logistik Umum (Non-Medis, ATK)
  const genLogistics = [
    {
      kodeAset: 'AST-GEN-001',
      namaAset: 'Kertas A4 Sinar Dunia 80gr',
      kategori: 'LOGISTIK_UMUM',
      deskripsi: 'Kertas dokumen A4',
      ruanganId: ruanganMap['Gudang Logistik Umum'],
      logistik: {
        subKategori: 'ATK',
        sediaan: 'Rim',
        nomorBatch: 'ATK-KRT-01',
        hargaBeli: 55000,
        stok: 50,
        stokMinimum: 10,
        supplier: 'PT. ATK Jaya',
        lokasiSpesifik: 'Lemari Kertas 1'
      }
    },
    {
      kodeAset: 'AST-GEN-002',
      namaAset: 'Buku Register Pasien',
      kategori: 'LOGISTIK_UMUM',
      deskripsi: 'Buku rekap registrasi pasien manual',
      ruanganId: ruanganMap['Gudang Logistik Umum'],
      logistik: {
        subKategori: 'BARANG_CETAKAN',
        sediaan: 'Pcs',
        nomorBatch: 'ATK-BKM-01',
        hargaBeli: 15000,
        stok: 100,
        stokMinimum: 10,
        supplier: 'Percetakan Nasional',
        lokasiSpesifik: 'Rak Buku Register'
      }
    }
  ];

  for (const item of genLogistics) {
    const exist = await prisma.aset.findUnique({ where: { kodeAset: item.kodeAset } });
    if (!exist) {
      const asset = await prisma.aset.create({
        data: {
          kodeAset: item.kodeAset,
          namaAset: item.namaAset,
          kategori: item.kategori,
          deskripsi: item.deskripsi,
          ruanganId: item.ruanganId,
          status: 'AKTIF'
        }
      });
      await prisma.asetLogistik.create({
        data: {
          asetId: asset.id,
          ...item.logistik
        }
      });
    }
  }
  console.log('Seeded General Logistics.');

  // 5. Seed Alkes
  const alkesData = [
    {
      kodeAset: 'AST-MED-EQ-001',
      namaAset: 'Tensimeter Digital Omron HEM-7130',
      kategori: 'ALKES',
      deskripsi: 'Tensimeter otomatis pemeriksaan tekanan darah',
      ruanganId: ruanganMap['Poli Umum'],
      alkes: {
        merk: 'Omron',
        nomorSeri: 'OMR-TENS-09',
        tanggalPembelian: new Date('2025-01-10'),
        hargaPerolehan: 850000,
        wajibKalibrasi: true,
        noSertifikatKalibrasi: 'CAL-2025-001',
        tanggalKalibrasiTerakhir: new Date('2025-06-15'),
        intervalKalibrasi: 12,
        intervalMaintenance: 6,
        kondisi: 'BAIK'
      }
    },
    {
      kodeAset: 'AST-MED-EQ-002',
      namaAset: 'Stetoskop Littmann Classic III Black Edition',
      kategori: 'ALKES',
      deskripsi: 'Stetoskop pemeriksaan fisik',
      ruanganId: ruanganMap['Poli Umum'],
      alkes: {
        merk: 'Littmann',
        nomorSeri: 'LIT-STET-12',
        tanggalPembelian: new Date('2025-02-15'),
        hargaPerolehan: 1500000,
        wajibKalibrasi: false,
        kondisi: 'BAIK'
      }
    },
    {
      kodeAset: 'AST-MED-EQ-003',
      namaAset: 'Mikroskop Binokuler Olympus CX23',
      kategori: 'ALKES',
      deskripsi: 'Mikroskop penelitian sampel darah/feses/urin',
      ruanganId: ruanganMap['Laboratorium'],
      alkes: {
        merk: 'Olympus',
        nomorSeri: 'OLY-MIC-88',
        tanggalPembelian: new Date('2024-08-20'),
        hargaPerolehan: 12000000,
        wajibKalibrasi: true,
        noSertifikatKalibrasi: 'CAL-2024-088',
        tanggalKalibrasiTerakhir: new Date('2025-08-15'),
        intervalKalibrasi: 12,
        intervalMaintenance: 6,
        kondisi: 'BAIK'
      }
    }
  ];

  for (const item of alkesData) {
    const exist = await prisma.aset.findUnique({ where: { kodeAset: item.kodeAset } });
    if (!exist) {
      const asset = await prisma.aset.create({
        data: {
          kodeAset: item.kodeAset,
          namaAset: item.namaAset,
          kategori: item.kategori,
          deskripsi: item.deskripsi,
          ruanganId: item.ruanganId,
          status: 'AKTIF'
        }
      });
      await prisma.asetAlkes.create({
        data: {
          asetId: asset.id,
          ...item.alkes
        }
      });
    }
  }
  console.log('Seeded Alkes.');

  // 6. Seed Kendaraan
  const kendaraanData = [
    {
      kodeAset: 'AST-VEH-001',
      namaAset: 'Ambulans Suzuki APV GX',
      kategori: 'KENDARAAN',
      deskripsi: 'Kendaraan evakuasi medis darurat',
      ruanganId: ruanganMap['Garasi Ambulans'],
      kendaraan: {
        nomorPolisi: 'B 1234 PUS',
        jenisKendaraan: 'AMBULANS_TRANSPORT',
        merk: 'Suzuki',
        nomorRangka: 'MHFAPV1234567',
        nomorMesin: 'G15A-987654',
        tanggalPajak: new Date('2027-05-10'),
        idGps: 'GPS-AMB-01',
        intervalMaintenance: 3,
        pic: 'Budi Santoso',
        kondisi: 'STANDBY'
      }
    },
    {
      kodeAset: 'AST-VEH-002',
      namaAset: 'Mitsubishi Triton Pusling',
      kategori: 'KENDARAAN',
      deskripsi: 'Kendaraan operasional Puskesmas Keliling',
      ruanganId: ruanganMap['Garasi Ambulans'],
      kendaraan: {
        nomorPolisi: 'B 5678 PUS',
        jenisKendaraan: 'PUSKESMAS_KELILING',
        merk: 'Mitsubishi',
        nomorRangka: 'MHFTRITON76543',
        nomorMesin: '4D56-123456',
        tanggalPajak: new Date('2027-09-20'),
        idGps: 'GPS-PUS-02',
        intervalMaintenance: 3,
        pic: 'Joko Widodo',
        kondisi: 'STANDBY'
      }
    }
  ];

  for (const item of kendaraanData) {
    const exist = await prisma.aset.findUnique({ where: { kodeAset: item.kodeAset } });
    if (!exist) {
      const asset = await prisma.aset.create({
        data: {
          kodeAset: item.kodeAset,
          namaAset: item.namaAset,
          kategori: item.kategori,
          deskripsi: item.deskripsi,
          ruanganId: item.ruanganId,
          status: 'AKTIF'
        }
      });
      await prisma.asetKendaraan.create({
        data: {
          asetId: asset.id,
          ...item.kendaraan
        }
      });
    }
  }
  console.log('Seeded Vehicles.');

  // 7. Seed Inventaris Umum
  const inventarisData = [
    {
      kodeAset: 'AST-INV-001',
      namaAset: 'AC Split Daikin 1 PK',
      kategori: 'INVENTARIS',
      deskripsi: 'AC pendingin ruangan Poli Umum',
      ruanganId: ruanganMap['Poli Umum'],
      inventaris: {
        subKategori: 'ELEKTRONIK',
        tanggalPembelian: new Date('2024-05-15'),
        nilaiBeli: 4500000,
        masaPakai: 5,
        pic: 'Bagian Rumah Tangga'
      }
    },
    {
      kodeAset: 'AST-INV-002',
      namaAset: 'Meja Kerja Kayu Jati',
      kategori: 'INVENTARIS',
      deskripsi: 'Meja administrasi Poli Gigi',
      ruanganId: ruanganMap['Poli Gigi'],
      inventaris: {
        subKategori: 'MEBEL',
        tanggalPembelian: new Date('2023-01-10'),
        nilaiBeli: 1500000,
        masaPakai: 10,
        pic: 'Bagian Rumah Tangga'
      }
    }
  ];

  for (const item of inventarisData) {
    const exist = await prisma.aset.findUnique({ where: { kodeAset: item.kodeAset } });
    if (!exist) {
      const asset = await prisma.aset.create({
        data: {
          kodeAset: item.kodeAset,
          namaAset: item.namaAset,
          kategori: item.kategori,
          deskripsi: item.deskripsi,
          ruanganId: item.ruanganId,
          status: 'AKTIF'
        }
      });
      await prisma.asetInventaris.create({
        data: {
          asetId: asset.id,
          ...item.inventaris
        }
      });
    }
  }
  console.log('Seeded General Inventory.');

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
