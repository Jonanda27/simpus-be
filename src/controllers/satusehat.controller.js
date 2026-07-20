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
      data: { noIHS: ihsNumber }
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

module.exports = {
  testAuth,
  syncPatientIHS,
  syncPractitionerIHS,
  syncPoliklinikLocation
};
