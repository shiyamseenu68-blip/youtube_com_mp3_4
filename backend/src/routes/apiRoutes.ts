import { Router, Request, Response } from 'express';
import fs from 'fs';
import { checkBinaryStatus } from '../config/binaries';
import { config } from '../config/environment';
import { validateAndDetectUrl } from '../utils/urlValidator';
import { ytdlpService } from '../services/ytdlpService';
import { instagramService } from '../services/instagramService';
import { downloadService } from '../services/downloadService';

const router = Router();

/**
 * GET /api/health
 * System diagnostics endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = await checkBinaryStatus();
    res.json({
      status: 'ok',
      environment: config.nodeEnv,
      ytDlp: status.ytDlp,
      ffmpeg: status.ffmpeg,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve system health metrics.',
    });
  }
});

/**
 * POST /api/analyze
 * Extracts metadata for YouTube or Instagram link
 */
router.post('/analyze', async (req: Request, res: Response, next) => {
  try {
    const { url } = req.body;

    const validation = validateAndDetectUrl(url);
    if (!validation.isValid || !validation.platform || !validation.normalizedUrl) {
      res.status(400).json({
        success: false,
        error: validation.error || 'Invalid or unsupported URL provided.',
      });
      return;
    }

    const platform = validation.platform;
    const normalizedUrl = validation.normalizedUrl;

    const metadata = platform === 'instagram'
      ? await instagramService.analyzeInstagramUrl(normalizedUrl)
      : await ytdlpService.analyzeUrl(normalizedUrl, platform);

    res.json({
      success: true,
      platform: metadata.platform,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      uploader: metadata.uploader,
      formats: metadata.availableFormats,
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/download
 * Initializes a new media download job
 */
router.post('/download', async (req: Request, res: Response, next) => {
  try {
    const { url, format } = req.body;

    if (!url || !format) {
      res.status(400).json({
        success: false,
        error: 'Both "url" and "format" (mp4 or mp3) are required parameters.',
      });
      return;
    }

    const { jobId } = await downloadService.createJob(url, format);

    res.json({
      success: true,
      jobId,
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * GET /api/download/:jobId/progress
 * Server-Sent Events endpoint for real-time progress updates
 */
router.get('/download/:jobId/progress', (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);
  downloadService.subscribeProgress(jobId, res);
});

/**
 * GET /api/download/:jobId/file
 * Downloads completed media file
 */
router.get('/download/:jobId/file', (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);
  const job = downloadService.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Download job not found or has expired.' });
    return;
  }

  if (job.status !== 'completed' || !job.filePath || !fs.existsSync(job.filePath)) {
    res.status(400).json({ error: 'File is not ready or failed to generate.' });
    return;
  }

  const filename = job.filename || (job.format === 'mp3' ? 'download.mp3' : 'download.mp4');
  const contentType = job.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

  const fileStream = fs.createReadStream(job.filePath);
  fileStream.pipe(res);
});

export default router;
