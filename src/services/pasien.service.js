const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;
const satusehatService = require('./satusehat.service');
const PCareService = require('./bpjs/pcare.service');
const bpjsConfig = require('../config/bpjs');

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

    // 3. Create Encounter di SATUSEHAT
    if (data.persetujuanSatusehat && pasien.noIHS && data.dokterTujuan !== 'Bebas') {
      try {
        const dokter = await tx.user.findUnique({
          where: { id: data.dokterTujuan },
          include: { tenagaMedis: true }
        });

        if (dokter && dokter.tenagaMedis && dokter.tenagaMedis.noIHS && poliklinik && poliklinik.ihsLocationId) {
          const encounterResult = await satusehatService.createEncounter({
            pasienIhs: pasien.noIHS,
            pasienName: pasien.namaLengkap,
            dokterIhs: dokter.tenagaMedis.noIHS,
            dokterName: dokter.namaLengkap,
            poliIhs: poliklinik.ihsLocationId,
            poliName: poliklinik.namaPoli,
            noKunjungan: kunjungan.id,
            jenisPelayanan: data.jenisPelayanan, // Rawat Jalan / Rawat Inap / IGD
            peranDokter: 'ATND' // Default ke Attending Physician
          });

          if (encounterResult.success) {
            // Update kunjungan with encounterId and satusehatSync
            const syncData = {
              Encounter: { status: 'SUCCESS', id: encounterResult.encounterId }
            };
            await tx.kunjungan.update({
              where: { id: kunjungan.id },
              data: { 
                encounterId: encounterResult.encounterId,
                satusehatSync: syncData
              }
            });
            kunjungan.encounterId = encounterResult.encounterId;
          }
        }
      } catch (error) {
        console.error('Failed to create Encounter in SATUSEHAT:', error);
        // We don't throw here to ensure local registration still succeeds
      }
    }

    // ================================================================
    // [BPJS PCARE BRIDGING] Anti-Corruption Layer — Soft-fail Pattern
    // Identik dengan pola SATUSEHAT di atas: pendaftaran lokal SELALU sukses.
    // Jika BPJS down → statusKlaimBpjs = 'PENDING_SYNC' (bisa di-sync ulang nanti).
    // ================================================================
    const isBpjs = data.jenisPenjamin === 'BPJS' || data.jenisPenjamin === 'BPJS Kesehatan';
    const hasBpjsCredentials = bpjsConfig.BPJS_CONS_ID && bpjsConfig.BPJS_SECRET_KEY;

    if (isBpjs && data.noBpjs && hasBpjsCredentials) {
      try {
        // Format tanggal ke YYYY-MM-DD (requirement PCare)
        const tglDaftar = new Date(data.tanggalRegistrasi).toISOString().split('T')[0];

        const pcareResult = await PCareService.daftarkanKunjungan({
          noBpjs: data.noBpjs,
          tanggalRegistrasi: tglDaftar,
          kdPoliTujuan: poliklinik?.kodePoli || data.poliTujuan,
          noRM: pasien.noRM,
        });

        // Sukses → simpan nomor kunjungan PCare ke database
        await tx.kunjungan.update({
          where: { id: kunjungan.id },
          data: {
            noKunjunganPcare: pcareResult.noKunjungan,
            noUrutPcare: pcareResult.noUrut?.toString(),
            statusKlaimBpjs: 'TERKIRIM',
          },
        });

        kunjungan.noKunjunganPcare = pcareResult.noKunjungan;
        kunjungan.statusKlaimBpjs = 'TERKIRIM';

        console.log(`[BPJS PCare] Kunjungan berhasil didaftarkan. NoKunjungan: ${pcareResult.noKunjungan}`);
      } catch (bpjsError) {
        // SOFT-FAIL: BPJS down/error → catat sebagai PENDING_SYNC
        // Petugas bisa sync ulang nanti via tombol di frontend.
        console.error('[BPJS PCare] Gagal mendaftarkan kunjungan (soft-fail):', bpjsError.message);

        await tx.kunjungan.update({
          where: { id: kunjungan.id },
          data: { statusKlaimBpjs: 'PENDING_SYNC' },
        });

        kunjungan.statusKlaimBpjs = 'PENDING_SYNC';
        // TIDAK throw error — pendaftaran lokal tetap sukses!
      }
    }

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
