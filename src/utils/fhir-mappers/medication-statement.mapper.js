const buildMedicationStatementPayload = (data) => {
  const kfaSystem = data.system || (data.isBrandProduct ? "http://sys-ids.kemkes.go.id/kfa" : "https://fhir.kemkes.go.id/id/kfa");

  return {
    resourceType: "MedicationStatement",
    status: data.status || "active",
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
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
  };
};

module.exports = { buildMedicationStatementPayload };
