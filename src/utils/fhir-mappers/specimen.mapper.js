/**
 * FHIR R4 Specimen Mapper for Laboratory Specimens
 */
const buildSpecimenPayload = (data, orgId) => {
  const collectionDate = data.waktuPengambilan 
    ? new Date(data.waktuPengambilan).toISOString() 
    : new Date().toISOString();

  return {
    resourceType: "Specimen",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/specimen/${orgId}`,
        value: data.id
      }
    ],
    status: data.kondisiSpesimen === "autolyzed" ? "entered-in-error" : "available",
    type: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: data.jenisSpesimenKode || "119294007",
          display: data.jenisSpesimenNama || "Blood sample"
        }
      ]
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    request: [
      {
        reference: `ServiceRequest/${data.serviceRequestId}`
      }
    ],
    collection: {
      collector: data.collectorIhs ? {
        reference: `Practitioner/${data.collectorIhs}`,
        display: data.collectorName
      } : undefined,
      collectedDateTime: collectionDate,
      ...(data.volume && {
        quantity: {
          value: data.volume,
          unit: data.satuanVolume || "mL"
        }
      }),
      ...(data.statusPuasa && {
        fastingStatusCodeableConcept: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0916",
              code: "F",
              display: "Patient was fasting prior to the procedure."
            }
          ]
        }
      }),
      ...(data.metodePengambilan && {
        method: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: data.metodePengambilan,
              display: "Specimen collection method"
            }
          ]
        }
      })
    },
    ...(data.prosedurFiksasi && {
      processing: [
        {
          procedure: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: data.prosedurFiksasi,
                display: "Fixation procedure"
              }
            ]
          },
          timeDateTime: data.waktuFiksasi ? new Date(data.waktuFiksasi).toISOString() : collectionDate
        }
      ]
    }),
    ...(data.catatan && {
      note: [{ text: data.catatan }]
    })
  };
};

module.exports = { buildSpecimenPayload };
