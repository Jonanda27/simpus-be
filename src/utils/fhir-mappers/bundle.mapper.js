const { randomUUID } = require('crypto');
const { buildEncounterPayload } = require('./encounter.mapper');
const { buildConditionPayload } = require('./condition.mapper');
const { buildObservationPayload } = require('./observation.mapper');
const { buildProcedurePayload } = require('./procedure.mapper');
const { buildMedicationPayload, buildMedicationRequestPayload } = require('./medication.mapper');
const { buildCompositionPayload } = require('./composition.mapper');

/**
 * Helper to ensure standard reference string
 */
const formatRef = (resourceType, id) => {
  if (!id) return undefined;
  if (id.startsWith('urn:uuid:') || id.startsWith(`${resourceType}/`)) {
    return id;
  }
  return `${resourceType}/${id}`;
};

/**
 * Orchestrator mapper to generate a FHIR R4 Transaction Bundle for Rawat Jalan.
 * @param {Object} dataComplete - Complete visit data including pasien, dokter, poli, diagnoses, observations, procedures, medications.
 * @param {string} [orgId] - Organization IHS ID.
 * @returns {Object} FHIR R4 Bundle Payload (type: transaction)
 */
const toRawatJalanBundle = (dataComplete = {}, orgId) => {
  const organizationId = orgId || dataComplete.orgId || process.env.SATUSEHAT_ORG_ID;
  const satusehatEncounterId = dataComplete.satusehat_encounter_id || dataComplete.encounterId || dataComplete.satusehatId;
  
  // Internal UUID for Encounter linking within transaction bundle
  const encounterUuid = `urn:uuid:${randomUUID()}`;
  const encounterRef = satusehatEncounterId ? `Encounter/${satusehatEncounterId}` : encounterUuid;

  const entries = [];
  const obsUuids = [];
  const condUuids = [];
  const procUuids = [];
  const medReqUuids = [];

  // 1. ENCOUNTER
  const encounterData = {
    ...dataComplete,
    statusKunjungan: dataComplete.statusKunjungan || 'SELESAI',
    status: dataComplete.status || 'finished',
    waktuDischarge: dataComplete.waktuDischarge || new Date().toISOString()
  };

  const encounterResource = buildEncounterPayload(encounterData, organizationId);
  
  if (satusehatEncounterId) {
    encounterResource.id = satusehatEncounterId;
    entries.push({
      fullUrl: `https://fhir.kemkes.go.id/r4/Encounter/${satusehatEncounterId}`,
      resource: encounterResource,
      request: {
        method: "PUT",
        url: `Encounter/${satusehatEncounterId}`
      }
    });
  } else {
    entries.push({
      fullUrl: encounterUuid,
      resource: encounterResource,
      request: {
        method: "POST",
        url: "Encounter"
      }
    });
  }

  const pasienIhs = dataComplete.pasienIhs || dataComplete.pasien?.noIHS || dataComplete.pasien?.satusehat_ihs;
  const pasienName = dataComplete.pasienName || dataComplete.pasien?.namaLengkap;
  const dokterIhs = dataComplete.dokterIhs || dataComplete.dokter?.noIHS || dataComplete.dokter?.tenagaMedis?.noIHS;
  const dokterName = dataComplete.dokterName || dataComplete.dokter?.namaLengkap;

  // 2. OBSERVATIONS (Vital Signs)
  const observations = dataComplete.observations || dataComplete.vitalSigns || [];
  observations.forEach((obs) => {
    const obsUuid = `urn:uuid:${randomUUID()}`;
    const obsPayload = buildObservationPayload({
      ...obs,
      pasienIhs,
      pasienName,
      dokterIhs,
      dokterName,
      encounterId: satusehatEncounterId || encounterUuid.replace('urn:uuid:', '')
    });
    
    obsPayload.encounter = { reference: encounterRef };
    if (pasienIhs) obsPayload.subject = { reference: formatRef('Patient', pasienIhs), display: pasienName };
    if (dokterIhs) obsPayload.performer = [{ reference: formatRef('Practitioner', dokterIhs), display: dokterName }];

    entries.push({
      fullUrl: obsUuid,
      resource: obsPayload,
      request: {
        method: "POST",
        url: "Observation"
      }
    });
    obsUuids.push(obsUuid);
  });

  // 3. CONDITIONS (Diagnosis ICD-10)
  const diagnosisList = dataComplete.diagnosisList || dataComplete.diagnoses || dataComplete.diagnosis || [];
  diagnosisList.forEach((diag) => {
    const condUuid = `urn:uuid:${randomUUID()}`;
    const condPayload = buildConditionPayload({
      ...diag,
      kodeIcd10: diag.kodeIcd10 || diag.icd10?.kode_icd10 || diag.kode_icd10,
      namaDiagnosis: diag.namaDiagnosis || diag.icd10?.nama_diagnosis || diag.nama_diagnosis,
      pasienIhs,
      pasienName,
      dokterIhs,
      dokterName,
      encounterId: satusehatEncounterId || encounterUuid.replace('urn:uuid:', '')
    });

    condPayload.encounter = { reference: encounterRef };
    if (pasienIhs) condPayload.subject = { reference: formatRef('Patient', pasienIhs), display: pasienName };
    if (dokterIhs) condPayload.recorder = { reference: formatRef('Practitioner', dokterIhs), display: dokterName };

    entries.push({
      fullUrl: condUuid,
      resource: condPayload,
      request: {
        method: "POST",
        url: "Condition"
      }
    });
    condUuids.push(condUuid);
  });

  // 4. PROCEDURES (Tindakan ICD-9)
  const procedureList = dataComplete.procedureList || dataComplete.procedures || dataComplete.tindakans || [];
  procedureList.forEach((proc) => {
    const procUuid = `urn:uuid:${randomUUID()}`;
    const procPayload = buildProcedurePayload({
      ...proc,
      tindakanId: proc.tindakanId || proc.id,
      kodeIcd9: proc.kodeIcd9 || proc.icd9?.kode_icd9 || proc.kode_icd9,
      namaProsedur: proc.namaProsedur || proc.icd9?.nama_prosedur || proc.nama_prosedur,
      pasienIhs,
      pasienName,
      dokterIhs,
      dokterName,
      encounterId: satusehatEncounterId || encounterUuid.replace('urn:uuid:', '')
    }, organizationId);

    procPayload.encounter = { reference: encounterRef };
    if (pasienIhs) procPayload.subject = { reference: formatRef('Patient', pasienIhs), display: pasienName };

    entries.push({
      fullUrl: procUuid,
      resource: procPayload,
      request: {
        method: "POST",
        url: "Procedure"
      }
    });
    procUuids.push(procUuid);
  });

  // 5. MEDICATIONS & MEDICATION REQUESTS (Resep Obat)
  const resepDetails = dataComplete.resepDetails || dataComplete.resep || dataComplete.medications || [];
  resepDetails.forEach((med) => {
    const kfaCode = med.kfa_code || med.kodeObat || med.obat?.kfa_code || med.obat?.kodeObat;
    const namaObat = med.namaObat || med.obat?.namaObat;

    if (!kfaCode) {
      console.warn(`[FHIR Mapper] Skipping medication entry for "${namaObat || med.id}": missing valid KFA/obat code.`);
      return;
    }

    const medUuid = `urn:uuid:${randomUUID()}`;
    const medReqUuid = `urn:uuid:${randomUUID()}`;

    // Medication Resource
    const medPayload = buildMedicationPayload({
      ...med,
      resepDetailId: med.resepDetailId || med.id,
      kodeObat: kfaCode,
      namaObat: namaObat,
      sediaan: med.sediaan || med.obat?.sediaan
    }, organizationId, medUuid);

    entries.push({
      fullUrl: medUuid,
      resource: medPayload,
      request: {
        method: "POST",
        url: "Medication"
      }
    });

    // MedicationRequest Resource
    const medReqPayload = buildMedicationRequestPayload({
      ...med,
      resepId: med.resepId,
      resepDetailId: med.resepDetailId || med.id,
      namaObat: namaObat,
      pasienIhs,
      pasienName,
      dokterIhs,
      dokterName,
      encounterId: satusehatEncounterId || encounterUuid.replace('urn:uuid:', '')
    }, medUuid, organizationId);

    medReqPayload.medicationReference = { reference: medUuid, display: namaObat };
    medReqPayload.encounter = { reference: encounterRef };
    if (pasienIhs) medReqPayload.subject = { reference: formatRef('Patient', pasienIhs), display: pasienName };
    if (dokterIhs) medReqPayload.requester = { reference: formatRef('Practitioner', dokterIhs), display: dokterName };

    entries.push({
      fullUrl: medReqUuid,
      resource: medReqPayload,
      request: {
        method: "POST",
        url: "MedicationRequest"
      }
    });
    medReqUuids.push(medReqUuid);
  });

  // 6. COMPOSITION (Resume Medis)
  const compositionUuid = `urn:uuid:${randomUUID()}`;
  const compositionPayload = buildCompositionPayload({
    resumeMedisId: dataComplete.rekamMedis?.id || dataComplete.id,
    id: dataComplete.id,
    status: "final",
    pasienIhs,
    pasienName,
    encounterId: satusehatEncounterId || encounterUuid.replace('urn:uuid:', ''),
    dokterIhs,
    dokterName,
    title: "Resume Medis Rawat Jalan",
    ringkasanKlinis: dataComplete.rekamMedis?.keluhanUtama || dataComplete.rekamMedis?.diagnosisKlinis || "Pemeriksaan Rawat Jalan",
    instruksiTindakLanjut: dataComplete.rekamMedis?.instruksiMedis || dataComplete.rekamMedis?.rencanaTerapi || "Kontrol bila keluhan berlanjut"
  }, organizationId);

  compositionPayload.encounter = { reference: encounterRef };
  if (pasienIhs) compositionPayload.subject = { reference: formatRef('Patient', pasienIhs), display: pasienName };
  if (dokterIhs) compositionPayload.author = [{ reference: formatRef('Practitioner', dokterIhs), display: dokterName }];

  const compositionSections = [
    {
      title: "Riwayat Keluhan & Ringkasan Klinis",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "11329-0",
            display: "History of General health Narrative"
          }
        ]
      },
      text: {
        status: "generated",
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${dataComplete.rekamMedis?.keluhanUtama || "Tidak ada ringkasan"}</div>`
      }
    }
  ];

  if (condUuids.length > 0) {
    compositionSections.push({
      title: "Diagnosis",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "29548-5",
            display: "Diagnosis"
          }
        ]
      },
      entry: condUuids.map(uuid => ({ reference: uuid }))
    });
  }

  if (obsUuids.length > 0) {
    compositionSections.push({
      title: "Pemeriksaan Fisik & Tanda Vital",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8716-3",
            display: "Vital signs"
          }
        ]
      },
      entry: obsUuids.map(uuid => ({ reference: uuid }))
    });
  }

  if (procUuids.length > 0) {
    compositionSections.push({
      title: "Tindakan Medis",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "18776-5",
            display: "Plan of care note"
          }
        ]
      },
      entry: procUuids.map(uuid => ({ reference: uuid }))
    });
  }

  if (medReqUuids.length > 0) {
    compositionSections.push({
      title: "Resep Obat",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "29551-9",
            display: "Medication prescribed"
          }
        ]
      },
      entry: medReqUuids.map(uuid => ({ reference: uuid }))
    });
  }

  compositionSections.push({
    title: "Instruksi Tindak Lanjut",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "28574-2",
          display: "Discharge instructions instructions"
        }
      ]
    },
    text: {
      status: "generated",
      div: `<div xmlns="http://www.w3.org/1999/xhtml">${dataComplete.rekamMedis?.instruksiMedis || dataComplete.rekamMedis?.rencanaTerapi || "Kontrol sesuai petunjuk dokter"}</div>`
    }
  });

  compositionPayload.section = compositionSections;

  entries.push({
    fullUrl: compositionUuid,
    resource: compositionPayload,
    request: {
      method: "POST",
      url: "Composition"
    }
  });

  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries
  };
};

module.exports = { toRawatJalanBundle };
