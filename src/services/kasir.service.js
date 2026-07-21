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

  // 1. Karcis / Administrasi Pendaftaran
  let codeAdm = 'TRF-ADM-01'; // Default Rawat Jalan
  let nameAdm = 'Karcis Pendaftaran Rawat Jalan';
  let priceAdm = 15000;

  if (kunjungan.jenisPelayanan === 'Rawat Inap') {
    codeAdm = 'TRF-ADM-02';
    nameAdm = 'Karcis Pendaftaran Rawat Inap';
    priceAdm = 25000;
  } else if (kunjungan.jenisPelayanan === 'IGD') {
    codeAdm = 'TRF-ADM-03';
    nameAdm = 'Karcis Pendaftaran IGD';
    priceAdm = 20000;
  }

  const dbTarifAdm = await prisma.masterTarifPelayanan.findUnique({
    where: { kodeTarif: codeAdm }
  });

  if (dbTarifAdm && dbTarifAdm.statusAktif) {
    nameAdm = dbTarifAdm.namaTarif;
    priceAdm = dbTarifAdm.tarif;
  }

  details.push({
    namaItem: nameAdm,
    kategori: 'Pendaftaran',
    jumlah: 1,
    hargaSatuan: priceAdm,
    subTotal: priceAdm,
  });
  totalBiaya += priceAdm;

  // 2. Tindakan Medis
  if (kunjungan.tindakans && kunjungan.tindakans.length > 0) {
    for (const t of kunjungan.tindakans) {
      let tarifTindakan = 50000; // Default fallback
      let namaTindakan = `Tindakan: ${t.icd9?.nama_prosedur || 'Prosedur Medis'}`;

      if (t.icd9Id) {
        const dbTarifTnd = await prisma.masterTarifPelayanan.findFirst({
          where: {
            icd9Id: t.icd9Id,
            kategori: 'TINDAKAN',
            statusAktif: true
          }
        });
        if (dbTarifTnd) {
          tarifTindakan = dbTarifTnd.tarif;
          namaTindakan = dbTarifTnd.namaTarif;
        }
      }

      details.push({
        namaItem: namaTindakan,
        kategori: 'Tindakan',
        jumlah: 1,
        hargaSatuan: tarifTindakan,
        subTotal: tarifTindakan,
      });
      totalBiaya += tarifTindakan;
    }
  }

  // 3. Obat / Resep (Dihitung dinamis HNA + Margin + Tuslah)
  if (kunjungan.resep && kunjungan.resep.length > 0) {
    for (const r of kunjungan.resep) {
      if (r.details) {
        for (const detail of r.details) {
          let priceObat = detail.obat?.harga || 10000; // HNA base
          const qty = detail.jumlah;
          
          if (detail.obat) {
            // Cari margin/tuslah di MasterTarifFarmasi berdasarkan kategori obat
            const dbTarifObt = await prisma.masterTarifFarmasi.findFirst({
              where: {
                kategoriObat: { equals: detail.obat.kategori, mode: 'insensitive' },
                statusAktif: true
              }
            });
            
            if (dbTarifObt) {
              const margin = dbTarifObt.marginPersen / 100;
              const calculatedPrice = (detail.obat.harga * (1 + margin)) + dbTarifObt.tuslah;
              priceObat = Math.round(calculatedPrice);
            }
          }

          const subTotalObat = priceObat * qty;
          details.push({
            namaItem: `Obat: ${detail.obat?.namaObat || 'Obat Generik'}`,
            kategori: 'Obat',
            jumlah: qty,
            hargaSatuan: priceObat,
            subTotal: subTotalObat,
          });
          totalBiaya += subTotalObat;
        }
      }
    }
  }

  // 4. Pemeriksaan Laboratorium
  if (kunjungan.orderLab && kunjungan.orderLab.details) {
    for (const detail of kunjungan.orderLab.details) {
      let tarifLab = 30000; // Default fallback
      let namaLab = `Lab: ${detail.parameter}`;

      const dbTarifLab = await prisma.masterTarifPelayanan.findFirst({
        where: {
          kategori: 'LABORATORIUM',
          statusAktif: true,
          lab: {
            parameter: { equals: detail.parameter, mode: 'insensitive' }
          }
        }
      });

      if (dbTarifLab) {
        tarifLab = dbTarifLab.tarif;
        namaLab = dbTarifLab.namaTarif;
      }

      details.push({
        namaItem: namaLab,
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

    // 4. Cari dan selesaikan resep yang belum diproses (potong stok FEFO)
    const pendingReseps = await tx.resep.findMany({
      where: {
        kunjunganId: tagihan.kunjunganId,
        status: 'MENUNGGU_FARMASI'
      },
      include: {
        details: true
      }
    });

    for (const resep of pendingReseps) {
      for (const detail of resep.details) {
        const obat = await tx.masterObat.findUnique({
          where: { id: detail.obatId }
        });

        if (obat) {
          // Kurangi stok MasterObat (jangan biarkan negatif, minimal 0)
          const newStok = Math.max(0, obat.stok - detail.jumlah);
          await tx.masterObat.update({
            where: { id: detail.obatId },
            data: { stok: newStok }
          });

          // Kurangi stok pada AsetLogistik menggunakan metode FEFO
          let remainingToDeduct = detail.jumlah;
          const batches = await tx.asetLogistik.findMany({
            where: {
              masterObatId: detail.obatId,
              stok: { gt: 0 }
            },
            orderBy: [
              { tanggalExpired: 'asc' }
            ]
          });

          for (const batch of batches) {
            if (remainingToDeduct <= 0) break;

            if (batch.stok >= remainingToDeduct) {
              await tx.asetLogistik.update({
                where: { id: batch.id },
                data: {
                  stok: {
                    decrement: remainingToDeduct
                  }
                }
              });
              remainingToDeduct = 0;
            } else {
              remainingToDeduct -= batch.stok;
              await tx.asetLogistik.update({
                where: { id: batch.id },
                data: { stok: 0 }
              });
            }
          }
        }
      }

      // Tandai resep sebagai SELESAI
      await tx.resep.update({
        where: { id: resep.id },
        data: { status: 'SELESAI' }
      });
    }

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
