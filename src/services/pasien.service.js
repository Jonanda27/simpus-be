const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const createPasien = async (data) => {
  let tandaTanganUrl = '';
  
  // Upload tanda tangan ke Cloudinary jika ada base64 string
  if (data.tandaTangan && data.tandaTangan.startsWith('data:image')) {
    try {
      const uploadResponse = await cloudinary.uploader.upload(data.tandaTangan, {
        folder: 'tanda_tangan_pasien',
      });
      tandaTanganUrl = uploadResponse.secure_url;
    } catch (error) {
      console.error('Gagal mengunggah tanda tangan ke Cloudinary:', error);
      // Fallback atau throw error, untuk sekarang biarkan kosong jika gagal
    }
  }

  let fotoWajahUrl = '';
  // Upload foto wajah ke Cloudinary jika ada base64 string
  if (data.fotoWajah && data.fotoWajah.startsWith('data:image')) {
    try {
      const uploadResponse = await cloudinary.uploader.upload(data.fotoWajah, {
        folder: 'foto_wajah_pasien',
      });
      fotoWajahUrl = uploadResponse.secure_url;
    } catch (error) {
      console.error('Gagal mengunggah foto wajah ke Cloudinary:', error);
      // Fallback atau throw error, untuk sekarang biarkan kosong jika gagal
    }
  }

  // Gunakan transaksi untuk memastikan semua data tersimpan atau tidak sama sekali (atomic)
  const newPasien = await prisma.$transaction(async (tx) => {
    
    // 1. Cari Pasien Lama atau Buat Baru
    let pasien = await tx.pasien.findUnique({
      where: { nik: data.nik }
    });

    if (!pasien) {
      pasien = await tx.pasien.create({
        data: {
          noRM: data.noRekamMedis,
          noIHS: data.noIHS,
          nik: data.nik,
          noKk: data.noKk,
          namaLengkap: data.namaLengkap,
          tempatLahir: data.tempatLahir,
          tanggalLahir: new Date(data.tanggalLahir),
          jenisKelamin: data.jenisKelamin,
          golonganDarah: data.golonganDarah,
          rhesus: data.rhesus,
          fotoWajah: fotoWajahUrl,
          agama: data.agama,
          pendidikan: data.pendidikan,
          pekerjaan: data.pekerjaan,
          statusPerkawinan: data.statusPerkawinan,
          kewarganegaraan: data.kewarganegaraan,

          // Relasi Nested Writes
          alamat: {
            create: {
              alamatKtp: data.alamatKtp,
              alamatDomisili: data.alamatDomisili,
              rtRw: data.rtRw,
              desaKelurahan: data.desaKelurahan,
              kecamatan: data.kecamatan,
              kabupatenKota: data.kabupatenKota,
              provinsi: data.provinsi,
              kodePos: data.kodePos,
              titikGps: data.titikGps
            }
          },
          kontak: {
            create: {
              noHp: data.noHp,
              email: data.email,
              kontakDarurat: data.kontakDarurat,
              hubunganKontakDarurat: data.hubunganKontakDarurat,
              noHpDarurat: data.noHpDarurat
            }
          },
          sosial: {
            create: {
              statusDisabilitas: data.statusDisabilitas,
              programSosial: data.programSosial
            }
          },
          // Data Bayi (Opsional)
          ...(data.isBayi ? {
            dataBayi: {
              create: {
                namaIbu: data.namaIbu,
                nikIbu: data.nikIbu,
                namaAyah: data.namaAyah,
                beratLahir: data.beratLahir,
                panjangLahir: data.panjangLahir,
                jamLahir: data.jamLahir,
                jenisPersalinan: data.jenisPersalinan
              }
            }
          } : {}),
          penjamin: {
            create: {
              jenisPenjamin: data.jenisPenjamin,
              noBpjs: data.noBpjs,
              statusKepesertaan: data.statusKepesertaan,
              faskesTingkat1: data.faskesTingkat1,
              kelasRawat: data.kelasRawat,
              namaAsuransi: data.namaAsuransi,
              nomorPolis: data.nomorPolis,
              masaBerlakuAsuransi: data.masaBerlakuAsuransi
            }
          }
        }
      });
    }

    // 0. Generate Nomor Antrean
    const poliklinik = await tx.poliklinik.findUnique({
      where: { id: data.poliTujuan }
    });
    const prefix = poliklinik ? poliklinik.kodePoli.charAt(0).toUpperCase() : 'U';
    
    const regDate = new Date(data.tanggalRegistrasi);
    const startOfDay = new Date(regDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(regDate.setHours(23, 59, 59, 999));

    const countHariIni = await tx.kunjungan.count({
      where: {
        poliklinikId: data.poliTujuan,
        tanggalRegistrasi: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const urutan = countHariIni + 1;
    const generatedNoAntrian = `${prefix}-${urutan.toString().padStart(3, '0')}`;

    // 2. Buat Kunjungan
    const kunjungan = await tx.kunjungan.create({
      data: {
        pasienId: pasien.id,
        tanggalRegistrasi: new Date(data.tanggalRegistrasi),
        jamRegistrasi: data.jamRegistrasi,
        poliklinikId: data.poliTujuan,
        layananTujuan: data.layananTujuan,
        jenisPelayanan: data.jenisPelayanan,
        statusPasien: data.statusPasien,
        noAntrian: generatedNoAntrian,
        prioritas: data.prioritas,
        caraDatang: data.caraDatang,
        
        dokterTujuanId: data.dokterTujuan === 'Bebas' ? null : data.dokterTujuan,
        userPendaftarId: data.userPendaftarId || null,
        noSep: data.noSep,
        statusKunjungan: "MENUNGGU",
        timestamp: data.timestamp || Date.now().toString(),
        
        // Relasi Rujukan (Opsional)
        ...(data.caraDatang === 'Rujukan' ? {
          rujukan: {
            create: {
              asalRujukan: data.asalRujukan,
              noRujukan: data.noRujukan,
              tanggalRujukan: data.tanggalRujukan,
              fasilitasPerujuk: data.fasilitasPerujuk,
              diagnosaAwal: data.diagnosaAwal,
              jenisRujukan: data.jenisRujukan
            }
          }
        } : {}),

        // Persetujuan Medis
        persetujuan: {
          create: {
            persetujuanPengobatan: data.persetujuanPengobatan,
            persetujuanRekamMedis: data.persetujuanRekamMedis,
            persetujuanSatusehat: data.persetujuanSatusehat,
            persetujuanReminder: data.persetujuanReminder || false,
            // Simpan URL dari Cloudinary
            tandaTangan: tandaTanganUrl
          }
        }
      },
      include: {
        rujukan: true,
        persetujuan: true
      }
    });

    return { ...pasien, kunjungan };
  });

  return newPasien;
};

const getAllPasien = async () => {
  return await prisma.pasien.findMany({
    include: {
      alamat: true,
      kontak: true,
      sosial: true,
      penjamin: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

const searchPasien = async (query) => {
  return await prisma.pasien.findFirst({
    where: {
      OR: [
        { nik: query },
        { noRM: query }
      ]
    },
    include: {
      alamat: true,
      kontak: true,
      sosial: true,
      penjamin: true,
    }
  });
};

const updatePasien = async (id, data) => {
  return await prisma.pasien.update({
    where: { id: parseInt(id) },
    data: data,
    include: {
      alamat: true,
      kontak: true,
      sosial: true,
      penjamin: true,
    }
  });
};

const deletePasien = async (id) => {
  // Gunakan transaction untuk menghapus relasi jika onDelete: Cascade belum diatur di skema Prisma
  // Jika schema.prisma menggunakan onDelete: Cascade, kita bisa langsung delete pasien.
  // Untuk amannya kita delete pasien langsung (Prisma akan error jika ada relasi tanpa cascade, 
  // yang bisa berguna sebagai proteksi)
  return await prisma.pasien.delete({
    where: { id: parseInt(id) }
  });
};

module.exports = {
  createPasien,
  getAllPasien,
  searchPasien,
  updatePasien,
  deletePasien
};
