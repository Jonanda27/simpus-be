const buildQuestionnaireResponsePayload = (data) => {
  return {
    resourceType: "QuestionnaireResponse",
    status: "completed",
    questionnaire: "https://fhir.kemkes.go.id/Questionnaire/Q0001",
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    author: {
      reference: `Practitioner/${data.practitionerIhs}`,
      display: data.practitionerName || "Apoteker"
    },
    authored: data.authoredOn || new Date().toISOString(),
    item: [
      {
        linkId: "1",
        text: "Persyaratan Administrasi",
        item: [
          {
            linkId: "1.1",
            text: "Nama, umur, jenis kelamin, BB/TB Pasien",
            answer: [{ valueBoolean: data.adminPasienValid ?? true }]
          },
          {
            linkId: "1.2",
            text: "Nama, SIP, Alamat Dokter",
            answer: [{ valueBoolean: data.adminDokterValid ?? true }]
          },
          {
            linkId: "1.3",
            text: "Tanggal Resep",
            answer: [{ valueBoolean: true }]
          }
        ]
      },
      {
        linkId: "2",
        text: "Persyaratan Farmasetik",
        item: [
          {
            linkId: "2.1",
            text: "Nama obat, bentuk dan kekuatan sediaan",
            answer: [{ valueBoolean: data.farmasetikSediaanValid ?? true }]
          },
          {
            linkId: "2.2",
            text: "Dosis dan jumlah obat",
            answer: [{ valueBoolean: data.farmasetikDosisValid ?? true }]
          },
          {
            linkId: "2.3",
            text: "Aturan dan cara penggunaan",
            answer: [{ valueBoolean: data.farmasetikSignaValid ?? true }]
          }
        ]
      },
      {
        linkId: "3",
        text: "Persyaratan Klinis",
        item: [
          {
            linkId: "3.1",
            text: "Ketepatan indikasi, dosis, dan waktu penggunaan",
            answer: [{ valueBoolean: data.klinisIndikasiValid ?? true }]
          },
          {
            linkId: "3.2",
            text: "Duplikasi pengobatan",
            answer: [{ valueBoolean: data.klinisDuplikasiValid ?? false }]
          },
          {
            linkId: "3.3",
            text: "Alergi dan Reaksi Obat yang Tidak Dikehendaki (ROTD)",
            answer: [{ valueBoolean: data.klinisAlergiValid ?? false }]
          },
          {
            linkId: "3.4",
            text: "Kontraindikasi",
            answer: [{ valueBoolean: data.klinisKontraindikasiValid ?? false }]
          },
          {
            linkId: "3.5",
            text: "Interaksi obat",
            answer: [{ valueBoolean: data.klinisInteraksiValid ?? false }]
          }
        ]
      }
    ]
  };
};

module.exports = { buildQuestionnaireResponsePayload };
