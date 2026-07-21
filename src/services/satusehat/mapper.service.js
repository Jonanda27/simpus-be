/**
 * PURE FABRICATION CLASS
 * Kelas ini bertugas menerjemahkan skema database internal Prisma 
 * menjadi struktur JSON FHIR Kemenkes secara presisi.
 */

class SatuSehatMapper {

    /**
     * Memetakan data PemeriksaanRadiologi lokal ke skema FHIR R4 ImagingStudy
     * @param {Object} data - Hasil query `getPemeriksaanLengkapById` dari radiologiService
     * @returns {Object} JSON FHIR ImagingStudy
     */
    static toImagingStudy(data) {
        // 1. Data Integrity Guard (Pencegahan kegagalan API)
        if (!data.kunjungan.pasien.noIHS) {
            throw new Error('INTEGRITY ERROR: Pasien belum memiliki nomor IHS dari SATUSEHAT.');
        }
        if (!data.kunjungan.satusehatId) {
            throw new Error('INTEGRITY ERROR: Kunjungan (Encounter) belum disinkronkan ke SATUSEHAT.');
        }

        // 2. Mapping JSON FHIR R4
        const fhirPayload = {
            resourceType: "ImagingStudy",
            status: "available",
            subject: {
                reference: `Patient/${data.kunjungan.pasien.noIHS}`,
                display: data.kunjungan.pasien.namaLengkap
            },
            encounter: {
                reference: `Encounter/${data.kunjungan.satusehatId}`
            },
            started: data.waktuPemeriksaan.toISOString(),

            // Catatan interpretasi dokter
            description: data.interpretasi || "Tidak ada interpretasi",

            // Relasi Endpoint (Jika menyimpan file DICOM di server RS)
            // endpoint: [],

            // Series & Instances (Hierarki DICOM)
            series: [
                {
                    uid: data.studyInstanceUid || "1.2.3.4.5.6.7.8.9", // Wajib diisi UID dari mesin rontgen
                    number: 1,
                    modality: {
                        system: "http://dicom.nema.org/resources/ontology/DCM",
                        code: data.modality.kodeDicom, // CT, DX, US
                        display: data.modality.namaModality
                    },
                    bodySite: {
                        system: "http://snomed.info/sct",
                        // Catatan Arsitek: Dalam praktek nyata, bodySite harus di-mapping 
                        // menggunakan tabel master SNOMED-CT. Ini adalah contoh default/mockup.
                        code: "51185008",
                        display: data.bodySite || "Chest"
                    },
                    instance: [
                        {
                            uid: `${data.studyInstanceUid || "1.2.3.4"}.1`,
                            sopClass: {
                                system: "urn:ietf:rfc:3986",
                                code: "urn:oid:1.2.840.10008.5.1.4.1.1.1" // Standar OID untuk SOP Class Radiography
                            },
                            title: `Gambar ${data.modality.kodeDicom} - ${data.kunjungan.pasien.namaLengkap}`
                        }
                    ]
                }
            ]
        };

        return fhirPayload;
    }
}

module.exports = SatuSehatMapper;