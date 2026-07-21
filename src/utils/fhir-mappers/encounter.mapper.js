const buildEncounterPayload = (data, orgId) => {
  const startEncounter = data.waktuRegistrasi || data.waktuPemeriksaanMulai || new Date().toISOString();
  const endEncounter = data.waktuPemeriksaanSelesai || (data.status === 'finished' ? new Date().toISOString() : undefined);

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

  const status = data.status || "arrived";

  const payload = {
    resourceType: "Encounter",
    status: status,
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
      start: startEncounter,
      end: endEncounter
    },
    statusHistory: [
      {
        status: "arrived",
        period: {
          start: startEncounter,
          end: data.waktuPemeriksaanMulai || startEncounter
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
        value: data.noKunjungan || data.id
      }
    ]
  };

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

    payload.hospitalization = {
      dischargeDisposition: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/discharge-disposition",
            code: dischargeCode,
            display: dischargeDisplay
          }
        ],
        text: data.statusPulang
      }
    };
  }

  return payload;
};

module.exports = { buildEncounterPayload };
