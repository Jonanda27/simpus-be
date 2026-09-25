<<<<<<< HEAD
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
=======
/**
 * FHIR R4 FamilyMemberHistory Mapper
 */
const buildFamilyMemberHistoryPayload = (data) => {
  const relMap = {
    'Orang Tua': { code: 'FTH', display: 'father' },
    'Ayah': { code: 'FTH', display: 'father' },
    'Ibu': { code: 'MTH', display: 'mother' },
    'Saudara': { code: 'SIB', display: 'sibling' },
    'Kakek/Nenek': { code: 'GRPRN', display: 'grandparent' },
    'Keluarga': { code: 'FAMMEMB', display: 'family member' }
  };

  const rel = relMap[data.hubungan] || { code: 'FAMMEMB', display: 'family member' };

  return {
    resourceType: "FamilyMemberHistory",
    status: "completed",
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
    patient: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
<<<<<<< HEAD
=======
    date: new Date().toISOString(),
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
    relationship: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
<<<<<<< HEAD
          code: data.hubunganKode || "FAMMEMB",
          display: data.hubunganNama || "Family member"
        }
      ]
    },
    ...(data.deceasedBoolean !== undefined && { deceasedBoolean: Boolean(data.deceasedBoolean) }),
    condition: [conditionItem]
=======
          code: rel.code,
          display: rel.display
        }
      ]
    },
    condition: [
      {
        code: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: data.kodeSnomed || "160303001",
              display: data.namaPenyakit || "Family history of medical condition"
            }
          ],
          text: data.namaPenyakit || "Family history of medical condition"
        }
      }
    ]
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
  };
};

module.exports = { buildFamilyMemberHistoryPayload };
