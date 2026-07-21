/**
 * FHIR R4 ClinicalImpression Mapper for Clinical Impression & Prognosis
 */
const buildClinicalImpressionPayload = (data, orgId) => {
  const dateStr = data.createdAt 
    ? new Date(data.createdAt).toISOString() 
    : new Date().toISOString();

  return {
    resourceType: "ClinicalImpression",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/clinicalimpression/${orgId}`,
        value: data.id
      }
    ],
    status: data.status || "completed",
    description: data.description || "Evaluasi klinis rawat jalan",
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    effectiveDateTime: dateStr,
    date: dateStr,
    assessor: {
      reference: `Practitioner/${data.dokterIhs}`,
      display: data.dokterName
    },
    summary: data.summary || "Pemeriksaan klinis rawat jalan",
    ...(data.prognosisKode && {
      prognosisCodeableConcept: [
        {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: data.prognosisKode,
              display: data.prognosisDisplay || "Prognosis"
            }
          ]
        }
      ]
    })
  };
};

module.exports = { buildClinicalImpressionPayload };
