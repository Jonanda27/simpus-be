'use strict';

const axios = require('axios');
const bpjsConfig = require('../../config/bpjs');
const BpjsCrypto = require('../../utils/bpjs-crypto');

/**
 * BpjsGateway — HTTP Gateway / Indirection Class (Fase 2)
 *
 * Kelas ini adalah "Pintu Gerbang" (Bridge) menuju API BPJS PCare.
 * Semua request HTTP ke BPJS WAJIB melewati kelas ini.
 *
 * Tanggung jawab kelas ini (dan HANYA ini):
 *   - Membuat Timestamp Unix (detik) yang fresh untuk setiap request
 *   - Menyuntikkan header keamanan BPJS secara otomatis:
 *       X-cons-id, X-timestamp, X-signature, user_key, Authorization
 *   - Menyediakan method GET dan POST generik
 *   - Menstandarisasi error handling agar tidak bocor ke lapisan bisnis
 *
 * Jika BPJS mengubah skema autentikasi (misal: dari Basic Auth ke OAuth),
 * hanya file INI yang perlu diubah. Logika bisnis di pcare.service.js aman.
 */
class BpjsGateway {
  /**
   * [INTERNAL] Membuat set header autentikasi BPJS yang fresh.
   * Dipanggil setiap request agar timestamp selalu up-to-date.
   *
   * Header yang dihasilkan:
   *   - X-cons-id    : Consumer ID
   *   - X-timestamp  : Unix timestamp dalam DETIK
   *   - X-signature  : HMAC-SHA256(consId&timestamp, secretKey) → Base64
   *   - user_key     : User Key
   *   - Authorization: "Basic " + Base64(consId:userKey)
   *
   * @returns {Object} Headers object siap pakai
   */
  static _buildHeaders() {
    const { BPJS_CONS_ID, BPJS_SECRET_KEY, BPJS_USER_KEY } = bpjsConfig;

    // Timestamp dalam DETIK (bukan milidetik) — requirement wajib BPJS
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const signature = BpjsCrypto.generateSignature(BPJS_CONS_ID, BPJS_SECRET_KEY, timestamp);

    // Basic Auth: Base64(consId:userKey)
    const basicAuth = Buffer.from(`${BPJS_CONS_ID}:${BPJS_USER_KEY}`).toString('base64');

    return {
      'X-cons-id': BPJS_CONS_ID,
      'X-timestamp': timestamp,
      'X-signature': signature,
      'user_key': BPJS_USER_KEY,
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * [GET] Request generik ke endpoint PCare BPJS.
   *
   * @param {string} endpoint - Path relatif, cth: '/peserta/nokartu/0001234567890'
   * @returns {Object}        - Object `response` dari body JSON BPJS (raw, belum didekripsi)
   */
  static async get(endpoint) {
    try {
      const url = `${bpjsConfig.BPJS_BASE_URL}${endpoint}`;
      const response = await axios.get(url, {
        headers: this._buildHeaders(),
        timeout: 15000, // 15 detik timeout — server BPJS bisa lambat
      });
      return response.data;
    } catch (error) {
      this._handleError(error, `GET ${endpoint}`);
    }
  }

  /**
   * [POST] Request generik ke endpoint PCare BPJS.
   *
   * @param {string} endpoint - Path relatif, cth: '/kunjungan'
   * @param {Object} body     - Payload JSON yang akan dikirim
   * @returns {Object}        - Object `response` dari body JSON BPJS (raw, belum didekripsi)
   */
  static async post(endpoint, body) {
    try {
      const url = `${bpjsConfig.BPJS_BASE_URL}${endpoint}`;
      const response = await axios.post(url, body, {
        headers: this._buildHeaders(),
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      this._handleError(error, `POST ${endpoint}`);
    }
  }

  /**
   * [HELPER] Standarisasi Error Handling untuk semua request ke BPJS.
   * Mencegah error mentah dari axios bocor ke lapisan bisnis.
   *
   * @param {Error}  error  - Error asli dari axios
   * @param {string} action - Deskripsi aksi (untuk logging)
   */
  static _handleError(error, action) {
    // Jika ada response dari BPJS (4xx, 5xx)
    if (error.response) {
      console.error(`[BPJS Gateway] ${action} Error (HTTP ${error.response.status}):`, error.response.data);
      const err = new Error(`BPJS PCare: Gagal melakukan ${action}. Status: ${error.response.status}`);
      err.statusCode = 502; // Bad Gateway (masalah dari server BPJS, bukan kita)
      err.bpjsDetail = error.response.data;
      throw err;
    }

    // Jika timeout atau tidak ada koneksi ke BPJS
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response) {
      console.error(`[BPJS Gateway] ${action} Timeout/Network Error:`, error.message);
      const err = new Error(`BPJS PCare: Koneksi timeout atau tidak terjangkau saat ${action}`);
      err.statusCode = 504; // Gateway Timeout
      throw err;
    }

    // Error tidak dikenal
    console.error(`[BPJS Gateway] ${action} Unknown Error:`, error.message);
    const err = new Error(`BPJS PCare: Error tidak dikenal saat ${action}`);
    err.statusCode = 500;
    throw err;
  }
}

module.exports = BpjsGateway;
