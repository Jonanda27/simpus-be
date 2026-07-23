const buildFamilyMemberHistoryPayload = (data) => {
  return {
    resourceType: "FamilyMemberHistory",
    status: "completed",
    patient: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    relationship: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
          code: data.hubunganKode || "FAMMEMB",
          display: data.hubunganNama || "family member"
        }
      ]
    },
    condition: [
      {
        code: {
          coding: [
            {
              system: "http://hl7.org/fhir/sid/icd-10",
              code: data.icd10Kode || "Z82.9",
              display: data.icd10Nama || data.catatanRiwayat || "Riwayat penyakit keluarga"
            }
          ]
        },
        note: data.catatanRiwayat ? [{ text: data.catatanRiwayat }] : undefined
      }
    ]
  };
};

module.exports = { buildFamilyMemberHistoryPayload };
