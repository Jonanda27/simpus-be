<<<<<<< HEAD
const buildQuestionnaireResponsePayload = (data) => {
  return {
    resourceType: "QuestionnaireResponse",
    status: "completed",
    questionnaire: "https://fhir.kemkes.go.id/Questionnaire/Q0001",
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    author: {
      reference: `Practitioner/${data.practitionerIhs}`,
      display: data.practitionerName || "Apoteker"
    },
    authored: data.authoredOn || new Date().toISOString(),
    item: [
      {
        linkId: "1",
        text: "Persyaratan Administrasi",
        item: [
          {
            linkId: "1.1",
            text: "Nama, umur, jenis kelamin, BB/TB Pasien",
            answer: [{ valueBoolean: data.adminPasienValid ?? true }]
          },
          {
            linkId: "1.2",
            text: "Nama, SIP, Alamat Dokter",
            answer: [{ valueBoolean: data.adminDokterValid ?? true }]
          },
          {
            linkId: "1.3",
            text: "Tanggal Resep",
            answer: [{ valueBoolean: true }]
          }
        ]
      },
      {
        linkId: "2",
        text: "Persyaratan Farmasetik",
        item: [
          {
            linkId: "2.1",
            text: "Nama obat, bentuk dan kekuatan sediaan",
            answer: [{ valueBoolean: data.farmasetikSediaanValid ?? true }]
          },
          {
            linkId: "2.2",
            text: "Dosis dan jumlah obat",
            answer: [{ valueBoolean: data.farmasetikDosisValid ?? true }]
          },
          {
            linkId: "2.3",
            text: "Aturan dan cara penggunaan",
            answer: [{ valueBoolean: data.farmasetikSignaValid ?? true }]
          }
        ]
      },
      {
        linkId: "3",
        text: "Persyaratan Klinis",
        item: [
          {
            linkId: "3.1",
            text: "Ketepatan indikasi, dosis, dan waktu penggunaan",
            answer: [{ valueBoolean: data.klinisIndikasiValid ?? true }]
          },
          {
            linkId: "3.2",
            text: "Duplikasi pengobatan",
            answer: [{ valueBoolean: data.klinisDuplikasiValid ?? false }]
          },
          {
            linkId: "3.3",
            text: "Alergi dan Reaksi Obat yang Tidak Dikehendaki (ROTD)",
            answer: [{ valueBoolean: data.klinisAlergiValid ?? false }]
          },
          {
            linkId: "3.4",
            text: "Kontraindikasi",
            answer: [{ valueBoolean: data.klinisKontraindikasiValid ?? false }]
          },
          {
            linkId: "3.5",
            text: "Interaksi obat",
            answer: [{ valueBoolean: data.klinisInteraksiValid ?? false }]
          }
        ]
      }
    ]
  };
};

module.exports = { buildQuestionnaireResponsePayload };
=======
/**
 * FHIR R4 QuestionnaireResponse Mapper for SATUSEHAT (POST /QuestionnaireResponse)
 * Generates payload according to Kemenkes SATUSEHAT interoperability specifications.
 * 
 * @param {Object} data - Input data containing questionnaire responses
 * @param {string} orgId - SATUSEHAT Organization ID
 * @returns {Object} QuestionnaireResponse FHIR R4 JSON Payload
 */
const buildQuestionnaireResponsePayload = (data = {}, orgId) => {
  const patientIhs = data.patientIhs || data.pasienIhs;
  const encounterIhs = data.encounterIhs || data.encounterId;
  const practitionerIhs = data.practitionerIhs || data.dokterIhs;

  if (!patientIhs) throw new Error("IHS Pasien (patientIhs) wajib disertakan");
  if (!encounterIhs) throw new Error("IHS Kunjungan (encounterIhs) wajib disertakan");
  
  // Tanggal & Waktu disesuaikan dengan UTC +00 jika ada waktu lokal
  const authoredDate = data.authored ? new Date(data.authored).toISOString() : new Date().toISOString();

  const payload = {
    resourceType: "QuestionnaireResponse",
    questionnaire: data.questionnaireUrl || "https://fhir.kemkes.go.id/Questionnaire/Q0002",
    status: data.status || "completed",
    subject: {
      reference: `Patient/${patientIhs}`,
      display: data.patientName || "Patient"
    },
    encounter: {
      reference: `Encounter/${encounterIhs}`
    },
    authored: authoredDate,
    item: data.items || []
  };

  // Opsional link to ServiceRequest / CarePlan
  if (data.basedOn) {
    payload.basedOn = Array.isArray(data.basedOn) 
      ? data.basedOn.map(ref => ({ reference: ref }))
      : [{ reference: data.basedOn }];
  }

  // Opsional link to Observation / Procedure
  if (data.partOf) {
    payload.partOf = Array.isArray(data.partOf) 
      ? data.partOf.map(ref => ({ reference: ref }))
      : [{ reference: data.partOf }];
  }

  // Author / Pencatat (Dokter / Tenaga Medis) - Wajib ada
  payload.author = {
    reference: `Practitioner/${practitionerIhs}`,
    display: data.practitionerName || "Apoteker SIMPUS"
  };

  // Source / Sumber jawaban - Wajib ada (Pasien)
  payload.source = {
    reference: `Patient/${patientIhs}`,
    display: data.patientName || "Patient"
  };

  return payload;
};

module.exports = {
  buildQuestionnaireResponsePayload
};
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
