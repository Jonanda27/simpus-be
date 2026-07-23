const buildObservationPayload = (data) => {
  const startEncounter = new Date().toISOString();

  const payload = {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: data.loincCode,
          display: data.loincDisplay
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
    performer: [
      {
        reference: `Practitioner/${data.dokterIhs}`,
        display: data.dokterName
      }
    ],
    effectiveDateTime: startEncounter
  };

  // Khusus untuk tekanan darah (Blood Pressure), strukturnya beda karena pakai "component"
  if (data.loincCode === "85354-9") {
    payload.component = data.components; // Sistolik & Diastolik
  } else {
    payload.valueQuantity = {
      value: data.value,
      unit: data.unit,
      system: "http://unitsofmeasure.org",
      code: data.unitCode
    };
  }

  return payload;
};

/**
 * Build Observation Payload untuk Pemeriksaan Fisik Head to Toe (Category: exam)
 */
const buildPhysicalExamObservationPayload = (data) => {
  return {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "exam",
            display: "Exam"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: data.loincCode || "29545-1",
          display: data.organName || "Physical findings"
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
    effectiveDateTime: data.effectiveDateTime || new Date().toISOString(),
    valueString: data.hasilPemeriksaan
  };
};

module.exports = { buildObservationPayload, buildPhysicalExamObservationPayload };
