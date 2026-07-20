/**
 * Membangun payload JSON FHIR untuk resource AllergyIntolerance.
 * @param {Object} orgIhs - ID Organisasi SATUSEHAT (misal dari env)
 * @param {Object} pasien - Data Pasien lengkap dari DB (untuk ambil noIHS)
 * @param {Object} dokter - Data Dokter lengkap dari DB (untuk ambil noIHS)
 * @param {Object} kunjungan - Data Kunjungan (untuk ambil encounterId)
 * @param {Object} alergiPasien - Data transaksional Alergi (termasuk relasi alergiMaster)
 * @returns {Object} JSON payload AllergyIntolerance FHIR
 */
const buildAllergyPayload = (orgIhs, pasien, dokter, kunjungan, alergiPasien) => {
  if (!pasien?.noIHS) throw new Error("Pasien belum memiliki IHS Number");
  if (!kunjungan?.encounterId) throw new Error("Kunjungan belum disinkronkan ke SATUSEHAT (Encounter ID kosong)");
  if (!dokter?.tenagaMedis?.noIHS) throw new Error("Dokter belum memiliki IHS Number");

  const today = new Date().toISOString(); // Default to recordedDate

  // Format: "Patient/{ihs-number}"
  const patientReference = `Patient/${pasien.noIHS}`;
  const encounterReference = `Encounter/${kunjungan.encounterId}`;
  const practitionerReference = `Practitioner/${dokter.tenagaMedis.noIHS}`;

  return {
    "resourceType": "AllergyIntolerance",
    "identifier": [
      {
        "system": `http://sys-ids.kemkes.go.id/allergy/${orgIhs}`,
        "use": "official",
        "value": alergiPasien.id
      }
    ],
    "clinicalStatus": {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
          "code": alergiPasien.statusKlinis || "active",
          "display": (alergiPasien.statusKlinis === "active") ? "Active" : "Inactive"
        }
      ]
    },
    "verificationStatus": {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
          "code": "unconfirmed",
          "display": "Unconfirmed"
        }
      ]
    },
    "type": "allergy",
    "category": [
      alergiPasien.alergiMaster.kategori // "food", "medication", "environment", "biologic"
    ],
    "criticality": alergiPasien.tingkatKeparahan || "low",
    "code": {
      "coding": [
        {
          "system": alergiPasien.alergiMaster.kategori === 'medication' ? "http://sys-ids.kemkes.go.id/kfa" : "http://snomed.info/sct",
          "code": alergiPasien.alergiMaster.kode_snomed,
          "display": alergiPasien.alergiMaster.nama_alergi
        }
      ],
      "text": alergiPasien.alergiMaster.nama_alergi
    },
    "patient": {
      "reference": patientReference,
      "display": pasien.namaLengkap
    },
    "encounter": {
      "reference": encounterReference
    },
    "recordedDate": alergiPasien.createdAt ? new Date(alergiPasien.createdAt).toISOString() : today,
    "recorder": {
      "reference": practitionerReference,
      "display": dokter.nama
    },
    "reaction": [
      {
        "manifestation": [
          {
            "coding": [
              {
                "system": "http://snomed.info/sct",
                "code": alergiPasien.manifestasiKode,
                "display": alergiPasien.manifestasiNama
              }
            ],
            "text": alergiPasien.manifestasiNama
          }
        ],
        "severity": alergiPasien.tingkatKeparahan === 'high' ? 'severe' : 'mild'
      }
    ]
  };
};

module.exports = {
  buildAllergyPayload
};
