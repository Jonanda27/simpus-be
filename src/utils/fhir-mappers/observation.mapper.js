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
    ...(data.dokterIhs && data.dokterIhs !== 'undefined' && {
      performer: [
        {
          reference: `Practitioner/${data.dokterIhs}`,
          ...(data.dokterName && { display: data.dokterName })
        }
      ]
    }),
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

const toFHIRRadiologyObservation = (data) => {
  const effectiveDate = data.createdAt
    ? new Date(data.createdAt).toISOString()
    : new Date().toISOString();

  return {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "imaging",
            display: "Imaging"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: data.kodeLoinc || "39051-8",
          display: data.namaPemeriksaan || "Diagnostic radiography"
        }
      ]
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: data.encounterId?.startsWith('urn:uuid:') ? data.encounterId : `Encounter/${data.encounterId}`
    },
    effectiveDateTime: effectiveDate,
    valueString: data.bacaanNaratif || data.hasil || "Hasil pemeriksaan radiologi dalam batas normal.",
    ...(data.dokterIhs && {
      performer: [
        {
          reference: `Practitioner/${(data.dokterIhs && !data.dokterIhs.startsWith('cms')) ? data.dokterIhs : (process.env.SATUSEHAT_PRACTITIONER_IHS || 'N1000001')}`,
          display: data.dokterName || "Dokter Spesialis Radiologi"
        }
      ]
    }),
    ...(data.imagingStudyId && {
      derivedFrom: [
        {
          reference: data.imagingStudyId.startsWith('urn:uuid:') ? data.imagingStudyId : `ImagingStudy/${data.imagingStudyId}`
        }
      ]
    })
  };
};

module.exports = { buildObservationPayload, toFHIRRadiologyObservation };
