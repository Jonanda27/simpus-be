const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const satusehatService = require('../services/satusehat.service');
const SatuSehatGateway = require('../services/satusehat/gateway.service');
const { toRawatJalanBundle } = require('../utils/fhir-mappers');

// 1. Get Antrian Farmasi (MENUNGGU_FARMASI)
exports.getAntrianFarmasi = async (req, res) => {
  try {
    const resepList = await prisma.resep.findMany({
      where: {
        status: 'MENUNGGU_FARMASI'
      },
      include: {
        pasien: true,
        dokter: {
          include: {
            tenagaMedis: true
          }
        },
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
        dokter: {
          include: {
            tenagaMedis: true
          }
        },
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

      // Pengecekan pembayaran di Kasir (Kecuali Pasien BPJS/Gratis)
      const tagihan = await tx.tagihan.findUnique({
        where: { kunjunganId: resep.kunjunganId }
      });

      if (tagihan && tagihan.statusTagihan !== 'LUNAS' && resep.kunjungan.jenisPenjamin !== 'BPJS') {
        throw new Error('Pasien belum melakukan pembayaran di Kasir. Mohon arahkan pasien ke Kasir terlebih dahulu.');
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
    // Sinkronisasi SATUSEHAT Bundle Transaction (Luar transaksi)
    // -------------------------------------
    const resep = result.resepLengkap;
    
    try {
      // Ambil data kunjungan lengkap beserta seluruh relasi medis
      const dataComplete = await prisma.kunjungan.findUnique({
        where: { id: resep.kunjunganId },
        include: {
          pasien: true,
          poliklinik: true,
          screening: true,
          rekamMedis: true,
          persetujuan: true,
          diagnosis: { include: { icd10: true } },
          tindakans: { include: { icd9: true } },
          resep: {
            include: {
              details: { include: { obat: true } }
            }
          },
          dokterTujuan: { include: { tenagaMedis: true } }
        }
      });

      if (dataComplete && dataComplete.persetujuan?.persetujuanSatusehat !== false) {
        // Ekstrak detail resep
        const resepDetails = [];
        if (Array.isArray(dataComplete.resep)) {
          dataComplete.resep.forEach((r) => {
            if (Array.isArray(r.details)) {
              r.details.forEach((d) => resepDetails.push({ ...d, resepId: r.id }));
            }
          });
        }

        const completePayload = {
          ...dataComplete,
          resepDetails,
          encounterId: dataComplete.encounterId
        };

        // Rakit Bundle Transaction Payload
        const bundlePayload = toRawatJalanBundle(completePayload);
        console.log(`[Farmasi SATUSEHAT] 🚀 Mengirim Bundle Transaction Lengkap untuk Kunjungan ID: ${resep.kunjunganId}...`);
        
        await SatuSehatGateway.sendBundleTransaction(bundlePayload);
        
        await prisma.kunjungan.update({
          where: { id: resep.kunjunganId },
          data: {
            satusehat_sync_status: 'SUCCESS',
            satusehat_last_error: null
          }
        });
      }
    } catch (ssErr) {
      console.error(`[Farmasi SATUSEHAT Error] Gagal mengirim Bundle Transaction:`, ssErr.message || ssErr);
      await prisma.kunjungan.update({
        where: { id: resep.kunjunganId },
        data: {
          satusehat_sync_status: 'FAILED',
          satusehat_last_error: ssErr.message || String(ssErr)
        }
      });
    }

    res.json({
      status: 'success',
      message: 'Resep berhasil diproses, stok obat telah dikurangi, dan data SATUSEHAT terintegrasi.',
      data: result.updatedResep
    });
  } catch (error) {
    console.error('Error in prosesResep:', error);
    res.status(400).json({ status: 'error', message: error.message || 'Gagal memproses resep' });
  }
};
