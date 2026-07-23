'use strict';

const crypto = require('crypto');
const LZString = require('lz-string');

/**
 * BpjsCrypto — Pure Fabrication Class (Fase 1)
 *
 * Kelas ini adalah "Tukang Kunci" (Locksmith) sistem BPJS.
 * Ia tidak memiliki logika bisnis, hanya murni operasi kriptografi.
 *
 * Algoritma yang diimplementasikan:
 *   1. generateSignature() → HMAC-SHA256 untuk Header X-Signature
 *   2. decryptResponse()   → AES-256-ECB untuk membuka payload response
 *   3. decompress()        → LZ-String untuk dekompresi data setelah dekripsi
 *
 * Jika BPJS mengubah algoritmanya di masa depan, hanya file INI yang perlu diubah.
 * Tidak ada logika bisnis di file ini.
 */
class BpjsCrypto {
  /**
   * [STEP 1] Membuat Signature untuk Header setiap request ke BPJS PCare.
   *
   * Formula: HMAC-SHA256(consId + "&" + timestamp, secretKey) → Base64
   *
   * @param {string} consId     - Consumer ID dari portal BPJS (BPJS_CONS_ID)
   * @param {string} secretKey  - Secret Key dari portal BPJS (BPJS_SECRET_KEY)
   * @param {string} timestamp  - Unix timestamp dalam detik (bukan milidetik!)
   * @returns {string}          - Signature dalam format Base64
   */
  static generateSignature(consId, secretKey, timestamp) {
    const message = `${consId}&${timestamp}`;
    return crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');
  }

  /**
   * [STEP 2] Mendekripsi payload response dari BPJS PCare.
   *
   * BPJS mengenkripsi field `response` dalam JSON-nya menggunakan:
   *   - Algoritma: AES-256-ECB (Electronic Codebook)
   *   - Key: BPJS_USER_KEY (harus tepat 32 byte / 32 karakter ASCII)
   *   - Padding: PKCS5 (dikelola otomatis oleh Node.js crypto)
   *   - Input: String Base64
   *
   * @param {string} encryptedBase64 - String terenkripsi dalam format Base64
   * @param {string} userKey         - User Key dari portal BPJS (BPJS_USER_KEY)
   * @returns {string}               - String hasil dekripsi (masih terkompresi LZ)
   * @throws {Error} Jika dekripsi gagal (key salah, data korup, dll.)
   */
  static decryptResponse(encryptedBase64, userKey) {
    try {
      // Key harus 32 byte untuk AES-256. Pad atau truncate jika perlu.
      const keyBuffer = Buffer.alloc(32);
      Buffer.from(userKey, 'utf8').copy(keyBuffer);

      // ECB mode tidak memerlukan IV
      const decipher = crypto.createDecipheriv('aes-256-ecb', keyBuffer, null);
      decipher.setAutoPadding(true); // Handle PKCS5/PKCS7 padding otomatis

      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (err) {
      const error = new Error(`BpjsCrypto: Dekripsi AES gagal. Pastikan BPJS_USER_KEY benar (${err.message})`);
      error.statusCode = 502;
      throw error;
    }
  }

  /**
   * [STEP 3] Mendekompresi string yang sudah dikompresi dengan algoritma LZ-String.
   *
   * BPJS mengompresi data JSON-nya dengan LZ-String sebelum dienkripsi.
   * Proses setelah decrypt: LZ-decompress → JSON.parse
   *
   * @param {string} compressedStr - String hasil dekripsi AES (masih terkompresi)
   * @returns {Object}             - Object JavaScript hasil JSON.parse
   * @throws {Error} Jika dekompresi atau parsing JSON gagal
   */
  static decompress(compressedStr) {
    try {
      const decompressed = LZString.decompress(compressedStr);
      if (!decompressed) {
        throw new Error('Hasil dekompresi null/kosong. String mungkin bukan LZ-compressed.');
      }
      return JSON.parse(decompressed);
    } catch (err) {
      // Kemungkinan response tidak dikompresi (beberapa endpoint BPJS mengembalikan plain JSON)
      try {
        return JSON.parse(compressedStr);
      } catch {
        const error = new Error(`BpjsCrypto: Dekompresi LZ-String gagal (${err.message})`);
        error.statusCode = 502;
        throw error;
      }
    }
  }

  /**
   * [COMBINED] Pipeline penuh: Decrypt → Decompress → Parse
   * Shortcut untuk memproses seluruh pipeline dalam satu panggilan.
   *
   * @param {string} encryptedBase64 - Payload terenkripsi dari response BPJS
   * @param {string} userKey         - BPJS_USER_KEY
   * @returns {Object}               - Data JSON final yang siap digunakan
   */
  static decryptAndDecompress(encryptedBase64, userKey) {
    const decrypted = this.decryptResponse(encryptedBase64, userKey);
    return this.decompress(decrypted);
  }
}

module.exports = BpjsCrypto;
