const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getMonitoringData = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const kunjungans = await prisma.kunjungan.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
      include: {
        pasien: true,
        dokterTujuan: true,
        screening: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedData = kunjungans.map((k) => {
      // Build an array of module statuses based on satusehatSync json
      const syncStatus = k.satusehatSync || {};
      
      const hasObservationLegacy = k.screening && Array.isArray(k.screening.observationIds) && k.screening.observationIds.length > 0;

      const modules = [
        { name: 'Encounter', status: syncStatus.Encounter?.status || (k.encounterId ? 'SUCCESS' : 'PENDING'), detail: k.encounterId || null },
        { 
          name: 'Observation', 
          status: syncStatus.Observation?.status || (hasObservationLegacy ? 'SUCCESS' : 'PENDING'), 
          detail: syncStatus.Observation?.detail || (hasObservationLegacy ? `Sent ${k.screening.observationIds.length} observations` : null) 
        },
        { name: 'Condition', status: syncStatus.Condition?.status || 'PENDING', detail: syncStatus.Condition?.detail || null },
        { name: 'Procedure', status: syncStatus.Procedure?.status || 'PENDING', detail: syncStatus.Procedure?.detail || null },
        { name: 'Composition', status: syncStatus.Composition?.status || 'PENDING', detail: null },
        { name: 'Medication', status: syncStatus.Medication?.status || 'PENDING', detail: syncStatus.Medication?.detail || null },
        { name: 'MedicationRequest', status: syncStatus.MedicationRequest?.status || 'PENDING', detail: syncStatus.MedicationRequest?.detail || null },
        { name: 'MedicationDispense', status: syncStatus.MedicationDispense?.status || 'PENDING', detail: null },
        { 
          name: 'AllergyIntolerance', 
          status: (Array.isArray(syncStatus.allergy) && syncStatus.allergy.length > 0) ? 'SUCCESS' : 'PENDING', 
          detail: (Array.isArray(syncStatus.allergy) && syncStatus.allergy.length > 0) ? `Sent ${syncStatus.allergy.length} allergies` : null 
        },
        { name: 'ImagingStudy', status: syncStatus.ImagingStudy?.status || 'PENDING', detail: null },
        { name: 'ServiceRequest', status: syncStatus.ServiceRequest?.status || 'PENDING', detail: null },
        { name: 'ClinicalImpression', status: syncStatus.ClinicalImpression?.status || 'PENDING', detail: null },
        { name: 'Immunization', status: syncStatus.Immunization?.status || 'PENDING', detail: null },
        { name: 'QuestionnaireResponse', status: syncStatus.QuestionnaireResponse?.status || 'PENDING', detail: null },
        { name: 'MedicationStatement', status: syncStatus.MedicationStatement?.status || 'PENDING', detail: null },
        { name: 'CarePlan', status: syncStatus.CarePlan?.status || 'PENDING', detail: null },
        { name: 'Specimen', status: syncStatus.Specimen?.status || 'PENDING', detail: null },
        { name: 'DiagnosticReport', status: syncStatus.DiagnosticReport?.status || 'PENDING', detail: null },
        { name: 'EpisodeOfCare', status: syncStatus.EpisodeOfCare?.status || 'PENDING', detail: null }
      ];

      return {
        id: k.id,
        pasienName: k.pasien?.namaLengkap,
        noRm: k.pasien?.noRM,
        dokterName: k.dokterTujuan?.namaLengkap,
        statusKunjungan: k.statusKunjungan,
        waktuDaftar: k.createdAt,
        modules: modules,
      };
    });

    res.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonitoringData,
};
