const axios = require('axios');

/**
 * Service to fetch postal code from public API endpoints
 */
const getKodePos = async (kelurahan, kecamatan) => {
  if (!kelurahan || !kecamatan) {
    const error = new Error('Kelurahan dan Kecamatan wajib diisi');
    error.statusCode = 400;
    throw error;
  }

  const cleanDesa = kelurahan.trim();
  const cleanKec = kecamatan.trim();
  const queryStr = `${cleanDesa} ${cleanKec}`;

  // 1. Try Kodepos.now.sh API
  let response = await axios.get(`https://kodepos.now.sh/search?q=${encodeURIComponent(queryStr)}`, { timeout: 5000 }).catch(() => null);

  if (!response || !response.data || !response.data.data || response.data.data.length === 0) {
    // 2. Search with kelurahan only
    response = await axios.get(`https://kodepos.now.sh/search?q=${encodeURIComponent(cleanDesa)}`, { timeout: 5000 }).catch(() => null);
  }

  if (response && response.data && response.data.data && response.data.data.length > 0) {
    const firstResult = response.data.data[0];
    const foundCode = String(firstResult.code || firstResult.postalcode || firstResult.kodepos || '');

    if (foundCode) {
      return {
        kode_pos: foundCode,
        data: firstResult
      };
    }
  }

  // 3. Fallback: Ibnux Github Data Indonesia Kodepos
  const response3 = await axios.get(`https://ibnux.github.io/data-indonesia/kodepos/${encodeURIComponent(cleanDesa)}.json`, { timeout: 5000 }).catch(() => null);
  if (response3 && response3.data && Array.isArray(response3.data) && response3.data.length > 0) {
    const foundCode = String(response3.data[0].kodepos || '');
    if (foundCode) {
      return {
        kode_pos: foundCode,
        data: response3.data[0]
      };
    }
  }

  const error = new Error('Kode pos tidak ditemukan untuk wilayah tersebut');
  error.statusCode = 404;
  throw error;
};

module.exports = {
  getKodePos
};
