const buildFamilyMemberHistoryPayload = (data) => {
  const codeSystem = data.snomedCode ? "http://snomed.info/sct" : (data.codeSystem || "http://hl7.org/fhir/sid/icd-10");
  const codeVal = data.snomedCode || data.icd10Kode || "Z82.9";
  const displayVal = data.snomedDisplay || data.icd10Nama || data.catatanRiwayat || "Family history finding";

  const conditionItem = {
    code: {
      coding: [
        {
          system: codeSystem,
          code: codeVal,
          display: displayVal
        }
      ]
    },
    ...(data.outcomeSnomedCode && {
      outcome: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: data.outcomeSnomedCode,
            display: data.outcomeSnomedDisplay || "Patient condition finding"
          }
        ]
      }
    }),
    ...(data.contributedToDeath !== undefined && { contributedToDeath: Boolean(data.contributedToDeath) }),
    ...(data.onset && { onsetString: String(data.onset) }),
    note: data.catatanRiwayat ? [{ text: data.catatanRiwayat }] : undefined
  };

  return {
    resourceType: "FamilyMemberHistory",
    status: data.status || "completed",
    patient: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    relationship: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
          code: data.hubunganKode || "FAMMEMB",
          display: data.hubunganNama || "Family member"
        }
      ]
    },
    ...(data.deceasedBoolean !== undefined && { deceasedBoolean: Boolean(data.deceasedBoolean) }),
    condition: [conditionItem]
  };
};

module.exports = { buildFamilyMemberHistoryPayload };
