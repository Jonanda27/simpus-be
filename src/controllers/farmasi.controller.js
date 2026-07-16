const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get Antrian Farmasi (MENUNGGU_FARMASI)
exports.getAntrianFarmasi = async (req, res) => {
  try {
    const resepList = await prisma.resep.findMany({
      where: {
        status: 'MENUNGGU_FARMASI'
      },
      include: {
        pasien: true,
        dokter: true,
        kunjungan: {
          include: {
            poliklinik: true
          }
        },
        details: {
          include: {
            obat: true
          }
        }
      },
      orderBy: {
        tanggalResep: 'asc'
      }
    });

    res.json({
      status: 'success',
      data: resepList
    });
  } catch (error) {
    console.error('Error in getAntrianFarmasi:', error);
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data antrian farmasi' });
  }
};

// 2. Get Detail Resep by ID
exports.getResepById = async (req, res) => {
  try {
    const { id } = req.params;
    const resep = await prisma.resep.findUnique({
      where: { id },
      include: {
        pasien: true,
        dokter: true,
        kunjungan: {
          include: {
            poliklinik: true
          }
        },
        details: {
          include: {
            obat: true
          }
        }
      }
    });

    if (!resep) {
      return res.status(404).json({ status: 'error', message: 'Resep tidak ditemukan' });
    }

    res.json({
      status: 'success',
      data: resep
    });
  } catch (error) {
    console.error('Error in getResepById:', error);
    res.status(500).json({ status: 'error', message: 'Gagal mengambil detail resep' });
  }
};

// 3. Proses Resep (Kurangi Stok & Ubah Status)
exports.prosesResep = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gunakan transaksi agar jika salah satu gagal, semuanya batal (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil resep beserta detailnya
      const resep = await tx.resep.findUnique({
        where: { id },
        include: { details: true, kunjungan: true }
      });

      if (!resep) {
        throw new Error('Resep tidak ditemukan');
      }

      if (resep.status === 'SELESAI') {
        throw new Error('Resep ini sudah diproses sebelumnya');
      }

      // 2. Kurangi stok obat
      for (const detail of resep.details) {
        const obatLama = await tx.masterObat.findUnique({
          where: { id: detail.obatId }
        });

        if (!obatLama) {
          throw new Error(`Data obat tidak ditemukan untuk ID: ${detail.obatId}`);
        }

        if (obatLama.stok < detail.jumlah) {
          throw new Error(`Stok obat ${obatLama.namaObat} tidak mencukupi. Tersedia: ${obatLama.stok}, Diminta: ${detail.jumlah}`);
        }

        await tx.masterObat.update({
          where: { id: detail.obatId },
          data: {
            stok: {
              decrement: detail.jumlah
            }
          }
        });
      }

      // 3. Update status Resep menjadi SELESAI
      const updatedResep = await tx.resep.update({
        where: { id },
        data: { status: 'SELESAI' }
      });

      // 4. Update status Kunjungan menjadi MENUNGGU_KASIR
      await tx.kunjungan.update({
        where: { id: resep.kunjunganId },
        data: { statusKunjungan: 'MENUNGGU_KASIR' }
      });

      return updatedResep;
    });

    res.json({
      status: 'success',
      message: 'Resep berhasil diproses, stok obat telah dikurangi, dan pasien diarahkan ke Kasir.',
      data: result
    });
  } catch (error) {
    console.error('Error in prosesResep:', error);
    res.status(400).json({ status: 'error', message: error.message || 'Gagal memproses resep' });
  }
};
