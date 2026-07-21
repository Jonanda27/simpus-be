'use strict';

const BpjsGateway = require('./gateway.service');
const BpjsCrypto = require('../../utils/bpjs-crypto');
const bpjsConfig = require('../../config/bpjs');

/**
 * PCareService — Information Expert (Fase 3)
 *
 * Kelas ini adalah "Ahli Domain" PCare BPJS di sistem kita.
 * Ia tahu SEMUA tentang API PCare: endpoint apa yang harus dipanggil,
 * format payload apa yang dibutuhkan, dan cara menafsirkan hasilnya.
 *
 * Kelas ini TIDAK tahu cara membuat Signature — itu urusan BpjsCrypto.
 * Kelas ini TIDAK tahu cara mengirim HTTP — itu urusan BpjsGateway.
 * Ini adalah prinsip Separation of Concerns.
 */
class PCareService {
  /**
   * [1] Validasi Status Kepesertaan BPJS berdasarkan Nomor Kartu.
   *
   * Dipanggil dari frontend SEBELUM form pendaftaran disimpan.
   * Tujuan: Petugas loket tahu status kartu pasien sebelum mendaftarkan.
   *
   * Endpoint PCare: GET /peserta/nokartu/{noKartu}
   *
   * @param {string} noBpjs - Nomor kartu BPJS (13 digit)
   * @returns {Object} Data peserta yang sudah dinormalisasi:
   *   {
   *     aktif: boolean,
   *     nama: string,
   *     nik: string,
   *     tglLahir: string,
   *     kdJenisPeserta: string, // Peserta, Anggota Keluarga
   *     kdStatusPeserta: string, // Aktif, Non Aktif
   *     namaPPK: string,         // Nama Faskes Tk.1 Terdaftar
   *     kdPPK: string,           // Kode Faskes Tk.1 Terdaftar (penting untuk validasi!)
   *     kelasRawat: string,
   *     rawData: Object          // Data mentah dari BPJS untuk referensi
   *   }
   */
  static async cekPesertaByNoKartu(noBpjs) {
    // 1. Hit API BPJS melalui Gateway
    const rawResponse = await BpjsGateway.get(`/peserta/nokartu/${noBpjs}`);

    // 2. Cek apakah response BPJS mengandung field `response` (payload terenkripsi)
    if (!rawResponse || !rawResponse.response) {
      const err = new Error('BPJS PCare: Respon kosong atau tidak valid untuk data peserta.');
      err.statusCode = 502;
      throw err;
    }

    // 3. Dekripsi dan Dekompresi payload
    const pesertaData = BpjsCrypto.decryptAndDecompress(
      rawResponse.response,
      bpjsConfig.BPJS_USER_KEY
    );

    // 4. Normalisasi data ke format yang mudah dikonsumsi aplikasi kita
    // (Field BPJS sering kali menggunakan singkatan yang tidak intuitif)
    const peserta = pesertaData?.peserta;
    if (!peserta) {
      const err = new Error('BPJS PCare: Nomor kartu tidak ditemukan di database BPJS.');
      err.statusCode = 404;
      throw err;
    }

    const isAktif = peserta.kdStatusPeserta === '1'; // '1' = Aktif di PCare

    return {
      aktif: isAktif,
      statusLabel: isAktif ? 'AKTIF' : 'NON AKTIF',
      noBpjs: peserta.noKartu,
      nik: peserta.nik,
      nama: peserta.nama,
      tglLahir: peserta.tglLahir,
      kdJenisPeserta: peserta.kdJenisPeserta,
      namaJenisPeserta: peserta.jenisPeserta,
      kdStatusPeserta: peserta.kdStatusPeserta,

      // Data Faskes Tk.1 — PENTING untuk validasi apakah pasien terdaftar di sini
      kdPPK: peserta.kdProviderPst?.kdProvider,
      namaPPK: peserta.kdProviderPst?.nmProvider,
      isRegisteredHere: peserta.kdProviderPst?.kdProvider === bpjsConfig.BPJS_KODE_FASKES,

      kelasRawat: peserta.kdRawat,
      namaKelas: peserta.jnsRawat,
      rawData: pesertaData, // Simpan raw data untuk debugging jika perlu
    };
  }

  /**
   * [2] Mendaftarkan Kunjungan Pasien BPJS ke PCare.
   *
   * Dipanggil secara otomatis di background SETELAH kunjungan berhasil
   * disimpan di database lokal (pola Soft-fail / Eventual Consistency).
   *
   * Endpoint PCare: POST /kunjungan
   *
   * @param {Object} kunjunganData - Data kunjungan dari sistem lokal kita
   * @param {string} kunjunganData.noBpjs           - Nomor kartu BPJS pasien
   * @param {string} kunjunganData.tanggalRegistrasi - Tanggal kunjungan (YYYY-MM-DD)
   * @param {string} kunjunganData.kdPoliTujuan      - Kode poli BPJS (mapping dari kode poli lokal)
   * @param {string} kunjunganData.noRM              - Nomor Rekam Medis lokal pasien
   * @param {string} kunjunganData.kdSakit           - Kode ICD-10 diagnosa sementara (opsional)
   *
   * @returns {Object}
   *   {
   *     noKunjungan: string, // Nomor Kunjungan PCare (setara SEP di RS)
   *     noUrut: string,      // Nomor urut antrian di PCare
   *   }
   */
  static async daftarkanKunjungan(kunjunganData) {
    const {
      noBpjs,
      tanggalRegistrasi,
      kdPoliTujuan,
      noRM,
      kdSakit = 'A00.0', // Kode ICD-10 default jika belum ada diagnosa
    } = kunjunganData;

    // 1. Susun payload sesuai format yang diminta API PCare
    const payload = {
      noKartu: noBpjs,
      tglDaftar: tanggalRegistrasi, // Format: YYYY-MM-DD
      kdPoli: kdPoliTujuan,
      kdFaskes: bpjsConfig.BPJS_KODE_FASKES,
      noMR: noRM,
      kdSakit: kdSakit,
      sistole: 0,     // Field wajib PCare, diisi 0 jika belum diskrining
      diastole: 0,
      beratBadan: 0,
      tinggiBadan: 0,
      respRate: 0,
      heartRate: 0,
      lingkarPerut: 0,
      imt: 0,
      suhu: 0,
    };

    // 2. Kirim melalui Gateway
    const rawResponse = await BpjsGateway.post('/kunjungan', payload);

    // 3. Proses response
    if (!rawResponse || !rawResponse.response) {
      const err = new Error('BPJS PCare: Respon pendaftaran kunjungan kosong atau tidak valid.');
      err.statusCode = 502;
      throw err;
    }

    const kunjunganResult = BpjsCrypto.decryptAndDecompress(
      rawResponse.response,
      bpjsConfig.BPJS_USER_KEY
    );

    // 4. Return nomor kunjungan yang akan disimpan ke database lokal
    return {
      noKunjungan: kunjunganResult?.kunjungan?.noKunjungan || kunjunganResult?.noKunjungan,
      noUrut: kunjunganResult?.kunjungan?.noUrut || kunjunganResult?.noUrut,
      rawData: kunjunganResult,
    };
  }

  /**
   * [HELPER] Validasi apakah semua env var BPJS sudah dikonfigurasi.
   * Mencegah error yang membingungkan saat environment belum diisi.
   *
   * @throws {Error} Jika salah satu kredensial belum diisi di .env
   */
  static validateConfig() {
    const { BPJS_CONS_ID, BPJS_SECRET_KEY, BPJS_USER_KEY, BPJS_KODE_FASKES } = bpjsConfig;
    if (!BPJS_CONS_ID || !BPJS_SECRET_KEY || !BPJS_USER_KEY || !BPJS_KODE_FASKES) {
      const err = new Error(
        'Konfigurasi BPJS tidak lengkap. Pastikan BPJS_CONS_ID, BPJS_SECRET_KEY, BPJS_USER_KEY, dan BPJS_KODE_FASKES sudah diisi di file .env'
      );
      err.statusCode = 503; // Service Unavailable
      throw err;
    }
  }
}

module.exports = PCareService;
