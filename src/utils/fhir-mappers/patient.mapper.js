/**
 * Mapper untuk payload pendaftaran Pasien ke SATUSEHAT (POST /Patient)
 */
const buildPatientPayload = (data) => {
  // Format jenis kelamin (male / female / other / unknown)
  let gender = "unknown";
  if (data.jenisKelamin) {
    const jk = data.jenisKelamin.toLowerCase();
    if (jk === "laki-laki" || jk === "l" || jk === "male") gender = "male";
    else if (jk === "perempuan" || jk === "p" || jk === "female") gender = "female";
  }

  // Format tanggal lahir (YYYY-MM-DD)
  const birthDate = data.tanggalLahir ? new Date(data.tanggalLahir).toISOString().split('T')[0] : null;

  // Format marital status (opsional)
  let maritalStatusCode = "U";
  let maritalStatusDisplay = "unmarried";
  if (data.statusPerkawinan) {
    const st = data.statusPerkawinan.toLowerCase();
    if (st === "belum kawin") {
      maritalStatusCode = "U";
      maritalStatusDisplay = "unmarried";
    } else if (st.includes("cerai mati")) {
      maritalStatusCode = "W";
      maritalStatusDisplay = "widowed";
    } else if (st.includes("cerai")) {
      maritalStatusCode = "D";
      maritalStatusDisplay = "divorced";
    } else if (st.includes("kawin") || st.includes("menikah")) {
      maritalStatusCode = "M";
      maritalStatusDisplay = "Married";
    }
  }

  // Siapkan identifier NIK, NIK Ibu (jika bayi), dan KK
  const identifier = [];
  
  if (data.isBayi && data.nikIbu) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/nik-ibu",
      value: data.nikIbu
    });
  } else if (data.nik) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/nik",
      value: data.nik
    });
  }

  if (data.noKk) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/kk",
      value: data.noKk
    });
  }

  // Gabungkan alamat jika ada RT/RW, Desa dll (Standard sederhana tanpa kode kemendagri)
  let addressLine = data.alamatKtp || "";
  if (data.rtRw) addressLine += ` RT/RW ${data.rtRw}`;
  if (data.desaKelurahan) addressLine += ` Kel. ${data.desaKelurahan}`;
  if (data.kecamatan) addressLine += ` Kec. ${data.kecamatan}`;

  // Build telecom array dynamically
  const telecom = [];
  const phoneValue = data.noHp || data.kontakDarurat;
  if (phoneValue && phoneValue !== '-') {
    telecom.push({
      system: "phone",
      value: phoneValue,
      use: "mobile"
    });
  }

  // Build address object dynamically
  const addressObj = {
    use: "home",
    country: "ID"
  };

  if (addressLine) addressObj.line = [addressLine];
  if (data.kabupatenKota) addressObj.city = data.kabupatenKota;
  if (data.provinsi) addressObj.state = data.provinsi;
  if (data.kodePos) addressObj.postalCode = data.kodePos;

  // Include administrativeCode extension only if Kemendagri codes are provided
  if (data.kodeProvinsi && data.kodeKabupaten && data.kodeKecamatan && data.kodeDesa) {
    addressObj.extension = [
      {
        url: "https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode",
        extension: [
          { url: "province", valueCode: data.kodeProvinsi },
          { url: "city", valueCode: data.kodeKabupaten },
          { url: "district", valueCode: data.kodeKecamatan.substring(0, 6) },
          { url: "village", valueCode: data.kodeDesa.length > 10 ? data.kodeDesa.substring(0, 10) : data.kodeDesa },
          { url: "rt", valueCode: data.rt || "001" },
          { url: "rw", valueCode: data.rw || "001" }
        ]
      }
    ];
  }

  // Tambahkan kontak Ibu jika bayi
  let contact = undefined;
  if (data.isBayi && data.namaIbu) {
    contact = [
      {
        relationship: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                code: "N"
              }
            ]
          }
        ],
        name: {
          use: "official",
          text: data.namaIbu
        }
      }
    ];
  }

  const payload = {
    resourceType: "Patient",
    meta: {
      profile: [
        "https://fhir.kemkes.go.id/r4/StructureDefinition/Patient"
      ]
    },
    identifier: identifier,
    active: true,
    name: [
      {
        use: "official",
        text: data.namaLengkap
      }
    ],
    contact: contact,
    telecom: telecom.length > 0 ? telecom : undefined,
    gender: gender,
    birthDate: birthDate,
    multipleBirthInteger: data.multipleBirthInteger || 0,
    address: [addressObj],
    maritalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
          code: maritalStatusCode,
          display: maritalStatusDisplay
        }
      ],
      text: data.statusPerkawinan || maritalStatusDisplay
    }
  };

  return payload;
};

module.exports = { buildPatientPayload };
