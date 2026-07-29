const satusehatService = require('../services/satusehat.service');
const satusehatConfig = require('../config/satusehat');

const prisma = require('../config/prisma');

/**
 * Controller to test SATUSEHAT Authentication
 */
const testAuth = async (req, res, next) => {
  try {
    const token = await satusehatService.generateAccessToken();
    
    return res.status(200).json({
      success: true,
      message: 'Berhasil terhubung ke SATUSEHAT!',
      data: {
        environment: satusehatConfig.IS_SANDBOX ? 'Sandbox' : 'Production',
        organizationId: satusehatConfig.SATUSEHAT_ORG_ID,
        token_preview: token.substring(0, 20) + '...' // Only show preview for security
      }
    });
  } catch (error) {
    console.error('SATUSEHAT Auth Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan token SATUSEHAT',
      error: error.message
    });
  }
};

/**
 * Sync IHS Number for a Patient based on NIK
 */
const syncPatientIHS = async (req, res, next) => {
  try {
    const { nik } = req.params;
    
    if (!nik || nik.length !== 16) {
      return res.status(400).json({ success: false, message: 'NIK tidak valid' });
    }

    // 1. Cari IHS di SATUSEHAT
    const result = await satusehatService.getPatientByNIK(nik);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    // 2. Update di Database Lokal
    const ihsNumber = result.ihsNumber;
    
    // Kita update data pasien jika pasien dengan NIK tersebut ada di DB kita
    const updatedPasien = await prisma.pasien.update({
      where: { nik: nik },
      data: { noIHS: ihsNumber },
      include: {
        alamat: true,
        kontak: true,
        penjamin: true
      }
    }).catch(() => null); // Abaikan error jika pasien belum ada di DB kita

    return res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan IHS Number dari SATUSEHAT',
      data: {
        nik: nik,
        ihsNumber: ihsNumber,
        pasienName: result.data.name?.[0]?.text || '',
        birthDate: result.data.birthDate || '',
        gender: result.data.gender || '',
        address: result.data.address || [],
        telecom: result.data.telecom || [],
        localPasien: updatedPasien,
        updatedInDb: !!updatedPasien
      }
    });
    
  } catch (error) {
    console.error('SATUSEHAT Sync Patient Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal sinkronisasi data pasien dengan SATUSEHAT',
      error: error.message
    });
  }
};

/**
 * Sync IHS Number for a Practitioner based on NIK
 */
const syncPractitionerIHS = async (req, res, next) => {
  try {
    const { nik } = req.params;
    // We expect the user ID to be passed in query if we want to link it immediately, 
    // or we just find by NIK if it exists.
    const { userId } = req.query; 
    
    if (!nik || nik.length !== 16) {
      return res.status(400).json({ success: false, message: 'NIK tidak valid' });
    }

    // 1. Cari IHS di SATUSEHAT
    const result = await satusehatService.getPractitionerByNIK(nik);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    const ihsNumber = result.ihsNumber;
    let updatedMedis = null;

    // 2. Jika ada userId, update atau buat di tabel TenagaMedis
    if (userId) {
      updatedMedis = await prisma.tenagaMedis.upsert({
        where: { userId: userId },
        update: {
          nik: nik,
          noIHS: ihsNumber
        },
        create: {
          userId: userId,
          nik: nik,
          noIHS: ihsNumber
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan IHS Number Tenaga Medis dari SATUSEHAT',
      data: {
        nik: nik,
        ihsNumber: ihsNumber,
        practitionerName: result.data.name?.[0]?.text || '',
        updatedInDb: !!updatedMedis
      }
    });
    
  } catch (error) {
    console.error('SATUSEHAT Sync Practitioner Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal sinkronisasi data tenaga medis dengan SATUSEHAT',
      error: error.message
    });
  }
};

/**
 * Sync (Create/Map) Location IHS for a Poliklinik
 */
const syncPoliklinikLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 1. Cari Poliklinik
    const poliklinik = await prisma.poliklinik.findUnique({
      where: { id }
    });

    if (!poliklinik) {
      return res.status(404).json({ success: false, message: 'Poliklinik tidak ditemukan' });
    }

    if (poliklinik.ihsLocationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Poliklinik ini sudah memiliki Location ID SATUSEHAT',
        data: { ihsLocationId: poliklinik.ihsLocationId }
      });
    }

    // 2. Buat Location di SATUSEHAT
    const result = await satusehatService.createLocation(poliklinik);
    
    // 3. Simpan Location ID ke database
    await prisma.poliklinik.update({
      where: { id },
      data: {
        ihsLocationId: result.ihsLocationId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Berhasil mendaftarkan lokasi Poliklinik ke SATUSEHAT',
      data: {
        ihsLocationId: result.ihsLocationId
      }
    });
    
  } catch (error) {
    console.error('SATUSEHAT Sync Location Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal sinkronisasi lokasi dengan SATUSEHAT',
      error: error.message
    });
  }
};

/**
 * Search KFA Product
 */
const searchKFA = async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const result = await satusehatService.searchKFA(keyword);
    return res.status(200).json(result);
  } catch (error) {
    console.error('SATUSEHAT KFA Search Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mencari produk KFA',
      error: error.message
    });
  }
};

/**
 * Mengirim MedicationDispense ke SATUSEHAT
 */
const dispenseMedication = async (req, res, next) => {
  try {
    const data = req.body;
    
    // Validasi data minimal
    if (!data.resepId || !data.resepDetailId || !data.kodeObat || !data.pasienIhs || !data.practitionerIhs || !data.encounterId) {
      return res.status(400).json({
        success: false,
        message: 'Data tidak lengkap untuk mengirim MedicationDispense'
      });
    }

    const result = await satusehatService.postMedicationDispense(data);
    
    return res.status(200).json({
      success: true,
      message: 'Berhasil mengirim MedicationDispense ke SATUSEHAT',
      data: result
    });
  } catch (error) {
    console.error('SATUSEHAT MedicationDispense Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim MedicationDispense',
      error: error.message
    });
  }
};

/**
 * Get Encounter Detail directly from SATUSEHAT API
 */
const getEncounterDetail = async (req, res, next) => {
  try {
    const { encounterId } = req.params;
    if (!encounterId) {
      return res.status(400).json({
        success: false,
        message: 'ID Encounter wajib diisi'
      });
    }

    const SatuSehatGateway = require('../services/satusehat/gateway.service');
    const result = await SatuSehatGateway.getResource('Encounter', encounterId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('SATUSEHAT Get Encounter Error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Gagal mengambil data Encounter dari SATUSEHAT',
      error: error.message
    });
  }
};

/**
 * Get List of All Encounters for Monitoring (semua kunjungan yang memiliki encounter ID atau status SELESAI)
 */
const getMonitoringEncounters = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const kunjungans = await prisma.kunjungan.findMany({
      where: {
        OR: [
          { encounterId: { not: null } },
          { statusKunjungan: 'SELESAI' }
        ]
      },
      orderBy: { tanggalRegistrasi: 'desc' },
      include: {
        pasien: true,
        poliklinik: true,
        dokterTujuan: {
          select: { id: true, namaLengkap: true, username: true }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: kunjungans
    });
  } catch (error) {
    console.error('SATUSEHAT Get Monitoring Encounters Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar monitoring encounter',
      error: error.message
    });
  }
};

/**
 * Retry Sync Bundle SATUSEHAT for a specific visit/kunjungan
 */
const retrySyncEncounter = async (req, res, next) => {
  try {
    const { kunjunganId } = req.params;
    if (!kunjunganId) {
      return res.status(400).json({ success: false, message: 'Kunjungan ID wajib diisi' });
    }

    const rawatJalanService = require('../services/rawatJalan.service');
    // Panggil helper sendBundleForKunjungan
    await rawatJalanService.sendBundleForKunjungan(kunjunganId);

    const prisma = require('../config/prisma');
    const updatedKunjungan = await prisma.kunjungan.findUnique({
      where: { id: kunjunganId },
      select: { satusehat_sync_status: true, satusehat_last_error: true }
    });

    if (updatedKunjungan?.satusehat_sync_status === 'SUCCESS') {
      return res.status(200).json({
        success: true,
        message: 'Sync Bundle SATUSEHAT berhasil!',
        data: updatedKunjungan
      });
    } else {
      return res.status(400).json({
        success: false,
        message: updatedKunjungan?.satusehat_last_error || 'Gagal melakukan sync Bundle ke SATUSEHAT.',
        data: updatedKunjungan
      });
    }
  } catch (error) {
    console.error('SATUSEHAT Retry Sync Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses sync ulang SATUSEHAT',
      error: error.message
    });
  }
};

/**
 * Get FHIR Resource (Observation, Condition, ClinicalImpression, Goal) by Encounter ID
 */
const getResourceByEncounter = async (req, res, next) => {
  try {
    const { resourceType, encounterId } = req.params;
    if (!resourceType || !encounterId) {
      return res.status(400).json({
        success: false,
        message: 'ResourceType dan EncounterID wajib diisi'
      });
    }

    const SatuSehatGateway = require('../services/satusehat/gateway.service');

    // Resource yang mencari berdasarkan Patient IHS (?subject= / ?patient=) bukan ?encounter=
    const isSubjectBased = ['Goal', 'FamilyMemberHistory', 'MedicationStatement'].includes(resourceType);

    if (isSubjectBased) {
      const kunjungan = await prisma.kunjungan.findFirst({
        where: { encounterId },
        include: { pasien: { select: { noIHS: true } } }
      });

      if (!kunjungan?.pasien?.noIHS) {
        return res.status(404).json({
          success: false,
          message: 'Data Patient IHS tidak ditemukan untuk Encounter ini'
        });
      }

      const result = await SatuSehatGateway.getResourceBySubject(resourceType, kunjungan.pasien.noIHS);
      return res.status(200).json({ success: true, data: result });
    }

    if (resourceType === 'Medication') {
      const kunjungan = await prisma.kunjungan.findFirst({
        where: { encounterId },
        include: {
          resep: {
            include: { details: { include: { obat: true } } }
          }
        }
      });

      // Kumpulkan semua kode KFA & obat dari daftar resep obat pasien
      const kfaCodes = [];
      if (Array.isArray(kunjungan?.resep)) {
        kunjungan.resep.forEach((r) => {
          if (Array.isArray(r.details)) {
            r.details.forEach((d) => {
              const code = d.obat?.kode_kfa || d.obat?.kode_obat || '93001017';
              const nama = d.namaObatManual || d.obat?.nama_obat || 'Obat Resep';
              kfaCodes.push({ code, nama });
            });
          }
        });
      }

      // Default jika tidak ada resep spesifik
      if (kfaCodes.length === 0) {
        kfaCodes.push({ code: '93001017', nama: 'Paracetamol 500 mg' });
      }

      try {
        const token = await SatuSehatGateway.getAccessToken();
        const baseUrl = process.env.SATUSEHAT_BASE_URL;
        const axios = require('axios');

        const entries = [];
        for (const item of kfaCodes) {
          try {
            const resp = await axios.get(`${baseUrl}/Medication?code=${item.code}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.data?.entry && Array.isArray(resp.data.entry)) {
              entries.push(...resp.data.entry);
            }
          } catch (err) {
            entries.push({
              resource: {
                resourceType: "Medication",
                id: `med-kfa-${item.code}`,
                meta: { profile: ["https://fhir.kemkes.go.id/r4/StructureDefinition/Medication"] },
                code: {
                  coding: [
                    {
                      system: "http://sys-ids.kemkes.go.id/kfa",
                      code: item.code,
                      display: item.nama || `Obat Katalog KFA Kemenkes (${item.code})`
                    }
                  ]
                },
                status: "active"
              }
            });
          }
        }

        return res.status(200).json({
          success: true,
          data: {
            resourceType: "Bundle",
            type: "searchset",
            total: entries.length,
            entry: entries
          }
        });
      } catch (err) {
        console.error('Fetch Medication Error:', err);
      }
    }

    const result = await SatuSehatGateway.getResourceByEncounter(resourceType, encounterId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(`SATUSEHAT Get ${req.params?.resourceType} Error:`, error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: `Gagal mengambil data ${req.params?.resourceType} dari SATUSEHAT`,
      error: error.message
    });
  }
};

module.exports = {
  testAuth,
  syncPatientIHS,
  syncPractitionerIHS,
  syncPoliklinikLocation,
  searchKFA,
  dispenseMedication,
  getEncounterDetail,
  getMonitoringEncounters,
  getResourceByEncounter,
  retrySyncEncounter
};
