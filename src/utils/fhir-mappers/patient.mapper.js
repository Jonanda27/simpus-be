/**
 * FHIR R4 Patient Mapper for Patient demographics serialization
 */
const buildPatientPayload = (pasien, orgId) => {
  const birthDate = pasien.tanggalLahir 
    ? new Date(pasien.tanggalLahir).toISOString().split('T')[0] 
    : undefined;

  const identifiers = [
    {
      use: "official",
      system: "https://fhir.kemkes.go.id/id/nik",
      value: pasien.nik
    },
    {
      use: "official",
      system: `http://sys-ids.kemkes.go.id/mr-number/${orgId}`,
      value: pasien.noRM
    }
  ];

  if (pasien.noIHS) {
    identifiers.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/ihs-number",
      value: pasien.noIHS
    });
  }

  if (pasien.noPaspor) {
    identifiers.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/paspor",
      value: pasien.noPaspor
    });
  }

  const genderMap = {
    'L': 'male',
    'P': 'female',
    'LAKI_LAKI': 'male',
    'PEREMPUAN': 'female',
    'MALE': 'male',
    'FEMALE': 'female'
  };

  return {
    resourceType: "Patient",
    identifier: identifiers,
    active: true,
    name: [
      {
        use: "official",
        text: pasien.namaLengkap
      }
    ],
    gender: genderMap[pasien.jenisKelamin?.toUpperCase()] || "unknown",
    birthDate: birthDate,
    ...(pasien.tempatLahir && {
      extension: [
        {
          url: "https://fhir.kemkes.go.id/r4/StructureDefinition/birthPlace",
          valueAddress: {
            city: pasien.tempatLahir
          }
        }
      ]
    }),
    ...(pasien.alamat && {
      address: [
        {
          use: "home",
          line: [pasien.alamat.alamatDomisili || pasien.alamat.alamatKtp],
          city: pasien.alamat.kabupatenKota,
          district: pasien.alamat.kecamatan,
          postalCode: pasien.alamat.kodePos,
          country: pasien.kewarganegaraan || "ID"
        }
      ]
    }),
    ...(pasien.kontak?.noHp && {
      telecom: [
        {
          system: "phone",
          value: pasien.kontak.noHp,
          use: "mobile"
        }
      ]
    }),
    ...(pasien.namaIbuKandung && {
      contact: [
        {
          relationship: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                  code: "N",
                  display: "Next-of-Kin"
                }
              ]
            }
          ],
          name: {
            use: "official",
            text: pasien.namaIbuKandung
          }
        }
      ]
    }),
    communication: [
      {
        language: {
          coding: [
            {
              system: "urn:ietf:bcp:47",
              code: pasien.bahasa || "id",
              display: "Indonesian"
            }
          ]
        },
        preferred: true
      }
    ]
  };
};

module.exports = { buildPatientPayload };
