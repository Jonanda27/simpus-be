/**
 * FHIR R4 ServiceRequest Mapper for Laboratory & Radiology Orders
 */
const buildServiceRequestPayload = (data, orgId, type = "LAB") => {
  const categoryCode = type === "LAB" ? "108252007" : "363679005";
  const categoryDisplay = type === "LAB" ? "Laboratory procedure" : "Imaging";
  const dateStr = data.tanggalOrder 
    ? new Date(data.tanggalOrder).toISOString() 
    : new Date().toISOString();

  return {
    resourceType: "ServiceRequest",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/servicerequest/${orgId}`,
        value: data.orderId || data.id
      }
    ],
    status: "active",
    intent: data.intent || "original-order",
    priority: data.priority || "routine",
    category: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: categoryCode,
            display: categoryDisplay
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: type === "LAB" ? "http://loinc.org" : "http://snomed.info/sct",
          code: data.requestCode || (type === "LAB" ? "48767-8" : "363679005"),
          display: data.requestDisplay || (type === "LAB" ? "Pemeriksaan Laboratorium" : "Pemeriksaan Radiologi")
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
    authoredOn: dateStr,
    requester: {
      reference: `Practitioner/${data.dokterIhs}`,
      display: data.dokterName
    },
    ...(data.catatanKlinis && {
      note: [{ text: data.catatanKlinis }]
    })
  };
};

module.exports = { buildServiceRequestPayload };
