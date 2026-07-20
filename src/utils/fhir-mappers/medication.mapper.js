const buildMedicationPayload = (data, orgId) => {
  // Mapping sediaan (form) secara sederhana
  let formCode = "BS023"; // Default Kaplet Salut Selaput
  let formDisplay = "Kaplet Salut Selaput";

  if (data.sediaan && data.sediaan.toLowerCase().includes('tablet')) {
    formCode = "BS065";
    formDisplay = "Tablet";
  } else if (data.sediaan && data.sediaan.toLowerCase().includes('kapsul')) {
    formCode = "BS036";
    formDisplay = "Kapsul";
  } else if (data.sediaan && data.sediaan.toLowerCase().includes('sirup')) {
    formCode = "BS060";
    formDisplay = "Sirup";
  }

  return {
    resourceType: "Medication",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/medication/${orgId}`,
        use: "official",
        value: data.obatId || data.kodeObat // ID lokal obat
      }
    ],
    code: {
      coding: [
        {
          system: "http://sys-ids.kemkes.go.id/kfa",
          code: data.kodeObat, // Kode KFA (Kamus Farmasi dan Alat Kesehatan)
          display: data.namaObat
        }
      ]
    },
    status: "active",
    form: {
      coding: [
        {
          system: "http://terminology.kemkes.go.id/CodeSystem/medication-form",
          code: formCode,
          display: formDisplay
        }
      ]
    },
    extension: [
      {
        url: "https://fhir.kemkes.go.id/r4/StructureDefinition/MedicationType",
        valueCodeableConcept: {
          coding: [
            {
              system: "http://terminology.kemkes.go.id/CodeSystem/medication-type",
              code: "NC", // Default Non-compound (Non-racikan)
              display: "Non-compound"
            }
          ]
        }
      }
    ]
  };
};

const buildMedicationRequestPayload = (data, medicationId, orgId) => {
  return {
    resourceType: "MedicationRequest",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/prescription/${orgId}`,
        use: "official",
        value: data.resepId // ID Resep lokal
      },
      {
        system: `http://sys-ids.kemkes.go.id/prescription-item/${orgId}`,
        use: "official",
        value: data.resepDetailId // ID Resep per-item
      }
    ],
    status: "completed", 
    intent: "order",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
            code: "outpatient", 
            display: "Outpatient"
          }
        ]
      }
    ],
    priority: "routine",
    medicationReference: {
      reference: `Medication/${medicationId}`,
      display: data.namaObat
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    authoredOn: new Date().toISOString(),
    requester: {
      reference: `Practitioner/${data.dokterIhs}`,
      display: data.dokterName
    },
    dosageInstruction: [
      {
        sequence: 1,
        text: data.aturanPakai // Aturan pakai naratif, misal "3 x 1 Tablet sesudah makan"
      }
    ],
    dispenseRequest: {
      dispenseInterval: {
        value: 1,
        unit: "days",
        system: "http://unitsofmeasure.org",
        code: "d"
      },
      validityPeriod: {
        start: new Date().toISOString(),
        end: new Date(new Date().getTime() + 30*24*60*60*1000).toISOString() // Valid 30 hari
      },
      numberOfRepeatsAllowed: 0,
      quantity: {
        value: data.jumlah, // Jumlah obat yang diberikan
        unit: "TAB", // Default, sebaiknya dinamis dari sediaan
        system: "http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm",
        code: "TAB"
      },
      expectedSupplyDuration: {
        value: 30, // Estimasi durasi 30 hari
        unit: "days",
        system: "http://unitsofmeasure.org",
        code: "d"
      }
    }
  };
};

module.exports = { buildMedicationPayload, buildMedicationRequestPayload };
