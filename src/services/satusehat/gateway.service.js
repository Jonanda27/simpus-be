const axios = require('axios');

class SatuSehatGateway {
    // Caching token di memory agar tidak hit API Auth setiap kali request
    static accessToken = null;
    static tokenExpiresAt = null;

    /**
     * Mengambil token OAuth2 dari SATUSEHAT
     * Menggunakan prinsip Singleton Cache untuk performa
     */
    static async getAccessToken() {
        const now = Date.now();
        // Jika token masih valid (dengan buffer 2 menit), gunakan yang ada
        if (this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt - 120000) {
            return this.accessToken;
        }

        try {
            // Menggunakan URLSearchParams bawaan Node.js untuk x-www-form-urlencoded
            const data = new URLSearchParams();
            data.append('client_id', process.env.SATUSEHAT_CLIENT_ID);
            data.append('client_secret', process.env.SATUSEHAT_CLIENT_SECRET);

            const response = await axios.post(process.env.SATUSEHAT_AUTH_URL, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            this.accessToken = response.data.access_token;
            // SATUSEHAT biasanya memberikan token yang expired dalam 3599 detik (1 jam)
            this.tokenExpiresAt = now + (response.data.expires_in * 1000);

            return this.accessToken;
        } catch (error) {
            console.error('SATUSEHAT Auth Error:', error.response?.data || error.message);
            const err = new Error('Gagal mendapatkan token autentikasi dari SATUSEHAT');
            err.statusCode = 502; // Bad Gateway
            throw err;
        }
    }

    /**
     * [CREATE] Fungsi generik untuk mengirim data BARU ke API FHIR SATUSEHAT
     * @param {string} resourceType - Nama endpoint (Contoh: 'ImagingStudy', 'Immunization', 'Encounter')
     * @param {Object} payload - Data JSON FHIR
     */
    static async postResource(resourceType, payload) {
        try {
            const token = await this.getAccessToken();
            const baseUrl = process.env.SATUSEHAT_BASE_URL; // Cth: https://api-satusehat.kemkes.go.id/fhir-r4/v1

            const response = await axios.post(`${baseUrl}/${resourceType}`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            // Mengembalikan status 201 Created dan object JSON lengkap dari Kemenkes
            return response.data;
        } catch (error) {
            this._handleError(error, `POST ${resourceType}`);
        }
    }

    /**
     * [UPDATE] Fungsi generik untuk memperbarui data EKSISTING di SATUSEHAT
     * @param {string} resourceType - Nama endpoint
     * @param {string} id - ID SATUSEHAT dari resource yang mau diubah
     * @param {Object} payload - Data JSON FHIR penuh (Wajib menyertakan ID di dalam JSON)
     */
    static async putResource(resourceType, id, payload) {
        try {
            const token = await this.getAccessToken();
            const baseUrl = process.env.SATUSEHAT_BASE_URL;

            const response = await axios.put(`${baseUrl}/${resourceType}/${id}`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            // Mengembalikan status 200 OK
            return response.data;
        } catch (error) {
            this._handleError(error, `PUT ${resourceType}`);
        }
    }

    /**
     * [HELPER] Private method untuk standarisasi Error Handling
     * Mencegah duplikasi kode (DRY Principle) dan menangkap error format FHIR.
     */
    static _handleError(error, action) {
        console.error(`SATUSEHAT ${action} Error:`, error.response?.data || error.message);

        const err = new Error(`Gagal melakukan ${action} ke SATUSEHAT`);
        err.statusCode = error.response?.status || 500;

        // SATUSEHAT mengembalikan detail error validasi pada object 'issue' di dalam OperationOutcome
        err.details = error.response?.data;

        throw err;
    }
}

module.exports = SatuSehatGateway;