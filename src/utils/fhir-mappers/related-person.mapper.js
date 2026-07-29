/**
 * FHIR R4 RelatedPerson Mapper for SATUSEHAT (POST /RelatedPerson)
 * Establishes relationship between Baby and Mother
 */
const buildRelatedPersonPayload = (data, bayiIhs, ibuIhs) => {
  const payload = {
    resourceType: "RelatedPerson",
    meta: {
      profile: ["https://fhir.kemkes.go.id/r4/StructureDefinition/RelatedPerson"]
    },
    patient: {
      reference: `Patient/${bayiIhs}`,
      display: data.namaLengkap || data.nama
    },
    relationship: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
            code: "MTH",
            display: "mother"
          }
        ]
      }
    ],
    name: [
      {
        use: "official",
        text: data.namaIbu
      }
    ],
    gender: "female"
  };

  if (ibuIhs) {
    payload.identifier = [
      {
        use: "official",
        system: "https://fhir.kemkes.go.id/id/ihs-number",
        value: ibuIhs
      }
    ];
  }

  return payload;
};

module.exports = {
  buildRelatedPersonPayload
};
