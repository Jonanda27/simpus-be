require('dotenv').config();

const SATUSEHAT_ENV = process.env.SATUSEHAT_ENV || 'sandbox';

const SATUSEHAT_CONFIG = {
  sandbox: {
    AUTH_URL: 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1',
    FHIR_URL: 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1',
    CONSENT_URL: 'https://api-satusehat-stg.dto.kemkes.go.id/consent/v1',
    KFA_URL: 'https://api-satusehat-stg.dto.kemkes.go.id/kfa-v2',
  },
  production: {
    AUTH_URL: 'https://api-satusehat.kemkes.go.id/oauth2/v1',
    FHIR_URL: 'https://api-satusehat.kemkes.go.id/fhir-r4/v1',
    CONSENT_URL: 'https://api-satusehat.kemkes.go.id/consent/v1',
    KFA_URL: 'https://api-satusehat.kemkes.go.id/kfa-v2',
  }
};

module.exports = {
  SATUSEHAT_ORG_ID: process.env.SATUSEHAT_ORG_ID,
  SATUSEHAT_CLIENT_ID: process.env.SATUSEHAT_CLIENT_ID,
  SATUSEHAT_CLIENT_SECRET: process.env.SATUSEHAT_CLIENT_SECRET,
  SATUSEHAT_URL: SATUSEHAT_CONFIG[SATUSEHAT_ENV],
  IS_SANDBOX: SATUSEHAT_ENV === 'sandbox'
};
