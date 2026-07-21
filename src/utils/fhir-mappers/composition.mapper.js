/**
 * FHIR R4 Composition Mapper for Resume Medis / Consultation Note
 */
const buildCompositionPayload = (data, orgId) => {
  const dateStr = data.updatedAt || data.createdAt 
    ? new Date(data.updatedAt || data.createdAt).toISOString() 
    : new Date().toISOString();

  return {
    resourceType: "Composition",
    identifier: {
      system: `http://sys-ids.kemkes.go.id/composition/${orgId}`,
      value: data.resumeMedisId || data.id
    },
    status: data.status || "final",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: data.typeCode || "11488-4",
          display: "Consultation note"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: "http://loinc.org",
            code: "LP173421-1",
            display: "Report"
          }
        ]
      }
    ],
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    date: dateStr,
    author: [
      {
        reference: `Practitioner/${data.dokterIhs}`,
        display: data.dokterName
      }
    ],
    title: data.title || "Resume Medis Pasien",
    custodian: {
      reference: `Organization/${orgId}`
    },
    section: [
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
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${data.ringkasanKlinis || "Tidak ada ringkasan"}</div>`
        }
      },
      {
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
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${data.instruksiTindakLanjut || "Kontrol sesuai petunjuk dokter"}</div>`
        }
      }
    ]
  };
};

module.exports = { buildCompositionPayload };
