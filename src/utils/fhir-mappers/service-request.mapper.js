/**
 * FHIR R4 ServiceRequest Mapper for Laboratory & Radiology Orders
 */
const buildServiceRequestPayload = (data, orgId, type = "LAB") => {
  let categoryCode = "108252007";
  let categoryDisplay = "Laboratory procedure";
  let codeSystem = "http://loinc.org";
  let requestCode = data.requestCode || "48767-8";
  let requestDisplay = data.requestDisplay || "Pemeriksaan Laboratorium";

  if (type === "RAD") {
    categoryCode = "363679005";
    categoryDisplay = "Imaging";
    codeSystem = "http://snomed.info/sct";
    requestCode = data.requestCode || "363679005";
    requestDisplay = data.requestDisplay || "Pemeriksaan Radiologi";
  } else if (type === "RUJUKAN") {
    categoryCode = "3457005";
    categoryDisplay = "Referral";
    codeSystem = "http://snomed.info/sct";
    requestCode = data.requestCode || "3457005";
    requestDisplay = data.requestDisplay || "Referral to medical specialist";
  }

  const dateStr = data.tanggalOrder 
    ? new Date(data.tanggalOrder).toISOString() 
    : new Date().toISOString();

  return {
    resourceType: "ServiceRequest",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/servicerequest/${orgId}`,
        value: data.orderId || data.id || `SR-${Date.now()}`
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
          system: codeSystem,
          code: requestCode,
          display: requestDisplay
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
    performer: [
      {
        reference: `Practitioner/${data.performerIhs || data.dokterIhs}`,
        display: data.performerName || data.dokterName
      }
    ],
    ...(data.catatanKlinis && {
      note: [{ text: data.catatanKlinis }]
    })
  };
};

module.exports = { buildServiceRequestPayload };
