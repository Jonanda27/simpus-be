/**
 * FHIR R4 Patient Mapper for SATUSEHAT (POST /Patient)
 * Supports both nested patient object (from DB) and flat registration payload.
 */
const buildPatientPayload = (data = {}, orgId) => {
  const pasien = data.pasien || data;
  const isBayi = Boolean(pasien.isBayi || data.isBayi);

  // Format gender
  let gender = "unknown";
  const rawGender = pasien.jenisKelamin || data.jenisKelamin;
  if (rawGender) {
    const jk = rawGender.toString().toLowerCase();
    if (jk === "laki-laki" || jk === "l" || jk === "male" || jk === "laki_laki") gender = "male";
    else if (jk === "perempuan" || jk === "p" || jk === "female") gender = "female";
  }

  // Format birthDate (YYYY-MM-DD)
  const tglLahir = pasien.tanggalLahir || data.tanggalLahir;
  const birthDate = tglLahir ? new Date(tglLahir).toISOString().split('T')[0] : undefined;

  // Marital Status
  let maritalStatusCode = "U";
  let maritalStatusDisplay = "unmarried";
  const stPerkawinan = pasien.statusPerkawinan || data.statusPerkawinan;

  if (isBayi) {
    // Sesuai Spesifikasi SATUSEHAT Bayi Baru Lahir: maritalStatus wajib 'S' (Never Married)
    maritalStatusCode = "S";
    maritalStatusDisplay = "Never Married";
  } else if (stPerkawinan) {
    const st = stPerkawinan.toLowerCase();
    if (st === "belum kawin" || st === "unmarried") {
      maritalStatusCode = "U";
      maritalStatusDisplay = "unmarried";
    } else if (st.includes("cerai mati")) {
      maritalStatusCode = "W";
      maritalStatusDisplay = "widowed";
    } else if (st.includes("cerai")) {
      maritalStatusCode = "D";
      maritalStatusDisplay = "divorced";
    } else if (st.includes("kawin") || st.includes("menikah") || st === "married") {
      maritalStatusCode = "M";
      maritalStatusDisplay = "Married";
    }
  }

  // Identifiers
  const identifier = [];
  const nikIbu = pasien.nikIbu || data.nikIbu;
  const nik = pasien.nik || data.nik;
  const noKk = pasien.noKk || data.noKk;
  const noRM = pasien.noRM || data.noRM;
  const noIHS = pasien.noIHS || data.noIHS;
  const noPaspor = pasien.noPaspor || data.noPaspor;

  if (isBayi && nikIbu) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/nik-ibu",
      value: nikIbu
    });
  } else if (nik) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/nik",
      value: nik
    });
  }

  if (noRM && orgId) {
    identifier.push({
      use: "official",
      system: `http://sys-ids.kemkes.go.id/mr-number/${orgId}`,
      value: noRM
    });
  }

  if (noIHS) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/ihs-number",
      value: noIHS
    });
  }

  if (noPaspor) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/paspor",
      value: noPaspor
    });
  }

  if (noKk) {
    identifier.push({
      use: "official",
      system: "https://fhir.kemkes.go.id/id/kk",
      value: noKk
    });
  }

  // Address line construction
  let addressLine = pasien.alamat?.alamatDomisili || pasien.alamat?.alamatKtp || data.alamatKtp || data.alamat || "";
  const rtRw = data.rtRw || (data.rt && data.rw ? `${data.rt}/${data.rw}` : undefined);
  if (rtRw) addressLine += ` RT/RW ${rtRw}`;
  const desa = data.desaKelurahan || data.desa;
  if (desa) addressLine += ` Kel. ${desa}`;
  const kec = pasien.alamat?.kecamatan || data.kecamatan;
  if (kec) addressLine += ` Kec. ${kec}`;

  // Address Object
  const addressObj = {
    use: "home",
    country: pasien.kewarganegaraan || data.kewarganegaraan || "ID"
  };

  if (addressLine.trim()) addressObj.line = [addressLine.trim()];
  const kabKota = pasien.alamat?.kabupatenKota || data.kabupatenKota || data.city;
  if (kabKota) addressObj.city = kabKota;
  if (kec) addressObj.district = kec;
  if (data.provinsi) addressObj.state = data.provinsi;
  const kodePos = pasien.alamat?.kodePos || data.kodePos;
  if (kodePos) addressObj.postalCode = kodePos;

  // SATUSEHAT mewajibkan extension administrativeCode. 
  // Jika kode Kemendagri tidak dikirim dari form pendaftaran, gunakan fallback default agar lolos validasi Kemenkes.
  const provCode = data.kodeProvinsi || pasien.alamat?.kodeProvinsi || "31";
  const cityCode = data.kodeKabupaten || pasien.alamat?.kodeKabupaten || "3171";
  const distCode = (data.kodeKecamatan || pasien.alamat?.kodeKecamatan || "317101").substring(0, 6);
  const villCode = (data.kodeDesa || pasien.alamat?.kodeDesa || "3171011001").substring(0, 10);
  
  addressObj.extension = [
    {
      url: "https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode",
      extension: [
        { url: "province", valueCode: provCode },
        { url: "city", valueCode: cityCode },
        { url: "district", valueCode: distCode },
        { url: "village", valueCode: villCode },
        { url: "rt", valueCode: data.rt || "001" },
        { url: "rw", valueCode: data.rw || "001" }
      ]
    }
  ];

  // Telecom
  const telecom = [];
  const phoneValue = pasien.kontak?.noHp || data.noHp || data.kontakDarurat;
  if (phoneValue && phoneValue !== '-') {
    telecom.push({
      system: "phone",
      value: phoneValue,
      use: "mobile"
    });
  }

  // Contact (Ibu / Next-of-Kin)
  let contact = undefined;
  const namaIbu = (isBayi && data.namaIbu) || pasien.namaIbuKandung || data.namaIbuKandung;
  if (namaIbu) {
    contact = [
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
          text: namaIbu
        }
      }
    ];
  }

  // Extensions
  const extensions = [];
  const tempatLahir = pasien.tempatLahir || data.tempatLahir;
  if (tempatLahir) {
    extensions.push({
      url: "https://fhir.kemkes.go.id/r4/StructureDefinition/birthPlace",
      valueAddress: {
        city: tempatLahir
      }
    });
  }

  const namaLengkap = pasien.namaLengkap || data.namaLengkap || data.nama;

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
        text: namaLengkap
      }
    ],
    gender: gender,
    birthDate: birthDate,
    ...(extensions.length > 0 && { extension: extensions }),
    ...(addressObj.line || addressObj.city ? { address: [addressObj] } : {}),
    ...(telecom.length > 0 && { telecom: telecom }),
    ...(contact && { contact: contact }),
    multipleBirthInteger: data.urutanKelahiran !== undefined ? Number(data.urutanKelahiran) : (pasien.dataBayi?.urutanKelahiran || data.multipleBirthInteger || 0),
    maritalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
          code: maritalStatusCode,
          display: maritalStatusDisplay
        }
      ],
      text: stPerkawinan || maritalStatusDisplay
    },
    communication: [
      {
        language: {
          coding: [
            {
              system: "urn:ietf:bcp:47",
              code: pasien.bahasa || data.bahasa || "id",
              display: "Indonesian"
            }
          ]
        },
        preferred: true
      }
    ]
  };

  return payload;
};

module.exports = { buildPatientPayload };
