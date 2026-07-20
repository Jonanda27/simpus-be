const buildConditionPayload = (data) => {
  // Map status lokal ke FHIR verificationStatus
  let verCode = "provisional"; // Default untuk Suspek atau Kerja
  let verDisplay = "Provisional";
  
  if (data.statusDiagnosis && data.statusDiagnosis.toLowerCase() === "definitif") {
    verCode = "confirmed";
    verDisplay = "Confirmed";
  }

  return {
    resourceType: "Condition",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active"
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
