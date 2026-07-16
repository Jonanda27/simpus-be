const prisma = require('../config/prisma');

/**
 * Mendaftarkan pasien ke Program UKM jika belum terdaftar.
 * Berdasarkan kode ICD-10 tertentu (misal: B20 -> HIV, A15 -> TB).
 */
const autoRegisterUKM = async (pasienId, icd10Kode) => {
  let programKode = null;

  // Simple mapping
  if (icd10Kode.startsWith('B20')) {
    programKode = 'HIV';
  } else if (icd10Kode.startsWith('A15')) {
    programKode = 'TB';
  }
  
  if (!programKode) return null; // Bukan penyakit UKM target

  // Cari program UKM
  const program = await prisma.programUKM.findUnique({
    where: { kodeProgram: programKode }
  });

  if (!program) return null; // Program belum disetup di master

  // Cek apakah pasien sudah terdaftar di program ini
  const existingRegister = await prisma.registerUKM.findFirst({
    where: {
      pasienId,
      programId: program.id
    }
  });

  if (!existingRegister) {
    // Daftarkan pasien baru
    const newRegister = await prisma.registerUKM.create({
      data: {
        pasienId,
        programId: program.id,
        statusProgram: 'AKTIF'
      }
    });

    // Tambah log otomatis
    await prisma.logPemantauanUKM.create({
      data: {
        registerId: newRegister.id,
        catatan: `Pasien didaftarkan otomatis ke Program ${programKode} melalui diagnosa Rawat Jalan.`
      }
    });

    return newRegister;
  }

  return existingRegister;
};

/**
 * Get dashboard statistik UKM
 */
const getDashboardStats = async () => {
  const programs = await prisma.programUKM.findMany({
    where: { statusAktif: true },
    include: {
      _count: {
        select: { registerPasien: true }
      }
    }
  });

  return programs;
};

/**
 * Get daftar pasien di program tertentu
 */
const getPasienByProgram = async (programId) => {
  // Coba cari berdasarkan kodeProgram atau ID
  const program = await prisma.programUKM.findFirst({
    where: {
      OR: [
        { id: programId },
        { kodeProgram: programId }
      ]
    }
  });

  if (!program) return [];

  const register = await prisma.registerUKM.findMany({
    where: { programId: program.id },
    include: {
      pasien: true,
      logPemantauan: {
        orderBy: { tanggal: 'desc' },
        take: 1
      }
    },
    orderBy: {
      tanggalDaftar: 'desc'
    }
  });

  return register;
};

/**
 * Tambah log pemantauan
 */
const addLogPemantauan = async (registerId, data, petugasId) => {
  // Update status program jika ada perubahan
  if (data.statusProgram) {
    await prisma.registerUKM.update({
      where: { id: registerId },
      data: { statusProgram: data.statusProgram }
    });
  }

  const log = await prisma.logPemantauanUKM.create({
    data: {
      registerId,
      petugasId,
      catatan: data.catatan,
      tindakLanjut: data.tindakLanjut,
      statusBerobat: data.statusBerobat
    }
  });

  // Auto E-Resep ARV Refill
  try {
    const parsedCatatan = JSON.parse(data.catatan);
    if (parsedCatatan.arvKepatuhan) {
      const register = await prisma.registerUKM.findUnique({where: {id: registerId}});
      if (register) {
        // Cari Poli UKM (fallback to first poli if not exists)
        let poliklinik = await prisma.poliklinik.findFirst({ where: { namaPoli: { contains: 'UKM' } } });
        if (!poliklinik) {
          poliklinik = await prisma.poliklinik.findFirst();
        }

        const now = new Date();
        const jamStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Create Kunjungan Khusus UKM
        const kunjunganUKM = await prisma.kunjungan.create({
          data: {
            pasienId: register.pasienId,
            tanggalRegistrasi: now,
            jamRegistrasi: jamStr,
            poliklinikId: poliklinik.id,
            jenisPelayanan: 'UKM',
            statusPasien: 'Lama',
            noAntrian: 'UKM-01',
            prioritas: 'Umum',
            caraDatang: 'Datang sendiri',
            statusKunjungan: 'SELESAI',
          }
        });
        
        // Ambil obat ARV dari database (sudah disisipkan lewat seed)
        let arvObat = await prisma.masterObat.findFirst({
          where: { namaObat: { contains: 'ARV' } }
        });

        // Create Resep for Farmasi to process ARV
        await prisma.resep.create({
          data: {
            kunjunganId: kunjunganUKM.id,
            pasienId: register.pasienId,
            dokterId: petugasId, // Petugas bertindak sebagai penerbit resep refill
            penginputId: petugasId,
            status: 'MENUNGGU_FARMASI',
            details: {
              create: [
                {
                  obatId: arvObat.id,
                  jumlah: 30, // asumsi dosis untuk 1 bulan
                  aturanPakai: '1 x 1 Tablet sesudah makan',
                  catatan: 'Program UKM HIV (Auto-Refill)'
                }
              ]
            }
          }
        });
      }
    }
  } catch (err) {
    // Abaikan jika catatan bukan JSON atau gagal membuat resep
  }

  return log;
};

module.exports = {
  autoRegisterUKM,
  getDashboardStats,
  getPasienByProgram,
  addLogPemantauan
};
