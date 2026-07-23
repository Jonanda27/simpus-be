const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

// Initialize Queue instance for SATUSEHAT sync
const satusehatQueue = new Queue('satusehat-sync', {
  connection: redisConnection
});

/**
 * Add a SATUSEHAT sync job to the Redis queue.
 * @param {string} kunjunganId - ID of the visit to sync.
 */
const addSatusehatSyncJob = async (kunjunganId) => {
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
};

module.exports = {
  satusehatQueue,
  addSatusehatSyncJob
};
