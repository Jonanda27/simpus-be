/**
 * Helper to ensure standard reference string
 */
const formatReference = (prefix, id) => {
  if (!id) return undefined;
  if (id.startsWith('urn:uuid:') || id.startsWith(`${prefix}/`)) {
    return id;
  }
  return `${prefix}/${id}`;
};

const buildEncounterPayload = (data, orgId) => {
  // Use actual registration timestamp (ISO-8601 UTC)
  const startEncounter = data.tanggalRegistrasi 
    ? new Date(data.tanggalRegistrasi).toISOString() 
    : (data.waktuRegistrasi || data.waktuPemeriksaanMulai || new Date().toISOString());

  // Dynamic status mapping
  const statusMap = {
    'MENUNGGU': 'arrived',
    'DIPERIKSA': 'in-progress',
    'SELESAI': 'finished',
    'BATAL': 'cancelled'
  };
  const fhirStatus = data.status || statusMap[data.statusKunjungan] || 'arrived';

  const endEncounter = data.waktuDischarge 
    ? new Date(data.waktuDischarge).toISOString() 
    : (data.waktuPemeriksaanSelesai || (fhirStatus === 'finished' ? new Date().toISOString() : undefined));

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
      reference: formatReference("Patient", data.pasienIhs),
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
          reference: formatReference("Practitioner", data.dokterIhs),
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
      },
      ...(data.waktuPemeriksaanMulai ? [{
        status: "in-progress",
        period: {
          start: new Date(data.waktuPemeriksaanMulai).toISOString(),
          end: endEncounter
        }
      }] : []),
      ...(fhirStatus === 'finished' ? [{
        status: "finished",
        period: {
          start: endEncounter,
          end: endEncounter
        }
      }] : [])
    ],
    location: [
      {
        location: {
          reference: formatReference("Location", data.poliIhs),
          display: data.poliName
        },
        extension: [
          {
            url: "https://fhir.kemkes.go.id/r4/StructureDefinition/ServiceClass",
            valueCodeableConcept: {
              coding: [
                {
                  system: "http://terminology.kemkes.go.id/CodeSystem/locationServiceClass-Outpatient",
                  code: data.kelasPoliCode || "reguler",
                  display: data.kelasPoliDisplay || "Kelas Reguler"
                }
              ]
            },
            upgradeClassIndicator: {
              coding: [
                {
                  system: "http://terminology.kemkes.go.id/CodeSystem/locationUpgradeClass",
                  code: data.upgradeClassCode || "kelas-tetap",
                  display: data.upgradeClassDisplay || "Kelas Tetap Perawatan"
                }
              ]
            }
          }
        ]
      }
    ],
    serviceProvider: {
      reference: formatReference("Organization", orgId)
    },
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/encounter/${orgId}`,
        value: data.noKunjungan || data.id
      }
    ]
  };

  // Diagnosis reference mapping if condition ID exists
  if (data.conditionSatusehatId) {
    payload.diagnosis = [
      {
        condition: {
          reference: formatReference("Condition", data.conditionSatusehatId)
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
  const statusPulang = data.statusPulang || data.caraKeluar;
  if (statusPulang || data.kondisiDischarge || fhirStatus === 'finished') {
    let dischargeCode = "home";
    let dischargeDisplay = data.kondisiDischarge || "Home";

    if (statusPulang === 'DIRUJUK_RS' || statusPulang === 'RUJUK') {
      dischargeCode = "oth";
      dischargeDisplay = "Referred to external facility / Hospital";
    } else if (statusPulang === 'RAWAT_INAP') {
      dischargeCode = "hosp";
      dischargeDisplay = "Admitted to inpatient ward";
    }

    payload.hospitalization = {
      dischargeDisposition: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/discharge-disposition",
            code: dischargeCode,
            display: dischargeDisplay
          }
        ],
        text: statusPulang
      }
    };
  }

  return payload;
};

module.exports = { buildEncounterPayload };
