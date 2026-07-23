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
<<<<<<< HEAD
  const startEncounter = data.waktuRegistrasi || data.waktuPemeriksaanMulai || new Date().toISOString();
  const endEncounter = data.waktuPemeriksaanSelesai || (data.status === 'finished' ? new Date().toISOString() : undefined);
=======
  // Use actual registration timestamp (ISO-8601 UTC)
  const startEncounter = data.tanggalRegistrasi 
    ? new Date(data.tanggalRegistrasi).toISOString() 
    : new Date().toISOString();

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
    : (fhirStatus === 'finished' ? new Date().toISOString() : undefined);
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc

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

<<<<<<< HEAD
  const status = data.status || "arrived";

  const payload = {
    resourceType: "Encounter",
    status: status,
=======
  const payload = {
    resourceType: "Encounter",
    status: fhirStatus,
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
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
<<<<<<< HEAD
      end: endEncounter
=======
      ...(endEncounter && { end: endEncounter })
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
    },
    statusHistory: [
      {
        status: fhirStatus,
        period: {
          start: startEncounter,
<<<<<<< HEAD
          end: data.waktuPemeriksaanMulai || startEncounter
=======
          ...(endEncounter && { end: endEncounter })
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
        }
      },
      ...(data.waktuPemeriksaanMulai ? [{
        status: "in-progress",
        period: {
          start: data.waktuPemeriksaanMulai,
          end: endEncounter
        }
      }] : []),
      ...(status === 'finished' ? [{
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
        }
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

<<<<<<< HEAD
  if (data.statusPulang) {
    let dischargeCode = "home";
    let dischargeDisplay = "Home";
    if (data.statusPulang === 'DIRUJUK_RS') {
      dischargeCode = "oth";
      dischargeDisplay = "Referred to external facility / Hospital";
    } else if (data.statusPulang === 'RAWAT_INAP') {
      dischargeCode = "hosp";
      dischargeDisplay = "Admitted to inpatient ward";
    }

=======
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
  if (data.caraKeluar || data.kondisiDischarge || fhirStatus === 'finished') {
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
    payload.hospitalization = {
      dischargeDisposition: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/discharge-disposition",
<<<<<<< HEAD
            code: dischargeCode,
            display: dischargeDisplay
          }
        ],
        text: data.statusPulang
=======
            code: data.caraKeluar === 'RUJUK' ? 'other-hcf' : 'home',
            display: data.kondisiDischarge || 'Discharged to home'
          }
        ]
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
      }
    };
  }

  return payload;
};

module.exports = { buildEncounterPayload };
