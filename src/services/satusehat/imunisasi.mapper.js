/**
 * PURE FABRICATION CLASS
 * Menerjemahkan skema database internal ke format FHIR R4 Immunization
 */

class SatuSehatMapper {

    static toImmunization(data) {
        // ==========================================
        // 1. DATA INTEGRITY GUARDS
        // ==========================================
        if (!data.pasien?.noIHS) {
            throw new Error('INTEGRITY ERROR: Pasien belum memiliki nomor IHS (SatuSehat ID).');
        }

        if (!data.isRiwayatLuar && !data.kunjungan?.satusehatId) {
            throw new Error('INTEGRITY ERROR: Kunjungan (Encounter) belum tersinkronisasi dengan SATUSEHAT.');
        }

        // ==========================================
        // 2. MAPPING FHIR JSON
        // ==========================================

        // Potong YYYY-MM-DD dari Date (Syarat mutlak FHIR expirationDate)
        const expDate = data.batchVaksin.tanggalExpired.toISOString().split('T')[0];

        const fhirPayload = {
            resourceType: "Immunization",
            status: "completed",

            // Kode Vaksin menggunakan sistem KFA SATUSEHAT
            vaccineCode: {
                coding: [
                    {
                        system: "http://sys-ids.kemkes.go.id/kfa",
                        code: data.batchVaksin.vaksin.kodeKfa,
                        display: data.batchVaksin.vaksin.namaVaksin
                    }
                ]
            },

            // Pasien (Subject)
            patient: {
                reference: `Patient/${data.pasien.noIHS}`,
                display: data.pasien.namaLengkap
            },

            // Waktu Suntik
            occurrenceDateTime: data.tanggalSuntik.toISOString(),

            // Apakah disuntik di tempat kita? (T/F)
            primarySource: !data.isRiwayatLuar,

            // Data Logistik (Batch & Expired)
            lotNumber: data.batchVaksin.noBatch,
            expirationDate: expDate,

            // Target Penyakit (DPT / Polio / dll)
            protocolApplied: [
                {
                    targetDisease: [
                        {
                            coding: [
                                {
                                    system: "http://snomed.info/sct",
                                    // Idealnya menggunakan master, tapi karena di db targetPenyakit format string,
                                    // SATUSEHAT membolehkan pengiriman text fallback jika kode SNOMED spesifik tidak dikirim.
                                    // Namun jika Anda punya kodenya, masukkan ke properti "code"
                                    display: data.batchVaksin.vaksin.targetPenyakit || "Immunization"
                                }
                            ]
                        }
                    ],
                    doseNumberPositiveInt: data.dosisKe // Dosis ke 1, 2, 3 dst
                }
            ]
        };

        // ==========================================
        // 3. KONDISIONAL MAPPING (ENCOUNTER)
        // ==========================================
        // Encounter HANYA dikirim jika ini bukan riwayat historis dari luar
        if (!data.isRiwayatLuar && data.kunjungan?.satusehatId) {
            fhirPayload.encounter = {
                reference: `Encounter/${data.kunjungan.satusehatId}`
            };
        }

        // ==========================================
        // 4. KONDISIONAL MAPPING (DOSIS, LOKASI, PETUGAS)
        // ==========================================

        // Dosis Jumlah (Jika ada)
        if (data.dosisJumlah) {
            fhirPayload.doseQuantity = {
                value: data.dosisJumlah,
                unit: "mL", // Unit standar cairan vaksin
                system: "http://unitsofmeasure.org",
                code: "mL"
            };
        }

        // Bagian Tubuh & Rute (Gunakan SNOMED CT yang dikirim frontend)
        // Contoh SNOMED Lengan kiri atas: 368208006
        if (data.lokasiSuntik) {
            fhirPayload.site = {
                coding: [{ system: "http://snomed.info/sct", code: data.lokasiSuntik }]
            };
        }

        // Rute (Intramuskular dll)
        // Contoh SNOMED Intramuscular: 78421000
        if (data.ruteSuntik) {
            fhirPayload.route = {
                coding: [{ system: "http://snomed.info/sct", code: data.ruteSuntik }]
            };
        }

        // Petugas (Hanya jika disuntik di Puskesmas kita dan IHS petugas tersedia)
        // *Catatan Arsitek: Pastikan Anda menambahkan "noIHS" di tabel User kelak. 
        // Sementara ini, kita beri dummy IHS jika tidak ada.
        if (!data.isRiwayatLuar && data.petugas) {
            const practitionerIHS = data.petugas.noIHS || "N10000001"; // Placeholder
            fhirPayload.performer = [
                {
                    actor: {
                        reference: `Practitioner/${practitionerIHS}`,
                        display: data.petugas.namaLengkap
                    }
                }
            ];
        }

        return fhirPayload;
    }
}

module.exports = SatuSehatMapper;