const buildConditionPayload = (data) => {
  // Map status lokal (verificationStatus) ke FHIR
  let verCode = "provisional"; // Default
  let verDisplay = "Provisional";
  const ver = data.statusDiagnosis ? data.statusDiagnosis.toLowerCase() : "";
  
  if (ver === "definitif") {
    verCode = "confirmed";
    verDisplay = "Confirmed";
  } else if (ver === "menyingkirkan" || ver === "rule out") {
    verCode = "refuted";
    verDisplay = "Refuted";
  } else if (ver === "kerja") {
    verCode = "differential";
    verDisplay = "Differential";
  }

  // Map status klinis (clinicalStatus) ke FHIR
  let clinCode = "active"; // Default
  let clinDisplay = "Active";
  const clin = data.statusKlinis ? data.statusKlinis.toLowerCase() : "";

  if (clin === "sembuh") {
    clinCode = "resolved";
    clinDisplay = "Resolved";
  } else if (clin === "kambuh") {
    clinCode = "relapse";
    clinDisplay = "Relapse";
  } else if (clin === "remisi") {
    clinCode = "remission";
    clinDisplay = "Remission";
  }

  return {
    resourceType: "Condition",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: clinCode,
          display: clinDisplay
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: verCode,
          display: verDisplay
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "encounter-diagnosis",
            display: "Encounter Diagnosis"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10",
          code: data.kodeIcd10,
          display: data.namaDiagnosis
        }
      ]
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    recorder: {
      reference: `Practitioner/${data.dokterIhs}`,
      display: data.dokterName
    }
  };
};

module.exports = { buildConditionPayload };
