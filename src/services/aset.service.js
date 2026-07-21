const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAsets = async (search, kategori) => {
  const where = {};
  
  if (kategori) {
    where.kategori = kategori;
  }
  
  if (search) {
    where.OR = [
      { namaAset: { contains: search, mode: 'insensitive' } },
      { kodeAset: { contains: search, mode: 'insensitive' } }
    ];
  }

  // 1. Ambil semua aset riil yang terdaftar
  const realAssets = await prisma.aset.findMany({
    where,
    include: {
      ruangan: true,
      logistik: {
        include: {
          masterObat: true
        }
      },
      alkes: true,
      kendaraan: true,
      inventaris: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // 2. Jika filter kategori adalah LOGISTIK_MEDIS atau kosong (Semua), ambil MasterObat untuk digabung
  if (!kategori || kategori === 'LOGISTIK_MEDIS') {
    const obatWhere = {};
    if (search) {
      obatWhere.OR = [
        { namaObat: { contains: search, mode: 'insensitive' } },
        { kodeObat: { contains: search, mode: 'insensitive' } }
      ];
    }

    const allObat = await prisma.masterObat.findMany({
      where: obatWhere,
      include: {
        asets: true
      }
    });

    // Ambil obat/BHP yang belum diinputkan batch logistiknya sama sekali
    const obatWithoutAssets = allObat.filter(o => o.asets.length === 0);

    // Format menjadi virtual asset agar masuk ke tabel logistik & aset
    const virtualAssets = obatWithoutAssets.map(o => ({
      id: `virtual-${o.id}`,
      kodeAset: o.kodeObat,
      namaAset: o.namaObat,
      kategori: 'LOGISTIK_MEDIS',
      deskripsi: 'Katalog Obat/BHP Farmasi (Belum didaftarkan batch logistik)',
      status: 'AKTIF',
      gambarUrl: o.gambarUrl,
      ruanganId: null,
      ruangan: null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      logistik: {
        id: `virtual-logistik-${o.id}`,
        asetId: `virtual-${o.id}`,
        masterObatId: o.id,
        subKategori: o.kategori?.toUpperCase().includes('VAKSIN') ? 'VAKSIN' : (o.kategori?.toUpperCase().includes('BHP') ? 'BHP_MEDIS' : 'OBAT'),
        sediaan: o.sediaan || 'Tablet',
        nomorBatch: 'Belum Diatur',
        tanggalExpired: null,
        hargaBeli: o.harga || 0,
        stok: o.stok || 0,
        stokMinimum: 0,
        supplier: '-',
        lokasiSpesifik: 'Gudang Farmasi',
        masterObat: o
      },
      alkes: null,
      kendaraan: null,
      inventaris: null
    }));

    // Gabungkan aset riil dan virtual asset
    return [...realAssets, ...virtualAssets];
  }

  return realAssets;
};

const createAset = async (data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the base asset
    const asset = await tx.aset.create({
      data: {
        kodeAset: data.kodeAset,
        namaAset: data.namaAset,
        kategori: data.kategori,
        deskripsi: data.deskripsi || null,
        status: data.status || 'AKTIF',
        gambarUrl: data.gambarUrl || null,
        ruanganId: data.ruanganId || null,
      }
    });

    // 2. Create the category-specific details based on category
    if (data.kategori === 'LOGISTIK_MEDIS' || data.kategori === 'LOGISTIK_UMUM') {
      await tx.asetLogistik.create({
        data: {
          asetId: asset.id,
          masterObatId: data.masterObatId || null,
          subKategori: data.subKategori,
          sediaan: data.sediaan || data.satuan || null,
          nomorBatch: data.nomorBatch || null,
          tanggalExpired: data.tanggalExpired ? new Date(data.tanggalExpired) : null,
          hargaBeli: parseFloat(data.hargaBeli) || 0,
          stok: parseInt(data.stok) || 0,
          stokMinimum: parseInt(data.stokMinimum) || 0,
          supplier: data.supplier || null,
          lokasiSpesifik: data.lokasiSpesifik || null,
        }
      });
      
      // Update MasterObat stock & price if linked and provided
      if (data.masterObatId) {
        await tx.masterObat.update({
          where: { id: data.masterObatId },
          data: { 
            stok: parseInt(data.stok) || 0,
            harga: parseFloat(data.hargaBeli) || 0
          }
        });
      }
    } else if (data.kategori === 'ALKES') {
      await tx.asetAlkes.create({
        data: {
          asetId: asset.id,
          merk: data.merk || null,
          nomorSeri: data.nomorSeri || null,
          tanggalPembelian: data.tanggalPembelian ? new Date(data.tanggalPembelian) : null,
          hargaPerolehan: parseFloat(data.hargaPerolehan) || 0,
          wajibKalibrasi: data.wajibKalibrasi === true || data.wajibKalibrasi === 'true',
          noSertifikatKalibrasi: data.noSertifikatKalibrasi || null,
          tanggalKalibrasiTerakhir: data.tanggalKalibrasiTerakhir ? new Date(data.tanggalKalibrasiTerakhir) : null,
          intervalKalibrasi: data.intervalKalibrasi ? parseInt(data.intervalKalibrasi) : null,
          intervalMaintenance: data.intervalMaintenance ? parseInt(data.intervalMaintenance) : null,
          kondisi: data.kondisi || 'BAIK',
        }
      });
    } else if (data.kategori === 'KENDARAAN') {
      await tx.asetKendaraan.create({
        data: {
          asetId: asset.id,
          nomorPolisi: data.nomorPolisi,
          jenisKendaraan: data.jenisKendaraan,
          merk: data.merk || null,
          nomorRangka: data.nomorRangka || null,
          nomorMesin: data.nomorMesin || null,
          tanggalPajak: data.tanggalPajak ? new Date(data.tanggalPajak) : null,
          idGps: data.idGps || null,
          intervalMaintenance: data.intervalMaintenance ? parseInt(data.intervalMaintenance) : null,
          pic: data.pic || null,
          kondisi: data.kondisi || 'STANDBY',
        }
      });
    } else if (data.kategori === 'INVENTARIS') {
      await tx.asetInventaris.create({
        data: {
          asetId: asset.id,
          subKategori: data.subKategori,
          tanggalPembelian: new Date(data.tanggalPembelian),
          nilaiBeli: parseFloat(data.nilaiBeli) || 0,
          masaPakai: parseInt(data.masaPakai) || 0,
          pic: data.pic || null,
        }
      });
    } else {
      throw new Error(`Kategori aset tidak valid: ${data.kategori}`);
    }

    // Return full asset data with details
    return await tx.aset.findUnique({
      where: { id: asset.id },
      include: {
        ruangan: true,
        logistik: true,
        alkes: true,
        kendaraan: true,
        inventaris: true
      }
    });
  });
};

const getAsetById = async (id) => {
  if (id.startsWith('virtual-')) {
    const masterObatId = id.replace('virtual-', '');
    const o = await prisma.masterObat.findUnique({
      where: { id: masterObatId }
    });

    if (!o) {
      throw new Error('Obat tidak ditemukan');
    }

    return {
      id: `virtual-${o.id}`,
      kodeAset: o.kodeObat,
      namaAset: o.namaObat,
      kategori: 'LOGISTIK_MEDIS',
      deskripsi: 'Katalog Obat/BHP Farmasi (Belum didaftarkan batch logistik)',
      status: 'AKTIF',
      gambarUrl: o.gambarUrl,
      ruanganId: null,
      ruangan: null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      logistik: {
        id: `virtual-logistik-${o.id}`,
        asetId: `virtual-${o.id}`,
        masterObatId: o.id,
        subKategori: o.kategori?.toUpperCase().includes('VAKSIN') ? 'VAKSIN' : (o.kategori?.toUpperCase().includes('BHP') ? 'BHP_MEDIS' : 'OBAT'),
        sediaan: o.sediaan || 'Tablet',
        nomorBatch: '',
        tanggalExpired: null,
        hargaBeli: o.harga || 0,
        stok: o.stok || 0,
        stokMinimum: 0,
        supplier: '-',
        lokasiSpesifik: 'Gudang Farmasi',
        masterObat: o
      },
      alkes: null,
      kendaraan: null,
      inventaris: null
    };
  }

  return await prisma.aset.findUnique({
    where: { id },
    include: {
      ruangan: true,
      logistik: {
        include: {
          masterObat: true
        }
      },
      alkes: true,
      kendaraan: true,
      inventaris: true
    }
  });
};

const updateAset = async (id, data) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Update base asset fields
    const updateData = {
      kodeAset: data.kodeAset,
      namaAset: data.namaAset,
      kategori: data.kategori,
      deskripsi: data.deskripsi !== undefined ? data.deskripsi : null,
      status: data.status,
      ruanganId: data.ruanganId || null,
    };
    if (data.gambarUrl) {
      updateData.gambarUrl = data.gambarUrl;
    }

    const asset = await tx.aset.update({
      where: { id },
      data: updateData
    });

    // 2. Update category-specific child records
    if (data.kategori === 'LOGISTIK_MEDIS' || data.kategori === 'LOGISTIK_UMUM') {
      await tx.asetLogistik.upsert({
        where: { asetId: id },
        update: {
          masterObatId: data.masterObatId || null,
          subKategori: data.subKategori,
          sediaan: data.sediaan || data.satuan || null,
          nomorBatch: data.nomorBatch || null,
          tanggalExpired: data.tanggalExpired ? new Date(data.tanggalExpired) : null,
          hargaBeli: parseFloat(data.hargaBeli) || 0,
          stok: parseInt(data.stok) || 0,
          stokMinimum: parseInt(data.stokMinimum) || 0,
          supplier: data.supplier || null,
          lokasiSpesifik: data.lokasiSpesifik || null,
        },
        create: {
          asetId: id,
          masterObatId: data.masterObatId || null,
          subKategori: data.subKategori,
          sediaan: data.sediaan || data.satuan || null,
          nomorBatch: data.nomorBatch || null,
          tanggalExpired: data.tanggalExpired ? new Date(data.tanggalExpired) : null,
          hargaBeli: parseFloat(data.hargaBeli) || 0,
          stok: parseInt(data.stok) || 0,
          stokMinimum: parseInt(data.stokMinimum) || 0,
          supplier: data.supplier || null,
          lokasiSpesifik: data.lokasiSpesifik || null,
        }
      });

      // Update linked MasterObat stock & price if provided
      if (data.masterObatId) {
        await tx.masterObat.update({
          where: { id: data.masterObatId },
          data: {
            stok: parseInt(data.stok) || 0,
            harga: parseFloat(data.hargaBeli) || 0
          }
        });
      }
    } else if (data.kategori === 'ALKES') {
      await tx.asetAlkes.upsert({
        where: { asetId: id },
        update: {
          merk: data.merk || null,
          nomorSeri: data.nomorSeri || null,
          tanggalPembelian: data.tanggalPembelian ? new Date(data.tanggalPembelian) : null,
          hargaPerolehan: parseFloat(data.hargaPerolehan) || 0,
          wajibKalibrasi: data.wajibKalibrasi === true || data.wajibKalibrasi === 'true',
          noSertifikatKalibrasi: data.noSertifikatKalibrasi || null,
          tanggalKalibrasiTerakhir: data.tanggalKalibrasiTerakhir ? new Date(data.tanggalKalibrasiTerakhir) : null,
          intervalKalibrasi: data.intervalKalibrasi ? parseInt(data.intervalKalibrasi) : null,
          intervalMaintenance: data.intervalMaintenance ? parseInt(data.intervalMaintenance) : null,
          kondisi: data.kondisi || 'BAIK',
        },
        create: {
          asetId: id,
          merk: data.merk || null,
          nomorSeri: data.nomorSeri || null,
          tanggalPembelian: data.tanggalPembelian ? new Date(data.tanggalPembelian) : null,
          hargaPerolehan: parseFloat(data.hargaPerolehan) || 0,
          wajibKalibrasi: data.wajibKalibrasi === true || data.wajibKalibrasi === 'true',
          noSertifikatKalibrasi: data.noSertifikatKalibrasi || null,
          tanggalKalibrasiTerakhir: data.tanggalKalibrasiTerakhir ? new Date(data.tanggalKalibrasiTerakhir) : null,
          intervalKalibrasi: data.intervalKalibrasi ? parseInt(data.intervalKalibrasi) : null,
          intervalMaintenance: data.intervalMaintenance ? parseInt(data.intervalMaintenance) : null,
          kondisi: data.kondisi || 'BAIK',
        }
      });
    } else if (data.kategori === 'KENDARAAN') {
      await tx.asetKendaraan.upsert({
        where: { asetId: id },
        update: {
          nomorPolisi: data.nomorPolisi,
          jenisKendaraan: data.jenisKendaraan,
          merk: data.merk || null,
          nomorRangka: data.nomorRangka || null,
          nomorMesin: data.nomorMesin || null,
          tanggalPajak: data.tanggalPajak ? new Date(data.tanggalPajak) : null,
          idGps: data.idGps || null,
          intervalMaintenance: data.intervalMaintenance ? parseInt(data.intervalMaintenance) : null,
          pic: data.pic || null,
          kondisi: data.kondisi || 'STANDBY',
        },
        create: {
          asetId: id,
          nomorPolisi: data.nomorPolisi,
          jenisKendaraan: data.jenisKendaraan,
          merk: data.merk || null,
          nomorRangka: data.nomorRangka || null,
          nomorMesin: data.nomorMesin || null,
          tanggalPajak: data.tanggalPajak ? new Date(data.tanggalPajak) : null,
          idGps: data.idGps || null,
          intervalMaintenance: data.intervalMaintenance ? parseInt(data.intervalMaintenance) : null,
          pic: data.pic || null,
          kondisi: data.kondisi || 'STANDBY',
        }
      });
    } else if (data.kategori === 'INVENTARIS') {
      await tx.asetInventaris.upsert({
        where: { asetId: id },
        update: {
          subKategori: data.subKategori,
          tanggalPembelian: new Date(data.tanggalPembelian),
          nilaiBeli: parseFloat(data.nilaiBeli) || 0,
          masaPakai: parseInt(data.masaPakai) || 0,
          pic: data.pic || null,
        },
        create: {
          asetId: id,
          subKategori: data.subKategori,
          tanggalPembelian: new Date(data.tanggalPembelian),
          nilaiBeli: parseFloat(data.nilaiBeli) || 0,
          masaPakai: parseInt(data.masaPakai) || 0,
          pic: data.pic || null,
        }
      });
    }

    return await tx.aset.findUnique({
      where: { id },
      include: {
        ruangan: true,
        logistik: true,
        alkes: true,
        kendaraan: true,
        inventaris: true
      }
    });
  });
};

const getRuangan = async () => {
  return await prisma.ruangan.findMany({
    orderBy: { namaRuangan: 'asc' }
  });
};

const createRuangan = async (data) => {
  return await prisma.ruangan.create({
    data: {
      namaRuangan: data.namaRuangan,
      lokasi: data.lokasi || null
    }
  });
};

module.exports = {
  getAsets,
  createAset,
  getAsetById,
  updateAset,
  getRuangan,
  createRuangan
};
