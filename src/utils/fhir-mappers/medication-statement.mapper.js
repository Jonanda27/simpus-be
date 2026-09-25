<<<<<<< HEAD
const buildMedicationStatementPayload = (data) => {
  const kfaSystem = data.system || (data.isBrandProduct ? "http://sys-ids.kemkes.go.id/kfa" : "https://fhir.kemkes.go.id/id/kfa");

  return {
    resourceType: "MedicationStatement",
    status: data.status || "active",
=======
/**
 * FHIR R4 MedicationStatement Mapper for Riwayat Pengobatan Pasien
 */
const buildMedicationStatementPayload = (data) => {
  return {
    resourceType: "MedicationStatement",
    status: data.status || "active",
    category: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/medication-statement-category",
          code: "community",
          display: "Community"
        }
      ]
    },
    medicationCodeableConcept: {
      coding: [
        {
          system: "http://sys-ids.kemkes.go.id/kfa",
          code: data.kodeKfa || "93001017",
          display: data.namaObat || "Obat Riwayat Pasien"
        }
      ],
      text: data.namaObat || "Obat Riwayat Pasien"
    },
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
<<<<<<< HEAD
    ...(data.encounterId && {
      context: {
        reference: `Encounter/${data.encounterId}`
      }
    }),
    medicationCodeableConcept: {
      coding: [
        {
          system: kfaSystem,
          code: data.kodeKfa || data.kodeObat || "93000001",
          display: data.namaObat || "Riwayat Obat"
        }
      ]
    },
    note: (data.note || data.catatan) ? [
      {
        text: data.note || data.catatan
      }
    ] : undefined
=======
    context: {
      reference: data.encounterRef || `Encounter/${data.encounterId}`
    },
    informationSource: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    dateAsserted: new Date().toISOString(),
    ...(data.catatan && {
      note: [
        {
          text: data.catatan
        }
      ]
    })
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
  };
};

module.exports = { buildMedicationStatementPayload };
