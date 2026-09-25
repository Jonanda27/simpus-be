const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    // Hentikan perulangan log reconnect jika Redis offline
    if (times > 1) {
      return null;
    }
    return 2000;
  }
};

module.exports = redisConnection;
