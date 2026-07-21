const buildEncounterPayload = (data, orgId) => {
  // Use actual registration timestamp (ISO-8601 UTC)
  const startEncounter = data.tanggalRegistrasi 
    ? new Date(data.tanggalRegistrasi).toISOString() 
    : new Date().toISOString();

  const endEncounter = data.waktuDischarge 
    ? new Date(data.waktuDischarge).toISOString() 
    : undefined;

  // Dynamic status mapping
  const statusMap = {
    'MENUNGGU': 'arrived',
    'DIPERIKSA': 'in-progress',
    'SELESAI': 'finished',
    'BATAL': 'cancelled'
  };
  const fhirStatus = statusMap[data.statusKunjungan] || 'arrived';

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

  const payload = {
    resourceType: "Encounter",
    status: fhirStatus,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: classCode,
      display: classDisplay
    },
    ...(data.layananTujuan && {
      serviceType: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/service-type",
            code: "124",
            display: data.layananTujuan
          }
        ]
      }
    }),
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
      start: startEncounter,
      ...(endEncounter && { end: endEncounter })
    },
    statusHistory: [
      {
        status: fhirStatus,
        period: {
          start: startEncounter,
          ...(endEncounter && { end: endEncounter })
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

  // Diagnosis reference mapping if condition ID exists
  if (data.conditionSatusehatId) {
    payload.diagnosis = [
      {
        condition: {
          reference: `Condition/${data.conditionSatusehatId}`
        },
        use: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/diagnosis-role",
              code: "DD",
              display: "Discharge diagnosis"
            }
          ]
        },
        rank: data.rankDiagnosis || 1
      }
    ];
  }

  // Hospitalization / Discharge Disposition
  if (data.caraKeluar || data.kondisiDischarge) {
    payload.hospitalization = {
      dischargeDisposition: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/discharge-disposition",
            code: data.caraKeluar === 'RUJUK' ? 'other-hcf' : 'home',
            display: data.kondisiDischarge || 'Discharged to home'
          }
        ]
      }
    };
  }

  return payload;
};

module.exports = { buildEncounterPayload };

