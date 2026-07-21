const prisma = require('../config/prisma');

/**
 * Get all Kunjungan with status MENUNGGU for Screening
 */
const getKunjunganScreening = async (user) => {
  const whereClause = {
    statusKunjungan: 'MENUNGGU',
  };

  // Filter isolasi data: Perawat hanya melihat antrian di Polinya
  if (user && user.role === 'PERAWAT' && user.poliklinikId) {
    whereClause.poliklinikId = user.poliklinikId;
  }

  const kunjungans = await prisma.kunjungan.findMany({
    where: whereClause,
    include: {
      pasien: true,
      poliklinik: true,
      dokterTujuan: {
        select: {
          id: true,
          username: true,
          namaLengkap: true,
          role: true,
        }
      }
    },
    orderBy: [
      { tanggalRegistrasi: 'asc' },
      { jamRegistrasi: 'asc' },
    ],
  });

  return kunjungans;
};

/**
 * Panggil Kunjungan (Status Locking)
 */
const panggilKunjungan = async (kunjunganId, petugasId) => {
  // Gunakan transaction untuk locking
  return await prisma.$transaction(async (tx) => {
    const kunjungan = await tx.kunjungan.findUnique({
      where: { id: kunjunganId },
    });

    if (!kunjungan) {
      const err = new Error('Data Kunjungan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (kunjungan.statusKunjungan !== 'MENUNGGU') {
      const err = new Error('Maaf, pasien ini sudah dipanggil oleh perawat lain atau sudah diproses.');
      err.statusCode = 400;
      throw err;
    }

    // Lock status menjadi DIPROSES_SCREENING
    const updated = await tx.kunjungan.update({
      where: { id: kunjunganId },
      data: {
        statusKunjungan: 'DIPROSES_SCREENING',
        // Idealnya kita bisa menyimpan petugasScreeningId ke Kunjungan, tapi karena belum ada di schema,
        // kita cukup ganti status saja untuk me-lock antrean.
      },
    });

    return updated;
  });
};

const getKunjunganById = async (id) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id },
    include: {
      pasien: true,
      poliklinik: true,
      dokterTujuan: {
        select: { id: true, namaLengkap: true, username: true }
      }
    },
  });
  if (!kunjungan) {
    const err = new Error('Data Kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return kunjungan;
};

const getKunjunganFhirPreview = async (id) => {
  const kunjungan = await prisma.kunjungan.findUnique({
    where: { id },
    include: {
      pasien: {
        include: {
          alamat: true,
        }
      },
      poliklinik: true,
      dokterTujuan: {
        select: { id: true, namaLengkap: true, username: true }
      },
      screening: true,
      diagnosis: {
        include: {
          icd10: true
        }
      },
      tindakans: {
        include: {
          icd9: true
        }
      },
      resep: {
        include: {
          details: {
            include: {
              obat: true
            }
          }
        }
      }
    }
  });

  if (!kunjungan) {
    const err = new Error('Data Kunjungan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const { pasien, screening, diagnosis, tindakans, resep, poliklinik, dokterTujuan } = kunjungan;
  
  // Construct FHIR Bundle
  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: []
  };

  // 1. Patient Resource
  const patientResource = {
    resourceType: "Patient",
    id: pasien.noIHS || pasien.id,
    identifier: [
      {
        use: "official",
        system: "https://fhir.kemkes.go.id/id/nik",
        value: pasien.nik
      }
    ],
    name: [
      {
        use: "official",
        text: pasien.namaLengkap
      }
    ],
    gender: pasien.jenisKelamin === 'Laki-laki' ? 'male' : 'female',
    birthDate: pasien.tanggalLahir ? new Date(pasien.tanggalLahir).toISOString().split('T')[0] : null
  };
  bundle.entry.push({ resource: patientResource });

  // 2. Encounter Resource
  let encounterStatus = "arrived";
  if (kunjungan.statusKunjungan === 'DIPERIKSA') encounterStatus = "in-progress";
  else if (kunjungan.statusKunjungan === 'SELESAI') encounterStatus = "finished";
  else if (kunjungan.statusKunjungan === 'BATAL') encounterStatus = "cancelled";

  const encounterResource = {
    resourceType: "Encounter",
    id: kunjungan.id,
    status: encounterStatus,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: kunjungan.jenisPelayanan === 'Rawat Inap' ? 'IMP' : (kunjungan.jenisPelayanan === 'IGD' ? 'EMER' : 'AMB'),
      display: kunjungan.jenisPelayanan === 'Rawat Inap' ? 'inpatient encounter' : (kunjungan.jenisPelayanan === 'IGD' ? 'emergency encounter' : 'ambulatory')
    },
    subject: {
      reference: `Patient/${pasien.noIHS || pasien.id}`,
      display: pasien.namaLengkap
    },
    period: {
      start: new Date(kunjungan.tanggalRegistrasi).toISOString()
    },
    location: [
      {
        location: {
          display: poliklinik?.namaPoli || "Poli Umum"
        }
      }
    ]
  };
  if (dokterTujuan) {
    encounterResource.participant = [
      {
        type: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                code: "PPRF",
                display: "primary performer"
              }
            ]
          }
        ],
        individual: {
          display: dokterTujuan.namaLengkap || dokterTujuan.username
        }
      }
    ];
  }
  bundle.entry.push({ resource: encounterResource });

  // 3. Observation Resource (Vital Signs dari Screening)
  if (screening) {
    const observationComponents = [];
    
    if (screening.tekananDarahSistolik !== null && screening.tekananDarahDiastolik !== null) {
      observationComponents.push(
        {
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8480-6",
                display: "Systolic blood pressure"
              }
            ]
          },
          valueQuantity: {
            value: screening.tekananDarahSistolik,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]"
          }
        },
        {
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "8462-4",
                display: "Diastolic blood pressure"
              }
            ]
          },
          valueQuantity: {
            value: screening.tekananDarahDiastolik,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]"
          }
        }
      );
    }

    if (screening.suhuTubuh !== null) {
      observationComponents.push({
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8310-5",
              display: "Body temperature"
            }
          ]
        },
        valueQuantity: {
          value: screening.suhuTubuh,
          unit: "C",
          system: "http://unitsofmeasure.org",
          code: "Cel"
        }
      });
    }

    if (screening.nadi !== null) {
      observationComponents.push({
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8867-4",
              display: "Heart rate"
            }
          ]
        },
        valueQuantity: {
          value: screening.nadi,
          unit: "beats/minute",
          system: "http://unitsofmeasure.org",
          code: "/min"
        }
      });
    }

    if (observationComponents.length > 0) {
      const observationResource = {
        resourceType: "Observation",
        id: `obs-${screening.id}`,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs"
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "85354-9",
              display: "Blood pressure panel with all children optional"
            }
          ]
        },
        subject: {
          reference: `Patient/${pasien.noIHS || pasien.id}`,
          display: pasien.namaLengkap
        },
        encounter: {
          reference: `Encounter/${kunjungan.id}`
        },
        effectiveDateTime: new Date(screening.tanggalScreening).toISOString(),
        component: observationComponents
      };
      bundle.entry.push({ resource: observationResource });
    }
  }

  // 4. Condition Resource (Diagnosa)
  if (diagnosis && diagnosis.length > 0) {
    for (const d of diagnosis) {
      if (d.icd10) {
        const conditionResource = {
          resourceType: "Condition",
          id: `cond-${d.id}`,
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                code: "active"
              }
            ]
          },
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/condition-category",
                  code: "encounter-diagnosis",
                  display: "Encounter Diagnosis"
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: d.icd10.kode_icd10,
                display: d.icd10.nama_diagnosis
              }
            ]
          },
          subject: {
            reference: `Patient/${pasien.noIHS || pasien.id}`,
            display: pasien.namaLengkap
          },
          encounter: {
            reference: `Encounter/${kunjungan.id}`
          }
        };
        bundle.entry.push({ resource: conditionResource });
      }
    }
  }

  // 5. Procedure Resource (Tindakan)
  if (tindakans && tindakans.length > 0) {
    for (const t of tindakans) {
      if (t.icd9) {
        const procedureResource = {
          resourceType: "Procedure",
          id: `proc-${t.id}`,
          status: "completed",
          code: {
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-9",
                code: t.icd9.kode_icd9,
                display: t.icd9.nama_prosedur
              }
            ]
          },
          subject: {
            reference: `Patient/${pasien.noIHS || pasien.id}`,
            display: pasien.namaLengkap
          },
          encounter: {
            reference: `Encounter/${kunjungan.id}`
          },
          performedDateTime: new Date(t.waktuTindakan).toISOString()
        };
        bundle.entry.push({ resource: procedureResource });
      }
    }
  }

  // 6. MedicationRequest Resource (Resep)
  if (resep && resep.length > 0) {
    for (const r of resep) {
      if (r.details) {
        for (const detail of r.details) {
          if (detail.obat) {
            const medicationRequestResource = {
              resourceType: "MedicationRequest",
              id: `medreq-${detail.id}`,
              status: r.status === 'SELESAI' ? 'completed' : 'active',
              intent: "order",
              medicationCodeableConcept: {
                coding: [
                  {
                    system: "https://fhir.kemkes.go.id/id/medication",
                    code: detail.obat.kodeObat,
                    display: detail.obat.namaObat
                  }
                ]
              },
              subject: {
                reference: `Patient/${pasien.noIHS || pasien.id}`,
                display: pasien.namaLengkap
              },
              encounter: {
                reference: `Encounter/${kunjungan.id}`
              },
              authoredOn: new Date(r.tanggalResep).toISOString(),
              dosageInstruction: [
                {
                  text: detail.aturanPakai,
                  additionalInstruction: detail.catatan ? [
                    {
                      text: detail.catatan
                    }
                  ] : undefined
                }
              ],
              dispenseRequest: {
                quantity: {
                  value: detail.jumlah,
                  unit: detail.obat.sediaan || "Pcs"
                }
              }
            };
            bundle.entry.push({ resource: medicationRequestResource });
          }
        }
      }
    }
  }

  return bundle;
};

module.exports = {
  getKunjunganScreening,
  panggilKunjungan,
  getKunjunganById,
  getKunjunganFhirPreview,
};
