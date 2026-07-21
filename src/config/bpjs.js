require('dotenv').config();

/**
 * Konfigurasi BPJS Kesehatan — PCare (FKTP)
 *
 * URL PCare berbeda antara Sandbox (Development) dan Production.
 * Atur via environment variable: BPJS_ENV=sandbox|production
 *
 * Kredensial yang dibutuhkan (dari Portal Layanan BPJS Kesehatan):
 *   BPJS_CONS_ID     = Consumer ID aplikasi Anda
 *   BPJS_SECRET_KEY  = Secret Key untuk membuat Signature (HMAC-SHA256)
 *   BPJS_USER_KEY    = User Key untuk dekripsi payload AES & Basic Auth (harus 32 karakter)
 *   BPJS_KODE_FASKES = Kode Faskes Puskesmas Anda di BPJS
 */

const BPJS_ENV = process.env.BPJS_ENV || 'sandbox';

const BPJS_URL = {
  sandbox: {
    BASE_URL: 'https://apijkn-dev.bpjs-kesehatan.go.id/pcare-rest-dev/webresources',
  },
  production: {
    BASE_URL: 'https://apijkn.bpjs-kesehatan.go.id/pcare-rest/webresources',
  },
};

module.exports = {
  BPJS_CONS_ID: process.env.BPJS_CONS_ID,
  BPJS_SECRET_KEY: process.env.BPJS_SECRET_KEY,
  BPJS_USER_KEY: process.env.BPJS_USER_KEY,
  BPJS_KODE_FASKES: process.env.BPJS_KODE_FASKES,
  BPJS_BASE_URL: BPJS_URL[BPJS_ENV].BASE_URL,
  IS_SANDBOX: BPJS_ENV === 'sandbox',
};
