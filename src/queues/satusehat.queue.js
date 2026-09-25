const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

// Initialize Queue instance for SATUSEHAT sync (OFFLINE SAFE MODE)
let satusehatQueue = null;

try {
  satusehatQueue = new Queue('satusehat-sync', {
    connection: redisConnection,
    // Disable automatic retry loop on connection error
    connectionReconnectionDelay: 10000,
  });

  // Handle Redis Connection Error silently without crashing backend
  satusehatQueue.on('error', (err) => {
    // Redis offline notification
  });
} catch (e) {
  console.log('ℹ️ Redis offline mode - BullMQ queue disabled.');
}

/**
 * Add a SATUSEHAT sync job to the Redis queue.
 * @param {string} kunjunganId - ID of the visit to sync.
 */
const addSatusehatSyncJob = async (kunjunganId) => {
  if (!satusehatQueue) {
    console.log(`[Redis Offline] Bypassing background queue for Kunjungan ID: ${kunjunganId}`);
    return null;
  }
  try {
    return await satusehatQueue.add(
      'sync-visit-bundle',
      { kunjunganId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000 // 1 minute base exponential backoff
        },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    );
  } catch (err) {
    console.log(`[Redis Offline Warning] Queue unavailable: ${err.message}`);
    return null;
  }
};

module.exports = {
  satusehatQueue,
  addSatusehatSyncJob
};
