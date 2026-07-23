const buildMedicationStatementPayload = (data) => {
  return {
    resourceType: "MedicationStatement",
    status: data.status || "active",
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    context: data.encounterId ? {
      reference: `Encounter/${data.encounterId}`
    } : undefined,
    medicationCodeableConcept: {
      coding: [
        {
          system: "https://fhir.kemkes.go.id/id/kfa",
          code: data.kodeKfa || data.kodeObat || "93000001",
          display: data.namaObat || "Riwayat Obat"
        }
      ]
    },
    note: data.catatan ? [
      {
        text: data.catatan
      }
    ] : undefined
  };
};

module.exports = { buildMedicationStatementPayload };
