const axios = require('axios');
const satusehatConfig = require('../../config/satusehat');

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
            const authUrl = satusehatConfig?.SATUSEHAT_URL?.AUTH_URL || process.env.SATUSEHAT_AUTH_URL;
            const clientId = satusehatConfig?.SATUSEHAT_CLIENT_ID || process.env.SATUSEHAT_CLIENT_ID;
            const clientSecret = satusehatConfig?.SATUSEHAT_CLIENT_SECRET || process.env.SATUSEHAT_CLIENT_SECRET;

            const data = new URLSearchParams();
            data.append('client_id', clientId);
            data.append('client_secret', clientSecret);

            const url = `${authUrl}/accesstoken?grant_type=client_credentials`;

            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            this.accessToken = response.data.access_token;
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
     * [BUNDLE TRANSACTION] Kirim FHIR Transaction Bundle ke SATUSEHAT (POST /fhir-r4/v1/)
     * @param {Object} payload - Data JSON FHIR Bundle bertipe transaction
     * @returns {Promise<Object>} Response dari SATUSEHAT
     */
    static async sendBundleTransaction(payload) {
        try {
            const token = await this.getAccessToken();
            const baseUrl = satusehatConfig?.SATUSEHAT_URL?.FHIR_URL || process.env.SATUSEHAT_BASE_URL;

            const response = await axios.post(`${baseUrl}`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            this._handleError(error, 'POST Bundle Transaction');
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
            const baseUrl = satusehatConfig?.SATUSEHAT_URL?.FHIR_URL || process.env.SATUSEHAT_BASE_URL;

            const response = await axios.post(`${baseUrl}/${resourceType}`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            this._handleError(error, `POST ${resourceType}`);
        }
    }

    /**
     * [READ] Fungsi generik untuk mengambil data FHIR dari SATUSEHAT berdasarkan ResourceType dan ID
     * @param {string} resourceType - Nama endpoint (Contoh: 'Encounter', 'Patient', 'Observation')
     * @param {string} id - ID SATUSEHAT
     */
    static async getResource(resourceType, id) {
        try {
            const token = await this.getAccessToken();
            const baseUrl = satusehatConfig?.SATUSEHAT_URL?.FHIR_URL || process.env.SATUSEHAT_BASE_URL;

            const response = await axios.get(`${baseUrl}/${resourceType}/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            this._handleError(error, `GET ${resourceType}/${id}`);
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
            const baseUrl = satusehatConfig?.SATUSEHAT_URL?.FHIR_URL || process.env.SATUSEHAT_BASE_URL;

            const response = await axios.put(`${baseUrl}/${resourceType}/${id}`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            this._handleError(error, `PUT ${resourceType}`);
        }
    }

    /**
     * [SEARCH RESOURCE BY ENCOUNTER] Ambil FHIR Resource (Observation, Condition, dll) berdasarkan Encounter ID
     * @param {string} resourceType - Tipe Resource (Observation, Condition, ClinicalImpression, Goal)
     * @param {string} encounterId - ID Encounter SATUSEHAT
     * @returns {Promise<Object>} Response dari SATUSEHAT
     */
    static async getResourceByEncounter(resourceType, encounterId) {
        try {
            const token = await this.getAccessToken();
            const baseUrl = satusehatConfig?.SATUSEHAT_URL?.FHIR_URL || process.env.SATUSEHAT_BASE_URL;

            const url = `${baseUrl}/${resourceType}?encounter=${encounterId}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            this._handleError(error, `Get ${resourceType} by Encounter ID (${encounterId})`);
        }
    }

    /**
     * [SEARCH RESOURCE BY SUBJECT] Ambil FHIR Resource berdasarkan Patient IHS (untuk Goal dll yang tidak support ?encounter=)
     * @param {string} resourceType - Tipe Resource (Goal)
     * @param {string} patientIhs - Patient IHS Number
     * @returns {Promise<Object>} Response dari SATUSEHAT
     */
    static async getResourceBySubject(resourceType, patientIhs) {
        try {
            const token = await this.getAccessToken();
            const baseUrl = satusehatConfig?.SATUSEHAT_URL?.FHIR_URL || process.env.SATUSEHAT_BASE_URL;

            // FamilyMemberHistory, AllergyIntolerance & MedicationStatement menggunakan ?patient= (Patient/{IHS})
            const paramName = ['FamilyMemberHistory', 'AllergyIntolerance'].includes(resourceType) ? 'patient' : 'subject';
            const url = `${baseUrl}/${resourceType}?${paramName}=Patient/${patientIhs}`;
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            this._handleError(error, `Get ${resourceType} by Patient IHS (${patientIhs})`);
        }
    }

    /**
     * [HELPER] Private method untuk standarisasi Error Handling & OperationOutcome parsing
     */
    static _handleError(error, action) {
        console.error(`SATUSEHAT ${action} Error:`, error.response?.data || error.message);

        const responseData = error.response?.data;
        let errorMessage = `Gagal melakukan ${action} ke SATUSEHAT`;

        if (responseData) {
            if (responseData.fault && responseData.fault.detail?.errorcode === 'policies.ratelimit.QuotaViolation') {
                errorMessage = 'Batas Kuota (Rate Limit Quota) Staging SATUSEHAT Kemenkes telah terlampaui untuk saat ini. Mohon tunggu beberapa saat.';
            } else if (responseData.resourceType === 'OperationOutcome' && Array.isArray(responseData.issue)) {
                const issues = responseData.issue
                    .map(i => i.diagnostics || i.details?.text || i.code)
                    .filter(Boolean)
                    .join('; ');
                errorMessage = `SATUSEHAT OperationOutcome Error: ${issues}`;
            } else if (responseData.resourceType === 'Bundle' && Array.isArray(responseData.entry)) {
                const failedEntries = responseData.entry.filter(e => e.response && !e.response.status?.startsWith('2'));
                if (failedEntries.length > 0) {
                    const issues = failedEntries.map(e => {
                        const outcome = e.response.outcome;
                        const issueText = outcome?.issue?.[0]?.diagnostics || outcome?.issue?.[0]?.details?.text || e.response.status;
                        return `[${e.response.status}] ${issueText}`;
                    }).join('; ');
                    errorMessage = `SATUSEHAT Bundle Transaction Error: ${issues}`;
                }
            } else if (responseData.message) {
                errorMessage = `SATUSEHAT Error: ${responseData.message}`;
            }
        }

        const err = new Error(errorMessage);
        err.statusCode = error.response?.status || 500;
        err.details = responseData;

        throw err;
    }
}

module.exports = SatuSehatGateway;