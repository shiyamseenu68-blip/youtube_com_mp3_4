import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxConcurrentDownloads: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '5', 10),
  tempDir: process.env.TEMP_DIR || path.join(process.cwd(), 'temp_downloads'),
  jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS || '600000', 10), // 10 minutes timeout
  cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '300000', 10), // 5 minutes cleanup
};
