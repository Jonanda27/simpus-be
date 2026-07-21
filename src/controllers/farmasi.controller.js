const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const satusehatService = require('../services/satusehat.service');

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
            poliklinik: true,
            tagihan: {
              select: { statusTagihan: true }
            }
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
            poliklinik: true,
            tagihan: {
              select: { statusTagihan: true }
            }
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
        include: { 
          details: {
            include: { obat: true }
          }, 
          kunjungan: {
            include: { poliklinik: true }
          },
          pasien: true,
          dokter: { include: { tenagaMedis: true } }
        }
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

      // 4. Update status Kunjungan menjadi SELESAI (karena apotek adalah tahap terakhir)
      await tx.kunjungan.update({
        where: { id: resep.kunjunganId },
        data: { statusKunjungan: 'SELESAI' }
      });

      return { updatedResep, resepLengkap: resep };
    });

    // -------------------------------------
    // Sinkronisasi SATUSEHAT (Luar transaksi)
    // -------------------------------------
    const resep = result.resepLengkap;
    let medCount = 0;
    for (const detail of resep.details) {
      if (detail.obat && detail.obat.kodeObat && resep.kunjungan.encounterId && resep.pasien.noIHS && resep.dokter.tenagaMedis?.noIHS) {
        try {
          await satusehatService.postMedicationDispense({
            resepId: resep.id,
            resepDetailId: `${resep.id}-${detail.obat.id}`,
            kodeObat: detail.obat.kodeObat,
            namaObat: detail.obat.namaObat,
            sediaan: detail.obat.sediaan,
            pasienIhs: resep.pasien.noIHS,
            pasienName: resep.pasien.namaLengkap,
            practitionerIhs: resep.dokter.tenagaMedis.noIHS,
            practitionerName: resep.dokter.namaLengkap,
            encounterId: resep.kunjungan.encounterId,
            locationId: resep.kunjungan.poliklinik.ihsLocationId,
            locationName: resep.kunjungan.poliklinik.namaPoli,
            jumlah: detail.jumlah,
            jumlahHari: 3, // Asumsi standar jika tidak ada data durasi hari
            instruksi: detail.aturanPakai,
            frekuensi: 3, 
            dosis: 1
          });
          medCount++;
        } catch (err) {
          console.error(`Error sync MedicationDispense SATUSEHAT untuk Obat ${detail.obat.kodeObat}:`, err.message);
        }
      }
    }

    // Update status SATUSEHAT di Kunjungan
    if (medCount > 0) {
      const syncStatus = (typeof resep.kunjungan.satusehatSync === 'object' && resep.kunjungan.satusehatSync !== null) 
        ? { ...resep.kunjungan.satusehatSync } 
        : {};
      
      syncStatus.MedicationDispense = { status: 'SUCCESS', detail: `Sent ${medCount} dispenses` };
      
      await prisma.kunjungan.update({
        where: { id: resep.kunjunganId },
        data: { satusehatSync: syncStatus }
      });
    }

    res.json({
      status: 'success',
      message: 'Resep berhasil diproses, stok obat telah dikurangi, dan pasien diarahkan ke Kasir.',
      data: result.updatedResep
    });
  } catch (error) {
    console.error('Error in prosesResep:', error);
    res.status(400).json({ status: 'error', message: error.message || 'Gagal memproses resep' });
  }
};
