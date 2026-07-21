const prisma = require('../config/prisma');

/**
 * Get all Kunjungan with status MENUNGGU for Screening
 */
const getKunjunganScreening = async (user) => {
  const whereClause = {
    statusKunjungan: 'MENUNGGU',
  };

  // Filter isolasi data: Perawat hanya melihat antrian di Polinya
  if (user && user.role === 'PERAWAT' && user.poliklinikId) {
    whereClause.poliklinikId = user.poliklinikId;
  }

  const kunjungans = await prisma.kunjungan.findMany({
    where: whereClause,
    include: {
      pasien: true,
      poliklinik: true,
      dokterTujuan: {
        select: {
          id: true,
          username: true,
          namaLengkap: true,
          role: true,
        }
      }
    },
    orderBy: [
      { tanggalRegistrasi: 'asc' },
      { jamRegistrasi: 'asc' },
    ],
  });

  return kunjungans;
};

/**
 * Panggil Kunjungan (Status Locking)
 */
const panggilKunjungan = async (kunjunganId, petugasId) => {
  // Gunakan transaction untuk locking
  return await prisma.$transaction(async (tx) => {
    const kunjungan = await tx.kunjungan.findUnique({
      where: { id: kunjunganId },
    });

    if (!kunjungan) {
      const err = new Error('Data Kunjungan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (kunjungan.statusKunjungan !== 'MENUNGGU') {
      const err = new Error('Maaf, pasien ini sudah dipanggil oleh perawat lain atau sudah diproses.');
      err.statusCode = 400;
      throw err;
    }

    // Lock status menjadi DIPROSES_SCREENING
    const updated = await tx.kunjungan.update({
      where: { id: kunjunganId },
      data: {
        statusKunjungan: 'DIPROSES_SCREENING',
        // Idealnya kita bisa menyimpan petugasScreeningId ke Kunjungan, tapi karena belum ada di schema,
        // kita cukup ganti status saja untuk me-lock antrean.
      },
    });

    return updated;
  });
};

const getKunjunganById = async (id) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id },
    include: {
      pasien: true,
      poliklinik: true,
      dokterTujuan: {
        select: { id: true, namaLengkap: true, username: true }
      }
    },
  });
  if (!kunjungan) {
    const err = new Error('Data Kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return kunjungan;
};

// Tambahkan fungsi ini di src/services/kunjungan.service.js
const updateStatusKunjungan = async (kunjunganId, statusBaru) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId }
  });

  if (!kunjungan) {
    const err = new Error('Data Kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  // Update status menggunakan Prisma
  return await prisma.kunjungan.update({
    where: { id: kunjunganId },
    data: { statusKunjungan: statusBaru }
  });
};

/**
 * Dapatkan Statistik Dashboard Loket Pendaftaran
 */
const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Stats Hari Ini
  const totalHariIni = await prisma.kunjungan.count({
    where: {
      tanggalRegistrasi: { gte: today, lt: tomorrow }
    }
  });

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const totalBulanIni = await prisma.kunjungan.count({
    where: {
      tanggalRegistrasi: { gte: firstDayOfMonth, lt: tomorrow }
    }
  });

  const menunggu = await prisma.kunjungan.count({
    where: {
      tanggalRegistrasi: { gte: today, lt: tomorrow },
      statusKunjungan: { in: ['MENUNGGU', 'MENUNGGU_DOKTER'] }
    }
  });

  const sedangDilayani = await prisma.kunjungan.count({
    where: {
      tanggalRegistrasi: { gte: today, lt: tomorrow },
      statusKunjungan: { in: ['DIPROSES_SCREENING', 'DIPERIKSA'] }
    }
  });

  const selesai = await prisma.kunjungan.count({
    where: {
      tanggalRegistrasi: { gte: today, lt: tomorrow },
      statusKunjungan: { in: ['SELESAI', 'MENUNGGU_KASIR', 'MENUNGGU_FARMASI', 'PULANG', 'BATAL'] }
    }
  });

  // 2. Stats Asuransi (Join Pasien -> PenjaminPasien)
  const allKunjunganToday = await prisma.kunjungan.findMany({
    where: { tanggalRegistrasi: { gte: today, lt: tomorrow } },
    include: {
      pasien: {
        include: { penjamin: true }
      }
    }
  });

  const pembayaranMap = {
    'Umum / Mandiri': 0,
    'BPJS Kesehatan': 0,
    'Asuransi Swasta': 0,
    'Perusahaan': 0,
    'KIS': 0
  };
  
  allKunjunganToday.forEach(k => {
    let jp = k.pasien?.penjamin?.jenisPenjamin || 'Umum / Mandiri';
    if (jp === 'Umum') jp = 'Umum / Mandiri';
    else if (jp.toLowerCase() === 'bpjs') jp = 'BPJS Kesehatan';
    
    if (pembayaranMap[jp] === undefined) pembayaranMap[jp] = 0;
    pembayaranMap[jp]++;
  });

  const pembayaranList = Object.keys(pembayaranMap).map(label => ({
    label,
    value: pembayaranMap[label]
  })).sort((a, b) => b.value - a.value);

  const prioritas = {
    lansia: allKunjunganToday.filter(k => k.prioritas?.toLowerCase() === 'lansia').length,
    disabilitas: allKunjunganToday.filter(k => k.prioritas?.toLowerCase() === 'disabilitas').length,
    hamilMenyusui: allKunjunganToday.filter(k => k.prioritas?.toLowerCase().includes('hamil')).length,
  };

  // 3. Antrian Hari Ini
  const antreanHariIni = await prisma.kunjungan.findMany({
    where: { tanggalRegistrasi: { gte: today, lt: tomorrow } },
    include: {
      pasien: {
        include: { penjamin: true }
      },
      poliklinik: true
    },
    orderBy: [
      { tanggalRegistrasi: 'desc' },
      { jamRegistrasi: 'desc' }
    ],
    take: 50 // Batasi 50 terbaru untuk dashboard
  });

  // 4. Poli List with counts
  const polis = await prisma.poliklinik.findMany();
  const statusPoli = polis.map(p => {
    const count = allKunjunganToday.filter(k => k.poliklinikId === p.id).length;
    return {
      nama: p.namaPoli,
      jumlah: count,
      status: p.statusAktif ? 'Buka' : 'Tutup'
    };
  });

  // 5. Grafik 7 Hari (Group By Date)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const last7DaysData = await prisma.kunjungan.findMany({
    where: {
      tanggalRegistrasi: {
        gte: sevenDaysAgo,
        lt: tomorrow
      }
    },
    include: {
      pasien: {
        include: { penjamin: true }
      }
    }
  });

  const grafik = [];
  const days = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayStr = days[d.getDay()];
    
    // Check if this date is today
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    const label = isToday ? 'Ini' : dayStr;

    const kForDay = last7DaysData.filter(k => {
      const kDate = new Date(k.tanggalRegistrasi);
      return kDate.getDate() === d.getDate() && kDate.getMonth() === d.getMonth() && kDate.getFullYear() === d.getFullYear();
    });

    const bpjsCount = kForDay.filter(k => k.pasien?.penjamin?.jenisPenjamin?.toLowerCase() === 'bpjs').length;

    grafik.push({
      hari: label,
      jumlah: kForDay.length,
      bpjs: bpjsCount
    });
  }

  return {
    stats: {
      totalHariIni,
      totalBulanIni,
      menunggu,
      sedangDilayani,
      selesai,
      pembayaranList,
      prioritas
    },
    antrean: antreanHariIni,
    grafik,
    poli: statusPoli
  };
};

/**
 * Dapatkan Statistik Dashboard Perawat
 */
const getPerawatDashboardStats = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter isolasi data: Perawat hanya melihat antrean di Polinya
  const poliFilter = user && user.poliklinikId ? { poliklinikId: user.poliklinikId } : {};

  // 1. Stats Hari Ini (Khusus Poli ybs)
  const allKunjunganPoli = await prisma.kunjungan.findMany({
    where: {
      tanggalRegistrasi: { gte: today, lt: tomorrow },
      ...poliFilter
    },
    include: {
      pasien: true,
      poliklinik: true,
      screening: true,
    },
    orderBy: [
      { tanggalRegistrasi: 'asc' },
      { jamRegistrasi: 'asc' }
    ]
  });

  const totalAntrean = allKunjunganPoli.length;
  
  const antreanAktif = allKunjunganPoli.filter(k => k.statusKunjungan === 'MENUNGGU' || k.statusKunjungan === 'DIPROSES_SCREENING');
  
  const belumSkrining = allKunjunganPoli.filter(k => k.statusKunjungan === 'MENUNGGU').length;
  const sudahSkrining = allKunjunganPoli.filter(k => 
    k.statusKunjungan === 'DIPERIKSA' || 
    k.statusKunjungan === 'SELESAI' || 
    k.statusKunjungan === 'MENUNGGU_KASIR' || 
    k.statusKunjungan === 'MENUNGGU_FARMASI' || 
    k.statusKunjungan === 'PULANG'
  ).length;

  // 2. Data Triage (Khusus Poli ybs, yang sudah discrining)
  const triage = {
    merah: 0,
    kuning: 0,
    hijau: 0,
    hitam: 0
  };

  allKunjunganPoli.forEach(k => {
    if (k.screening && k.screening.kategoriTriage) {
      const kat = k.screening.kategoriTriage.toLowerCase();
      if (kat.includes('merah')) triage.merah++;
      else if (kat.includes('kuning')) triage.kuning++;
      else if (kat.includes('hijau')) triage.hijau++;
      else if (kat.includes('hitam')) triage.hitam++;
    }
  });

  return {
    stats: {
      totalAntrean,
      belumSkrining,
      sudahSkrining
    },
    triage,
    antrean: antreanAktif
  };
};

/**
 * Dapatkan Statistik Dashboard Dokter
 */
const getDokterDashboardStats = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter isolasi data: Dokter/Perawat hanya melihat antrian jika pasien masuk ke Poli-nya.
  const poliFilter = {};
  if (user && (user.role === 'DOKTER' || user.role === 'PERAWAT') && user.poliklinikId) {
    poliFilter.OR = [
      { poliklinikId: user.poliklinikId },
      { dokterTujuanId: user.id }
    ];
  }

  const allKunjunganPoliHariIni = await prisma.kunjungan.findMany({
    where: {
      tanggalRegistrasi: { gte: today, lt: tomorrow },
      ...(poliFilter.OR ? { OR: poliFilter.OR } : poliFilter)
    }
  });

  const totalHariIni = allKunjunganPoliHariIni.length;
  
  const menunggu = allKunjunganPoliHariIni.filter(k => k.statusKunjungan === 'MENUNGGU_DOKTER').length;
  const sedangDilayani = allKunjunganPoliHariIni.filter(k => k.statusKunjungan === 'DIPERIKSA' || k.statusKunjungan === 'MENUNGGU_LAB').length;
  const selesai = allKunjunganPoliHariIni.filter(k => 
    k.statusKunjungan === 'SELESAI' || 
    k.statusKunjungan === 'MENUNGGU_KASIR' || 
    k.statusKunjungan === 'MENUNGGU_FARMASI' || 
    k.statusKunjungan === 'PULANG'
  ).length;

  return {
    totalHariIni,
    menunggu,
    sedangDilayani,
    selesai
  };
};



module.exports = {
  getKunjunganScreening,
  panggilKunjungan,
  getKunjunganById,
  updateStatusKunjungan,
  getDashboardStats,
  getPerawatDashboardStats,
  getDokterDashboardStats,
};
