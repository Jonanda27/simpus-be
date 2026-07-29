const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const prisma = require('../config/prisma');
const SatuSehatGateway = require('../services/satusehat/gateway.service');
const { toRawatJalanBundle } = require('../utils/fhir-mappers');

/**
 * Helper to extract Observation vital signs from screening record
 */
const extractObservationsFromScreening = (screening) => {
  if (!screening) return [];
  const obs = [];

  if (screening.tekananDarahSistolik || screening.tekananDarahDiastolik) {
    obs.push({
      loincCode: "85354-9",
      loincDisplay: "Blood pressure panel with all children optional",
      components: [
        {
          code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
          valueQuantity: { value: screening.tekananDarahSistolik || 120, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        },
        {
          code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
          valueQuantity: { value: screening.tekananDarahDiastolik || 80, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
        }
      ]
    });
  }

  if (screening.nadi) {
    obs.push({
      loincCode: "8867-4",
      loincDisplay: "Heart rate",
      value: screening.nadi,
      unit: "/min",
      unitCode: "/min"
    });
  }

  if (screening.frekuensiNapas) {
    obs.push({
      loincCode: "9279-1",
      loincDisplay: "Respiratory rate",
      value: screening.frekuensiNapas,
      unit: "/min",
      unitCode: "/min"
    });
  }

  if (screening.suhuTubuh) {
    obs.push({
      loincCode: "8310-5",
      loincDisplay: "Body temperature",
      value: screening.suhuTubuh,
      unit: "C",
      unitCode: "Cel"
    });
  }

  if (screening.tinggiBadan) {
    obs.push({
      loincCode: "8302-2",
      loincDisplay: "Body height",
      value: screening.tinggiBadan,
      unit: "cm",
      unitCode: "cm"
    });
  }

  if (screening.beratBadan) {
    obs.push({
      loincCode: "29463-7",
      loincDisplay: "Body weight",
      value: screening.beratBadan,
      unit: "kg",
      unitCode: "kg"
    });
  }

  return obs;
};

// Initialize Background Worker for SATUSEHAT Bundle Sync
const satusehatWorker = new Worker(
  'satusehat-sync',
  async (job) => {
    const { kunjunganId } = job.data;
    console.log(`[Worker SATUSEHAT] Memproses job ${job.id} (attempt ${job.attemptsMade + 1}) untuk kunjungan ID: ${kunjunganId}`);

    const dataComplete = await prisma.kunjungan.findUnique({
      where: { id: kunjunganId },
      include: {
        pasien: true,
        poliklinik: true,
        screening: true,
        rekamMedis: true,
        persetujuan: true,
        diagnosis: {
          include: { icd10: true }
        },
        tindakans: {
          include: { icd9: true }
        },
        resep: {
          include: {
            details: {
              include: { obat: true }
            }
          }
        },
        dokterTujuan: {
          include: { tenagaMedis: true }
        }
      }
    });

    if (!dataComplete) {
      throw new Error(`Data kunjungan dengan ID ${kunjunganId} tidak ditemukan`);
    }

    // Consent Check (Persetujuan Medis Pasien)
    if (dataComplete.persetujuan && dataComplete.persetujuan.persetujuanSatusehat === false) {
      console.log(`[Worker SATUSEHAT] Kunjungan ${kunjunganId} di-skip karena persetujuanSatusehat = false.`);
      await prisma.kunjungan.update({
        where: { id: kunjunganId },
        data: {
          satusehat_sync_status: 'SKIPPED_NO_CONSENT',
          satusehat_last_error: null
        }
      });
      return { status: 'SKIPPED_NO_CONSENT' };
    }

    // Ekstrak detail resep
    const resepDetails = [];
    if (Array.isArray(dataComplete.resep)) {
      dataComplete.resep.forEach((r) => {
        if (Array.isArray(r.details)) {
          r.details.forEach((d) => resepDetails.push({ ...d, resepId: r.id }));
        }
      });
    }

    // Ekstrak vital signs dari screening
    const observations = extractObservationsFromScreening(dataComplete.screening);

    const completePayload = {
      ...dataComplete,
      observations,
      resepDetails,
      encounterId: dataComplete.encounterId
    };

    // Buat Bundle Transaction Payload
    const bundlePayload = toRawatJalanBundle(completePayload);

    // Kirim ke SATUSEHAT API
    try {
      console.log(`[Worker SATUSEHAT] Mengirim Bundle Transaction untuk kunjungan ${kunjunganId}...`);
      const response = await SatuSehatGateway.sendBundleTransaction(bundlePayload);

      await prisma.kunjungan.update({
        where: { id: kunjunganId },
        data: {
          satusehat_sync_status: 'SUCCESS',
          satusehat_last_error: null,
          satusehatSync: {
            bundleTransaction: {
              status: 'SUCCESS',
              response,
              timestamp: new Date().toISOString()
            }
          }
        }
      });

      console.log(`[Worker SATUSEHAT] ✅ Sukses sync bundle untuk kunjungan ${kunjunganId}`);
      return { status: 'SUCCESS', response };
    } catch (error) {
      const lastError = error.message || String(error);
      console.error(`[Worker SATUSEHAT Error] ❌ Gagal sync bundle untuk kunjungan ${kunjunganId}:`, lastError);

      try {
        await prisma.kunjungan.update({
          where: { id: kunjunganId },
          data: {
            satusehat_sync_status: 'FAILED',
            satusehat_last_error: lastError
          }
        });
      } catch (dbErr) {
        console.error(`[DB Error] Gagal update status FAILED ke database:`, dbErr.message);
      }

      // Throw error agar BullMQ mencatat failed job & memicu auto-retry
      throw error;
    }
  },
  {
    connection: redisConnection
  }
);

satusehatWorker.on('completed', (job) => {
  console.log(`[Worker Event] Job ${job.id} selesai diproses.`);
});

satusehatWorker.on('failed', (job, err) => {
  console.error(`[Worker Event] Job ${job?.id} gagal (Attempts: ${job?.attemptsMade}): ${err.message}`);
});

module.exports = satusehatWorker;
