const buildMedicationDispensePayload = (data, medicationId, orgId) => {
  const now = new Date();
  const utcNow = now.toISOString().split('.')[0] + '+00:00'; 

  let orderableFormCode = 'TAB';
  let orderableFormDisplay = 'Tablet';
  
  if (data.sediaan && data.sediaan.toLowerCase().includes('kapsul')) {
    orderableFormCode = 'CAP';
  } else if (data.sediaan && data.sediaan.toLowerCase().includes('sirup')) {
    orderableFormCode = 'TAB'; // Fallback to TAB because SYR is invalid in HL7 v3
  } else if (data.sediaan && data.sediaan.toLowerCase().includes('injeksi')) {
    orderableFormCode = 'INJ';
  }

  return {
    resourceType: 'MedicationDispense',
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/prescription/${orgId}`,
        use: 'official',
        value: data.resepId
      },
      {
        system: `http://sys-ids.kemkes.go.id/prescription-item/${orgId}`,
        use: 'official',
        value: data.resepDetailId
      }
    ],
    status: 'completed',
    category: {
      coding: [
        {
          system: 'http://terminology.hl7.org/fhir/CodeSystem/medicationdispense-category',
          code: 'outpatient',
          display: 'Outpatient'
        }
      ]
    },
    medicationReference: {
      reference: `Medication/${medicationId}`,
      display: data.namaObat
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    context: {
      reference: `Encounter/${data.encounterId}`
    },
    performer: [
      {
        function: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/medicationdispense-performer-function',
              code: 'dataenterer',
              display: 'Data Enterer'
            }
          ]
        },
        actor: {
          reference: `Practitioner/${data.practitionerIhs}`,
          display: data.practitionerName
        }
      }
    ],
    location: {
      reference: `Location/${data.locationId}`,
      display: data.locationName
    },
    authorizingPrescription: [
      {
        identifier: {
          system: `http://sys-ids.kemkes.go.id/prescription-item/${orgId}`,
          value: data.resepDetailId
        }
      }
    ],
    quantity: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
      code: orderableFormCode,
      value: data.jumlah
    },
    daysSupply: {
      value: data.jumlahHari || 1,
      unit: 'Day',
      system: 'http://unitsofmeasure.org',
      code: 'd'
    },
    whenPrepared: utcNow,
    whenHandedOver: utcNow,
    dosageInstruction: [
      {
        sequence: 1,
        text: data.instruksi || 'Aturan pakai sesuai resep dokter',
        timing: {
          repeat: {
            frequency: data.frekuensi || 3,
            period: 1,
            periodUnit: 'd'
          }
        },
        route: {
          coding: [
            {
              system: 'http://www.whocc.no/atc',
              code: 'O',
              display: 'Oral'
            }
          ]
        },
        doseAndRate: [
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/dose-rate-type',
                  code: 'ordered',
                  display: 'Ordered'
                }
              ]
            },
            doseQuantity: {
              value: data.dosis || 1,
              unit: orderableFormCode,
              system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
              code: orderableFormCode
            }
          }
        ]
      }
    ]
  };

  return payload;
};

module.exports = { buildMedicationDispensePayload };
