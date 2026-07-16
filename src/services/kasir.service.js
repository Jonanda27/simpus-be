const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAntrianKasir = async () => {
  return await prisma.kunjungan.findMany({
    where: {
      statusKunjungan: 'MENUNGGU_KASIR',
    },
    include: {
      pasien: {
        include: { penjamin: true }
      },
      poliklinik: true,
      tagihan: {
        include: {
          details: true,
        },
      },
    },
    orderBy: {
      tanggalRegistrasi: 'asc',
    },
  });
};

const generateTagihan = async (kunjunganId) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id: kunjunganId },
    include: {
      pasien: true,
      tindakans: {
        include: { icd9: true },
      },
      resep: {
        include: { details: { include: { obat: true } } },
      },
      orderLab: {
        include: { details: true },
      },
      tagihan: true,
    },
  });

  if (!kunjungan) {
    throw new Error('Kunjungan tidak ditemukan');
  }

  // Jika tagihan sudah ada (tapi belum dibayar), kita hapus lalu generate ulang (untuk refresh)
  if (kunjungan.tagihan && kunjungan.tagihan.statusTagihan !== 'LUNAS') {
    await prisma.tagihan.delete({
      where: { id: kunjungan.tagihan.id },
    });
  } else if (kunjungan.tagihan && kunjungan.tagihan.statusTagihan === 'LUNAS') {
    return kunjungan.tagihan; // Sudah lunas, tidak perlu generate ulang
  }

  const details = [];
  let totalBiaya = 0;

  // 1. Karcis / Administrasi
  const tarifKarcis = 15000;
  details.push({
    namaItem: 'Karcis Pendaftaran & Konsultasi',
    kategori: 'Pendaftaran',
    jumlah: 1,
    hargaSatuan: tarifKarcis,
    subTotal: tarifKarcis,
  });
  totalBiaya += tarifKarcis;

  // 2. Tindakan (Dummy 50.000)
  if (kunjungan.tindakans && kunjungan.tindakans.length > 0) {
    for (const t of kunjungan.tindakans) {
      const tarifTindakan = 50000;
      details.push({
        namaItem: `Tindakan: ${t.icd9?.nama_prosedur || 'Prosedur Medis'}`,
        kategori: 'Tindakan',
        jumlah: 1,
        hargaSatuan: tarifTindakan,
        subTotal: tarifTindakan,
      });
      totalBiaya += tarifTindakan;
    }
  }

  // 3. Obat / Resep (Dummy 10.000 per obat)
  if (kunjungan.resep && kunjungan.resep.length > 0) {
    for (const r of kunjungan.resep) {
      if (r.details) {
        for (const detail of r.details) {
          const tarifObat = 10000; // Harusnya diambil dari detail.obat.harga
          const qty = detail.jumlah;
          const subTotalObat = tarifObat * qty;
          details.push({
            namaItem: `Obat: ${detail.obat?.namaObat || 'Obat Generik'}`,
            kategori: 'Obat',
            jumlah: qty,
            hargaSatuan: tarifObat,
            subTotal: subTotalObat,
          });
          totalBiaya += subTotalObat;
        }
      }
    }
  }

  // 4. Lab (Dummy 30.000 per parameter)
  if (kunjungan.orderLab && kunjungan.orderLab.details) {
    for (const detail of kunjungan.orderLab.details) {
      const tarifLab = 30000;
      details.push({
        namaItem: `Lab: ${detail.parameter}`,
        kategori: 'Laboratorium',
        jumlah: 1,
        hargaSatuan: tarifLab,
        subTotal: tarifLab,
      });
      totalBiaya += tarifLab;
    }
  }

  // Buat Tagihan
  const tagihan = await prisma.tagihan.create({
    data: {
      kunjunganId: kunjungan.id,
      pasienId: kunjungan.pasienId,
      totalBiaya,
      statusTagihan: 'BELUM_LUNAS',
      details: {
        create: details,
      },
    },
    include: {
      details: true,
      kunjungan: {
        include: { pasien: true },
      },
    },
  });

  return tagihan;
};

const getTagihan = async (tagihanId) => {
  return await prisma.tagihan.findUnique({
    where: { id: tagihanId },
    include: {
      details: true,
      kunjungan: {
        include: {
          pasien: true,
          poliklinik: true,
        },
      },
      pembayaran: true,
    },
  });
};

const prosesPembayaran = async (tagihanId, userId, data) => {
  const { jumlahBayar, metodePembayaran } = data;

  const tagihan = await prisma.tagihan.findUnique({
    where: { id: tagihanId },
  });

  if (!tagihan) {
    throw new Error('Tagihan tidak ditemukan');
  }

  if (tagihan.statusTagihan === 'LUNAS') {
    throw new Error('Tagihan sudah lunas');
  }

  if (metodePembayaran !== 'BPJS' && jumlahBayar < tagihan.totalBiaya) {
    throw new Error('Jumlah uang kurang dari total tagihan');
  }

  const kembalian = metodePembayaran === 'BPJS' ? 0 : jumlahBayar - tagihan.totalBiaya;
  const actualBayar = metodePembayaran === 'BPJS' ? tagihan.totalBiaya : jumlahBayar; // Jika BPJS, anggap dibayar pas (meski uang 0)

  return await prisma.$transaction(async (tx) => {
    // 1. Buat record Pembayaran
    const pembayaran = await tx.pembayaran.create({
      data: {
        tagihanId,
        jumlahBayar: actualBayar,
        kembalian,
        metodePembayaran,
        kasirId: userId,
      },
    });

    // 2. Update Tagihan jadi LUNAS
    const updatedTagihan = await tx.tagihan.update({
      where: { id: tagihanId },
      data: { statusTagihan: 'LUNAS' },
    });

    // 3. Selesaikan kunjungan
    await tx.kunjungan.update({
      where: { id: tagihan.kunjunganId },
      data: { statusKunjungan: 'SELESAI' },
    });

    return updatedTagihan;
  });
};

const getRiwayatKasir = async () => {
  return await prisma.tagihan.findMany({
    where: {
      statusTagihan: 'LUNAS',
    },
    include: {
      pasien: true,
      pembayaran: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 50,
  });
};

module.exports = {
  getAntrianKasir,
  generateTagihan,
  getTagihan,
  prosesPembayaran,
  getRiwayatKasir,
};
