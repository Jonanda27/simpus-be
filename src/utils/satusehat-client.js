const axios = require('axios');
const satusehatConfig = require('../config/satusehat');

let cachedToken = null;
let tokenExpiresAt = null;

/**
 * Generate Access Token from SATUSEHAT
 * @returns {Promise<string>} Access Token
 */
const generateAccessToken = async () => {
  // Check if token is still valid (give 5 minutes buffer)
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  try {
    const url = `${satusehatConfig.SATUSEHAT_URL.AUTH_URL}/accesstoken?grant_type=client_credentials`;
    
    const params = new URLSearchParams();
    params.append('client_id', satusehatConfig.SATUSEHAT_CLIENT_ID);
    params.append('client_secret', satusehatConfig.SATUSEHAT_CLIENT_SECRET);

    const response = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;
    
    // Save to cache
    cachedToken = data.access_token;
    
    // Calculate expiration time based on expires_in (usually 3599 seconds)
    const expiresInMs = data.expires_in * 1000;
    tokenExpiresAt = Date.now() + expiresInMs;

    console.log(`[SATUSEHAT Client] New Access Token generated. Expires in: ${data.expires_in} seconds`);

    return cachedToken;
  } catch (error) {
    console.error('[SATUSEHAT Client] Failed to generate access token:', error.response?.data || error.message);
    throw new Error('Gagal mendapatkan akses token dari SATUSEHAT');
  }
};

/**
 * Helper function to create an axios instance pre-configured for SATUSEHAT FHIR API
 */
const createFhirClient = async () => {
  const token = await generateAccessToken();
  
  return axios.create({
    baseURL: satusehatConfig.SATUSEHAT_URL.FHIR_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

module.exports = {
  generateAccessToken,
  createFhirClient
};
