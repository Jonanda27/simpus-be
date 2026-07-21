const buildEncounterPayload = (data, orgId) => {
  const startEncounter = new Date().toISOString();

  // Map Jenis Pelayanan lokal ke FHIR Class
  let classCode = "AMB"; // Default Ambulatory (Rawat Jalan)
  let classDisplay = "ambulatory";
  
  if (data.jenisPelayanan) {
    const jp = data.jenisPelayanan.toLowerCase();
    if (jp.includes('inap')) {
      classCode = "IMP";
      classDisplay = "inpatient encounter";
    } else if (jp.includes('igd') || jp.includes('gawat')) {
      classCode = "EMER";
      classDisplay = "emergency";
    }
  }

  return {
    resourceType: "Encounter",
    status: "arrived",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: classCode,
      display: classDisplay
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    participant: [
      {
        type: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                code: data.peranDokter || "ATND",
                display: data.peranDokter === 'CON' ? 'consultant' : (data.peranDokter === 'REF' ? 'referrer' : 'attender')
              }
            ]
          }
        ],
        individual: {
          reference: `Practitioner/${data.dokterIhs}`,
          display: data.dokterName
        }
      }
    ],
    period: {
      start: startEncounter
    },
    statusHistory: [
      {
        status: "arrived",
        period: {
          start: startEncounter
        }
      }
    ],
    location: [
      {
        location: {
          reference: `Location/${data.poliIhs}`,
          display: data.poliName
        }
      }
    ],
    serviceProvider: {
      reference: `Organization/${orgId}`
    },
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/encounter/${orgId}`,
        value: data.noKunjungan
      }
    ]
  };
};

module.exports = { buildEncounterPayload };
