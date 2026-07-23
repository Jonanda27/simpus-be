'use strict';

const PCareService = require('../services/bpjs/pcare.service');
const prisma = require('../config/prisma');
const bpjsConfig = require('../config/bpjs');

/**
 * [ENDPOINT 1] Cek Status Peserta BPJS berdasarkan Nomor Kartu
 *
 * Digunakan oleh petugas loket SEBELUM menyimpan pendaftaran.
 * Frontend menampilkan hasilnya sebagai kotak hijau/merah kepada petugas.
 *
 * GET /api/bpjs/peserta/:noBpjs
 */
const cekPeserta = async (req, res, next) => {
  try {
    const { noBpjs } = req.params;

    if (!noBpjs || noBpjs.length < 13) {
      const err = new Error('Nomor BPJS tidak valid (minimal 13 digit).');
      err.statusCode = 400;
      return next(err);
    }

    // Validasi konfigurasi sebelum memanggil API
    PCareService.validateConfig();

    const pesertaData = await PCareService.cekPesertaByNoKartu(noBpjs);

    return res.status(200).json({
      success: true,
      message: `Peserta ditemukan. Status: ${pesertaData.statusLabel}`,
      data: pesertaData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * [ENDPOINT 2] Sync Ulang Kunjungan ke BPJS PCare
 *
 * Digunakan untuk "retry" saat kunjungan yang sebelumnya gagal dikirim ke BPJS
 * (statusKlaimBpjs = 'PENDING_SYNC') ingin di-retry oleh petugas loket.
 *
 * POST /api/bpjs/kunjungan/:kunjunganId/sync
 */
const syncKunjungan = async (req, res, next) => {
  try {
    const { kunjunganId } = req.params;

    // Ambil data kunjungan + pasien + penjamin dari database lokal
    const kunjungan = await prisma.kunjungan.findUnique({
      where: { id: kunjunganId },
      include: {
        pasien: {
          include: { penjamin: true },
        },
        poliklinik: true,
      },
    });

    if (!kunjungan) {
      const err = new Error('Data Kunjungan tidak ditemukan.');
      err.statusCode = 404;
      return next(err);
    }

    // Guard: Hanya kunjungan BPJS yang boleh di-sync
    if (kunjungan.pasien?.penjamin?.jenisPenjamin !== 'BPJS' &&
        kunjungan.pasien?.penjamin?.jenisPenjamin !== 'BPJS Kesehatan') {
      const err = new Error('Kunjungan ini bukan pasien BPJS, tidak perlu disinkronkan.');
      err.statusCode = 400;
      return next(err);
    }

    // Guard: Jangan sync ulang yang sudah berhasil
    if (kunjungan.statusKlaimBpjs === 'TERKIRIM') {
      return res.status(200).json({
        success: true,
        message: 'Kunjungan ini sudah berhasil dikirim ke PCare BPJS sebelumnya.',
        data: { noKunjunganPcare: kunjungan.noKunjunganPcare, statusKlaimBpjs: kunjungan.statusKlaimBpjs },
      });
    }

    // Validasi konfigurasi
    PCareService.validateConfig();

    const tglDaftar = new Date(kunjungan.tanggalRegistrasi).toISOString().split('T')[0];

    const pcareResult = await PCareService.daftarkanKunjungan({
      noBpjs: kunjungan.pasien.penjamin.noBpjs,
      tanggalRegistrasi: tglDaftar,
      kdPoliTujuan: kunjungan.poliklinik?.kodePoli || kunjungan.poliklinikId,
      noRM: kunjungan.pasien.noRM,
    });

    // Update database dengan nomor kunjungan PCare
    const updatedKunjungan = await prisma.kunjungan.update({
      where: { id: kunjunganId },
      data: {
        noKunjunganPcare: pcareResult.noKunjungan,
        noUrutPcare: pcareResult.noUrut?.toString(),
        statusKlaimBpjs: 'TERKIRIM',
      },
    });

    return res.status(200).json({
      success: true,
      message: `Berhasil sinkronisasi ke BPJS PCare. No. Kunjungan: ${pcareResult.noKunjungan}`,
      data: {
        noKunjunganPcare: updatedKunjungan.noKunjunganPcare,
        noUrutPcare: updatedKunjungan.noUrutPcare,
        statusKlaimBpjs: updatedKunjungan.statusKlaimBpjs,
      },
    });
  } catch (error) {
    // Jika sync gagal lagi, update status GAGAL (bukan PENDING_SYNC)
    // supaya petugas tahu sudah dicoba manual tapi masih gagal
    try {
      await prisma.kunjungan.update({
        where: { id: req.params.kunjunganId },
        data: { statusKlaimBpjs: 'GAGAL' },
      });
    } catch (_) {
      // Abaikan error update status, tetap teruskan error utama
    }
    next(error);
  }
};

module.exports = {
  cekPeserta,
  syncKunjungan,
};
