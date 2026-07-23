const axios = require('axios');
const satusehatConfig = require('../config/satusehat');
const { createFhirClient, generateAccessToken } = require('../utils/satusehat-client');

/**
 * Search Patient by NIK (Nomor Induk Kependudukan)
 * @param {string} nik - NIK Pasien
 * @returns {Promise<Object>} Patient Data (including IHS Number)
 */
const getPatientByNIK = async (nik) => {
  try {
    const fhirClient = await createFhirClient();
    
    // Format pencarian pasien berdasarkan NIK sesuai standar SATUSEHAT
    const response = await fhirClient.get(`/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`);
    
    // Periksa apakah ada pasien yang ditemukan
    if (response.data && response.data.entry && response.data.entry.length > 0) {
      const patient = response.data.entry[0].resource;
      
      // Ambil ihsNumber (id) dari resource pasien
      const ihsNumber = patient.id;
      
      return {
        success: true,
        data: patient,
        ihsNumber: ihsNumber
      };
    } else {
      return {
        success: false,
        message: 'Pasien tidak ditemukan di SATUSEHAT'
      };
    }
  } catch (error) {
    console.error(`[SATUSEHAT] Error searching patient by NIK ${nik}:`, error.response?.data || error.message);
    throw new Error('Terjadi kesalahan saat mencari pasien di SATUSEHAT');
  }
};

/**
 * Search Practitioner (Tenaga Medis) by NIK
 * @param {string} nik - NIK Praktisioner
 * @returns {Promise<Object>} Practitioner Data (including IHS Number)
 */
const getPractitionerByNIK = async (nik) => {
  try {
    const fhirClient = await createFhirClient();
    
    // Format pencarian praktisioner berdasarkan NIK sesuai standar SATUSEHAT
    const response = await fhirClient.get(`/Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`);
    
    // Periksa apakah ada praktisioner yang ditemukan
    if (response.data && response.data.entry && response.data.entry.length > 0) {
      const practitioner = response.data.entry[0].resource;
      
      // Ambil ihsNumber (id) dari resource
      const ihsNumber = practitioner.id;
      
      return {
        success: true,
        data: practitioner,
        ihsNumber: ihsNumber
      };
    } else {
      return {
        success: false,
        message: 'Tenaga Medis tidak ditemukan di SATUSEHAT'
      };
    }
  } catch (error) {
    console.error(`[SATUSEHAT] Error searching practitioner by NIK ${nik}:`, error.response?.data || error.message);
    throw new Error('Terjadi kesalahan saat mencari tenaga medis di SATUSEHAT');
  }
};

const { buildLocationPayload } = require('../utils/fhir-mappers/location.mapper');
const { buildEncounterPayload } = require('../utils/fhir-mappers/encounter.mapper');
const { buildObservationPayload } = require('../utils/fhir-mappers/observation.mapper');
const { buildConditionPayload } = require('../utils/fhir-mappers/condition.mapper');
const { buildMedicationPayload, buildMedicationRequestPayload } = require('../utils/fhir-mappers/medication.mapper');
const { buildProcedurePayload } = require('../utils/fhir-mappers/procedure.mapper');
const { buildAllergyPayload } = require('../utils/fhir-mappers/allergy.mapper');
const { buildMedicationDispensePayload } = require('../utils/fhir-mappers/medication-dispense.mapper');

/**
 * Create Location in SATUSEHAT for a Poliklinik
 * @param {Object} poliklinik - Poliklinik Data from DB
 * @returns {Promise<Object>} Location Data (including IHS Location ID)
 */
const createLocation = async (poliklinik) => {
  try {
    const fhirClient = await createFhirClient();
    const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
    
    if (!orgId) {
      throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
    }

    const payload = buildLocationPayload(poliklinik, orgId);
    
    const response = await fhirClient.post('/Location', payload);
    
    return {
      success: true,
      data: response.data,
      ihsLocationId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating location for poli ${poliklinik.namaPoli}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mendaftarkan lokasi ke SATUSEHAT');
  }
};

/**
 * Create Encounter in SATUSEHAT
 * @param {Object} data - Data Kunjungan, Pasien, Dokter, dan Poliklinik
 * @returns {Promise<Object>} Encounter Data
 */
const createEncounter = async (data) => {
  try {
    const fhirClient = await createFhirClient();
    const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
    
    if (!orgId) {
      throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
    }

    const payload = buildEncounterPayload(data, orgId);
    
    // Cetak payload ke terminal agar bisa dilihat oleh developer
    console.log("[SATUSEHAT] Mengirim Encounter Payload:", JSON.stringify(payload, null, 2));

    const response = await fhirClient.post('/Encounter', payload);
    
    return {
      success: true,
      data: response.data,
      encounterId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating encounter:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat membuat Encounter ke SATUSEHAT');
  }
};

/**
 * Update Encounter in SATUSEHAT (PUT /Encounter/{encounterId})
 * @param {string} encounterId - SATUSEHAT Encounter ID
 * @param {Object} data - Data Kunjungan, Pasien, Dokter, Poliklinik, Status (arrived/in-progress/finished)
 */
const updateEncounter = async (encounterId, data) => {
  try {
    const fhirClient = await createFhirClient();
    const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
    
    if (!orgId) {
      throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
    }

    const payload = buildEncounterPayload(data, orgId);
    payload.id = encounterId;

    console.log(`[SATUSEHAT] Updating Encounter ${encounterId} Payload:`, JSON.stringify(payload, null, 2));

    const response = await fhirClient.put(`/Encounter/${encounterId}`, payload);
    
    return {
      success: true,
      data: response.data,
      encounterId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error updating encounter ${encounterId}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat memperbarui Encounter di SATUSEHAT');
  }
};

/**
 * Mengirim Diagnosa (Condition) ke SATUSEHAT
 * @param {Object} data - payload (pasienIhs, pasienName, dokterIhs, dokterName, encounterId, kodeIcd10, namaDiagnosis, statusDiagnosis)
 */
const createCondition = async (data) => {
  try {
    const fhirClient = await createFhirClient();
    
    const payload = buildConditionPayload(data);

    // Cetak payload ke terminal agar bisa dilihat oleh developer
    console.log("[SATUSEHAT] Mengirim Condition Payload:", JSON.stringify(payload, null, 2));

    const response = await fhirClient.post('/Condition', payload);
    
    return {
      success: true,
      data: response.data,
      conditionId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating condition for ICD-10 ${data.kodeIcd10}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mengirim Condition ke SATUSEHAT');
  }
};

/**
 * Mengirim Tanda-Tanda Vital (Observation) ke SATUSEHAT
 * @param {Object} data - payload (pasienIhs, pasienName, dokterIhs, dokterName, encounterId, loincCode, loincDisplay, value, unit, unitCode)
 */
const createObservation = async (data) => {
  const fhirClient = await createFhirClient();
  const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
  
  if (!orgId) {
    throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
  }

  const payload = buildObservationPayload(data);

  // Cetak payload ke terminal agar bisa dilihat oleh developer
  console.log("[SATUSEHAT] Mengirim Observation Payload:", JSON.stringify(payload, null, 2));

  const response = await fhirClient.post('/Observation', payload);
  
  return {
    success: true,
    data: response.data,
    observationId: response.data.id
  };
};

/**
 * Mengirim Obat (Medication) dan Resep (MedicationRequest) ke SATUSEHAT
 * @param {Object} data - payload (pasienIhs, pasienName, dokterIhs, dokterName, encounterId, kodeObat, namaObat, sediaan, resepId, resepDetailId, jumlah, aturanPakai)
 */
const createPrescription = async (data) => {
  const fhirClient = await createFhirClient();
  const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
  
  if (!orgId) {
    throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
  }

  // 1. Kirim Medication (Definisi Obat)
  const uniqueMedReqId = data.resepDetailId ? `${data.resepDetailId}-req` : null;
  const medicationPayload = buildMedicationPayload(data, orgId, uniqueMedReqId);
  console.log("[SATUSEHAT] Mengirim Medication Payload:", JSON.stringify(medicationPayload, null, 2));
  let medicationId;
  try {
    const medResponse = await fhirClient.post('/Medication', medicationPayload);
    medicationId = medResponse.data.id;
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating Medication untuk ${data.kodeObat}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mengirim Medication ke SATUSEHAT');
  }

  // 2. Kirim MedicationRequest (Instruksi Resep)
  const medReqPayload = buildMedicationRequestPayload(data, medicationId, orgId);
  console.log("[SATUSEHAT] Mengirim MedicationRequest Payload:", JSON.stringify(medReqPayload, null, 2));
  
  try {
    const reqResponse = await fhirClient.post('/MedicationRequest', medReqPayload);
    return {
      success: true,
      medicationId: medicationId,
      medicationRequestId: reqResponse.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating MedicationRequest untuk ${data.kodeObat}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mengirim MedicationRequest ke SATUSEHAT');
  }
};

/**
 * Mengirim Tindakan (Procedure) ke SATUSEHAT
 * @param {Object} data - payload (pasienIhs, pasienName, dokterIhs, dokterName, encounterId, kodeIcd9, namaProsedur, tindakanId, waktuTindakan)
 */
const createProcedure = async (data) => {
  try {
    const fhirClient = await createFhirClient();
    const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
    
    if (!orgId) {
      throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
    }
    
    const payload = buildProcedurePayload(data, orgId);

    // Cetak payload ke terminal agar bisa dilihat oleh developer
    console.log("[SATUSEHAT] Mengirim Procedure Payload:", JSON.stringify(payload, null, 2));

    const response = await fhirClient.post('/Procedure', payload);
    
    return {
      success: true,
      data: response.data,
      procedureId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating procedure for ICD-9 ${data.kodeIcd9}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mengirim Procedure ke SATUSEHAT');
  }
};

/**
 * Mengirim AllergyIntolerance (Alergi Pasien) ke SATUSEHAT
 * @param {Object} pasien - Data Pasien lengkap
 * @param {Object} dokter - Data Dokter lengkap
 * @param {Object} kunjungan - Data Kunjungan
 * @param {Object} alergiPasien - Data transaksional Alergi (termasuk relasi alergiMaster)
 */
const createAllergyIntolerance = async (pasien, dokter, kunjungan, alergiPasien) => {
  try {
    const fhirClient = await createFhirClient();
    const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
    
    if (!orgId) {
      throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
    }
    
    const payload = buildAllergyPayload(orgId, pasien, dokter, kunjungan, alergiPasien);

    // Cetak payload ke terminal
    console.log("[SATUSEHAT] Mengirim AllergyIntolerance Payload:", JSON.stringify(payload, null, 2));

    const response = await fhirClient.post('/AllergyIntolerance', payload);
    
    return {
      success: true,
      data: response.data,
      allergyId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating AllergyIntolerance for ${alergiPasien.alergiMaster?.nama_alergi}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mengirim AllergyIntolerance ke SATUSEHAT');
  }
};

/**
 * Search KFA (Kamus Farmasi dan Alat Kesehatan)
 * @param {string} keyword - Kata kunci pencarian
 * @returns {Promise<Object>} Data produk dari KFA
 */
const searchKFA = async (keyword) => {
  try {
    const token = await generateAccessToken();
    const url = `${satusehatConfig.SATUSEHAT_URL.KFA_URL}/products/all`;
    
    const response = await axios.get(url, {
      params: {
        product_type: 'farmasi',
        keyword,
        page: 1,
        size: 50
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[SATUSEHAT] Error searching KFA:', error.response?.data || error.message);
    throw new Error('Terjadi kesalahan saat mencari data di KFA SATUSEHAT');
  }
};

/**
 * Mengirim Penyerahan Obat (MedicationDispense) ke SATUSEHAT
 * Sesuai panduan Kemenkes, ini mengirim Medication kemudian MedicationDispense
 * @param {Object} data - payload lengkap
 */
const postMedicationDispense = async (data) => {
  const fhirClient = await createFhirClient();
  const orgId = satusehatConfig.SATUSEHAT_ORG_ID;
  
  if (!orgId) {
    throw new Error('SATUSEHAT_ORG_ID belum dikonfigurasi di file .env');
  }

  // 1. Kirim Medication (Definisi Obat yang diserahkan)
  const uniqueMedDispId = data.resepDetailId ? `${data.resepDetailId}-disp` : null;
  const medicationPayload = buildMedicationPayload(data, orgId, uniqueMedDispId);
  console.log("[SATUSEHAT] Mengirim Medication (Dispense) Payload:", JSON.stringify(medicationPayload, null, 2));
  let medicationId;
  try {
    const medResponse = await fhirClient.post('/Medication', medicationPayload);
    medicationId = medResponse.data.id;
  } catch (error) {
    const issue = error.response?.data?.issue?.[0];
    const diag = issue?.diagnostics || issue?.details?.text || issue?.details?.coding?.[0]?.display || error.message;
    console.error(`[SATUSEHAT] Error creating Medication (Dispense) untuk ${data.kodeObat}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(`SATUSEHAT Error: ${diag}`);
  }

  // 2. Kirim MedicationDispense (Penyerahan)
  const dispensePayload = buildMedicationDispensePayload(data, medicationId, orgId);
  console.log("[SATUSEHAT] Mengirim MedicationDispense Payload:", JSON.stringify(dispensePayload, null, 2));
  
  try {
    const response = await fhirClient.post('/MedicationDispense', dispensePayload);
    return {
      success: true,
      medicationId: medicationId,
      medicationDispenseId: response.data.id
    };
  } catch (error) {
    const issue = error.response?.data?.issue?.[0];
    const diag = issue?.diagnostics || issue?.details?.text || issue?.details?.coding?.[0]?.display || error.message;
    console.error(`[SATUSEHAT] Error creating MedicationDispense untuk ${data.kodeObat}:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(`SATUSEHAT Error: ${diag}`);
  }
};

/**
 * Mengirim Pengkajian Resep Apoteker (QuestionnaireResponse) ke SATUSEHAT
 * @param {Object} data - payload pengkajian resep
 */
const createQuestionnaireResponse = async (data) => {
  try {
    const fhirClient = await createFhirClient();
    const payload = buildQuestionnaireResponsePayload(data);

    console.log("[SATUSEHAT] Mengirim QuestionnaireResponse Payload:", JSON.stringify(payload, null, 2));

    const response = await fhirClient.post('/QuestionnaireResponse', payload);
    return {
      success: true,
      data: response.data,
      questionnaireResponseId: response.data.id
    };
  } catch (error) {
    console.error(`[SATUSEHAT] Error creating QuestionnaireResponse:`, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : error.message);
    throw new Error(error.response?.data?.issue?.[0]?.diagnostics || 'Terjadi kesalahan saat mengirim QuestionnaireResponse ke SATUSEHAT');
  }
};

module.exports = {
  generateAccessToken,
  createFhirClient,
  getPatientByNIK,
  getPractitionerByNIK,
  createLocation,
  createEncounter,
  updateEncounter,
  createObservation,
  createCondition,
  createPrescription,
  createProcedure,
  createAllergyIntolerance,
  searchKFA,
  postMedicationDispense,
  createQuestionnaireResponse
};
