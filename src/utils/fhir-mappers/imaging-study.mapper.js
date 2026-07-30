/**
 * FHIR R4 ImagingStudy Mapper for Radiology / DICOM NIDR Integration
 */
const toFHIRImagingStudy = ({ hasil, order, patientIhs, encounterSatusehatId, organizationId }) => {
  const startedDate = hasil?.createdAt || order?.createdAt
    ? new Date(hasil?.createdAt || order?.createdAt).toISOString()
    : new Date().toISOString();

  const wadoUrl = hasil?.wadoUrl || `https://nidr.kemkes.go.id/wado/v1/studies/${order?.acsn || order?.id || 'STUDY-DEFAULT'}`;
  const seriesUid = order?.acsn || order?.id || `SERIES-${Date.now()}`;
  const modalityCode = order?.details?.[0]?.modalitas || "DX";

  return {
    resourceType: "ImagingStudy",
    status: "available",
    identifier: [
      {
        use: "official",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "ACSN",
              display: "Accession ID"
            }
          ]
        },
        system: `http://sys-ids.kemkes.go.id/acsn/${organizationId || '1000001'}`,
        value: order?.acsn || `ACSN-${Date.now()}`
      }
    ],
    modality: [
      {
        system: "http://dicom.nema.org/resources/ontology/DCM",
        code: modalityCode
      }
    ],
    subject: {
      reference: `Patient/${patientIhs}`
    },
    encounter: {
      reference: encounterSatusehatId?.startsWith('urn:uuid:') ? encounterSatusehatId : `Encounter/${encounterSatusehatId}`
    },
    started: startedDate,
    endpoint: [
      {
        reference: wadoUrl
      }
    ],
    series: [
      {
        uid: seriesUid,
        modality: {
          system: "http://dicom.nema.org/resources/ontology/DCM",
          code: modalityCode
        },
        endpoint: [
          {
            reference: wadoUrl
          }
        ]
      }
    ]
  };
};

module.exports = { toFHIRImagingStudy };
