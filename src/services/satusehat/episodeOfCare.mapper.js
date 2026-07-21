/**
 * PURE FABRICATION CLASS
 * Menerjemahkan data RegisterUKM lokal ke dalam 2 format JSON FHIR R4:
 * 1. Condition (Diagnosis Awal)
 * 2. EpisodeOfCare (Pendaftaran Program)
 */

class EpisodeOfCareMapper {

    /**
     * [HELPER] Polymorphic Method untuk menentukan Kode ICD-10 dan Nama berdasarkan Program
     */
    static _getProgramTerminology(kodeProgram, diagnosaAwalLokal) {
        // Jika dokter sudah menginput spesifik ICD-10, kita bisa pakai itu.
        // Jika tidak, kita gunakan fallback standar Kemenkes untuk "The Big 3".

        switch (kodeProgram) {
            case 'TB':
                return {
                    code: diagnosaAwalLokal || 'A15.0',
                    display: 'Tuberkulosis paru, terkonfirmasi secara bakteriologis dan histologis'
                };
            case 'HIV':
                return {
                    code: diagnosaAwalLokal || 'B20',
                    display: 'Penyakit infeksi human immunodeficiency virus [HIV]'
                };
            case 'KIA':
                return {
                    code: diagnosaAwalLokal || 'Z34',
                    display: 'Pengawasan kehamilan normal'
                };
            default:
                throw new Error(`Program ${kodeProgram} belum didukung oleh Mapper EpisodeOfCare.`);
        }
    }

    /**
     * 1. Merakit JSON FHIR untuk resource "Condition"
     * @param {Object} dataLokal - Hasil query prisma.registerUKM
     */
    static toCondition(dataLokal) {
        // Data Integrity Guard
        if (!dataLokal.pasien?.noIHS) {
            throw new Error('INTEGRITY ERROR: Pasien belum memiliki nomor IHS (SatuSehat ID).');
        }

        const term = this._getProgramTerminology(dataLokal.program.kodeProgram, dataLokal.diagnosaAwal);

        return {
            resourceType: "Condition",
            // Status klinis: active (sedang diderita/dijalani)
            clinicalStatus: {
                coding: [
                    {
                        system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        code: "active",
                        display: "Active"
                    }
                ]
            },
            // Kategori: Problem List (Karena ini penyakit kronis / program jangka panjang)
            category: [
                {
                    coding: [
                        {
                            system: "http://terminology.hl7.org/CodeSystem/condition-category",
                            code: "problem-list-item",
                            display: "Problem List Item"
                        }
                    ]
                }
            ],
            // Kode Penyakit (ICD-10)
            code: {
                coding: [
                    {
                        system: "http://hl7.org/fhir/sid/icd-10",
                        code: term.code,
                        display: term.display
                    }
                ]
            },
            // Pasien
            subject: {
                reference: `Patient/${dataLokal.pasien.noIHS}`,
                display: dataLokal.pasien.namaLengkap
            },
            // Waktu pendaftaran program dianggap sebagai onset (mulai dicatat)
            recordedDate: dataLokal.tanggalDaftar.toISOString()
        };
    }

    /**
     * 2. Merakit JSON FHIR untuk resource "EpisodeOfCare"
     * @param {Object} dataLokal - Hasil query prisma.registerUKM
     * @param {String} satusehatConditionId - ID Condition yang didapat setelah POST toCondition()
     */
    static toEpisodeOfCare(dataLokal, satusehatConditionId) {
        // Data Integrity Guard
        if (!dataLokal.pasien?.noIHS) {
            throw new Error('INTEGRITY ERROR: Pasien belum memiliki nomor IHS (SatuSehat ID).');
        }
        if (!process.env.SATUSEHAT_ORG_ID) {
            throw new Error('SYSTEM ERROR: SATUSEHAT_ORG_ID belum di-set di file .env');
        }
        if (!satusehatConditionId) {
            throw new Error('INTEGRITY ERROR: ID Condition dari SATUSEHAT wajib dilampirkan.');
        }

        // Mapping Status Lokal ke Status FHIR EpisodeOfCare
        let fhirStatus = "active";
        if (dataLokal.statusProgram === "SEMBUH" || dataLokal.statusProgram === "MENINGGAL") fhirStatus = "finished";
        if (dataLokal.statusProgram === "PUTUS_OBAT") fhirStatus = "cancelled";
        if (dataLokal.statusProgram === "RUJUK") fhirStatus = "finished";

        return {
            resourceType: "EpisodeOfCare",
            status: fhirStatus,
            statusHistory: [
                {
                    status: fhirStatus,
                    period: {
                        start: dataLokal.tanggalDaftar.toISOString()
                        // end: Jika sudah selesai, tambahkan logic untuk end date di sini
                    }
                }
            ],
            // Pasien yang masuk program
            patient: {
                reference: `Patient/${dataLokal.pasien.noIHS}`,
                display: dataLokal.pasien.namaLengkap
            },
            // Organisasi (Faskes) penyelenggara program
            managingOrganization: {
                reference: `Organization/${process.env.SATUSEHAT_ORG_ID}`
            },
            period: {
                start: dataLokal.tanggalDaftar.toISOString()
            },
            // PENGIKATAN (LINKING): Program ini untuk mengobati penyakit apa?
            diagnosis: [
                {
                    condition: {
                        reference: `Condition/${satusehatConditionId}`
                    },
                    role: {
                        coding: [
                            {
                                system: "http://terminology.hl7.org/CodeSystem/diagnosis-role",
                                code: "CC",
                                display: "Chief complaint"
                            }
                        ]
                    },
                    rank: 1
                }
            ]
        };
    }
}

module.exports = EpisodeOfCareMapper;