const buildProcedurePayload = (data, orgId) => {
  return {
    resourceType: "Procedure",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/procedure/${orgId}`,
        use: "official",
        value: data.tindakanId // ID lokal tindakan
      }
    ],
    status: "completed",
    category: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "103693007",
          display: "Diagnostic procedure"
        }
      ]
    },
    code: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-9-cm",
          code: data.kodeIcd9,
          display: data.namaProsedur
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
    performedDateTime: data.waktuTindakan || new Date().toISOString(),
    ...(data.dokterIhs && data.dokterIhs !== 'undefined' && {
      performer: [
        {
          actor: {
            reference: `Practitioner/${data.dokterIhs}`,
            ...(data.dokterName && { display: data.dokterName })
          },
          onBehalfOf: {
            reference: `Organization/${orgId}`
          }
        }
      ]
    })
  };
};

module.exports = { buildProcedurePayload };
