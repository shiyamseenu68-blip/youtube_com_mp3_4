import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';
import { validateAndDetectUrl, SupportedPlatform } from '../utils/urlValidator';
import { sanitizeTitleToFilename } from '../utils/filenameSanitizer';
import { ytdlpService } from './ytdlpService';
import { instagramService } from './instagramService';

export interface DownloadJob {
  jobId: string;
  url: string;
  platform: SupportedPlatform;
  format: 'mp4' | 'mp3';
  status: 'pending' | 'analyzing' | 'downloading' | 'processing' | 'completed' | 'failed';
  percent: number;
  speed: string;
  eta: string;
  stage: string;
  filePath?: string;
  filename?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  sseClients: Set<Response>;
}

export class DownloadService {
  private jobs: Map<string, DownloadJob> = new Map();

  constructor() {
    if (!fs.existsSync(config.tempDir)) {
      fs.mkdirSync(config.tempDir, { recursive: true });
    }

    setInterval(() => this.cleanupExpiredJobs(), config.cleanupIntervalMs);
  }

  public async createJob(url: string, format: 'mp4' | 'mp3'): Promise<{ jobId: string }> {
    const validation = validateAndDetectUrl(url);
    if (!validation.isValid || !validation.platform || !validation.normalizedUrl) {
      throw new Error(validation.error || 'Invalid target URL.');
    }

    if (format !== 'mp4' && format !== 'mp3') {
      throw new Error('Unsupported format requested. Allowed formats: mp4, mp3.');
    }

    const jobId = uuidv4();
    const jobDir = path.join(config.tempDir, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const job: DownloadJob = {
      jobId,
      url: validation.normalizedUrl,
      platform: validation.platform,
      format,
      status: 'pending',
      percent: 0,
      speed: '0 KiB/s',
      eta: '--:--',
      stage: 'Initializing job...',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sseClients: new Set(),
    };

    this.jobs.set(jobId, job);

    this.processJobAsync(job, jobDir);

    return { jobId };
  }

  private async processJobAsync(job: DownloadJob, jobDir: string) {
    try {
      this.updateJobState(job, {
        status: 'analyzing',
        percent: 5,
        stage: 'Analyzing media URL...',
      });

      let title = 'media_download';
      try {
        const metadata = job.platform === 'instagram'
          ? await instagramService.analyzeInstagramUrl(job.url)
          : await ytdlpService.analyzeUrl(job.url, job.platform);
        title = metadata.title;
      } catch {
        // Fallback to default title
      }

      const safeFilename = sanitizeTitleToFilename(title);

      this.updateJobState(job, {
        status: 'downloading',
        percent: 10,
        stage: 'Starting download stream...',
      });

      const downloadFn = job.platform === 'instagram'
        ? instagramService.downloadInstagramMedia.bind(instagramService)
        : ytdlpService.downloadMedia.bind(ytdlpService);

      const filePath = await downloadFn(
        job.url,
        job.format,
        jobDir,
        safeFilename,
        (percent, speed, eta, stage) => {
          this.updateJobState(job, {
            status: percent >= 95 ? 'processing' : 'downloading',
            percent: Math.min(Math.max(Math.round(percent), 10), 99),
            speed,
            eta,
            stage,
          });
        }
      );

      const finalExt = job.format === 'mp3' ? 'mp3' : 'mp4';
      const downloadFilename = `${safeFilename}.${finalExt}`;

      this.updateJobState(job, {
        status: 'completed',
        percent: 100,
        speed: '0 KiB/s',
        eta: '00:00',
        stage: 'Ready for download!',
        filePath,
        filename: downloadFilename,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Media extraction failed.';
      this.updateJobState(job, {
        status: 'failed',
        error: errorMessage,
        stage: `Error: ${errorMessage}`,
      });
    }
  }

  public subscribeProgress(jobId: string, res: Response) {
    const job = this.jobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found or has expired.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    job.sseClients.add(res);

    this.sendSseEvent(res, job);

    res.on('close', () => {
      job.sseClients.delete(res);
    });
  }

  public getJob(jobId: string): DownloadJob | undefined {
    return this.jobs.get(jobId);
  }

  private updateJobState(job: DownloadJob, updates: Partial<DownloadJob>) {
    Object.assign(job, updates, { updatedAt: Date.now() });

    for (const client of job.sseClients) {
      this.sendSseEvent(client, job);
    }
  }

  private sendSseEvent(res: Response, job: DownloadJob) {
    const payload = {
      jobId: job.jobId,
      status: job.status,
      percent: job.percent,
      speed: job.speed,
      eta: job.eta,
      stage: job.stage,
      filename: job.filename,
      error: job.error,
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  }

  private cleanupExpiredJobs() {
    const now = Date.now();
    const expiryMs = 15 * 60 * 1000;

    for (const [jobId, job] of this.jobs.entries()) {
      if (now - job.createdAt > expiryMs) {
        for (const client of job.sseClients) {
          client.end();
        }
        const jobDir = path.join(config.tempDir, jobId);
        if (fs.existsSync(jobDir)) {
          try {
            fs.rmSync(jobDir, { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
        this.jobs.delete(jobId);
      }
    }
  }
}

export const downloadService = new DownloadService();
