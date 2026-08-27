import { execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getYtDlpInfo, getFfmpegPath } from '../config/binaries';
import { SupportedPlatform } from '../utils/urlValidator';

export interface MediaMetadata {
  platform: SupportedPlatform;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  uploader?: string;
  viewCount?: number;
  availableFormats: {
    formatId: string;
    ext: string;
    resolution?: string;
    filesize?: number;
  }[];
}

export class YtDlpService {
  /**
   * Analyze media URL using yt-dlp -J
   */
  public async analyzeUrl(url: string, platform: SupportedPlatform): Promise<MediaMetadata> {
    const ytInfo = getYtDlpInfo();
    const nodeBinDir = path.dirname(process.execPath);

    const args = [
      ...ytInfo.argsPrefix,
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--geo-bypass',
      '--no-check-certificates',
      '--js-runtimes', `node:${nodeBinDir}`,
      url,
    ];

    return new Promise((resolve, reject) => {
      execFile(
        ytInfo.command,
        args,
        { maxBuffer: 10 * 1024 * 1024, timeout: 30000, env: process.env },
        (error, stdout, stderr) => {
          if (error) {
            const errStr = (stderr || error.message || '').toString();
            reject(this.parseYtDlpError(errStr, platform));
            return;
          }

          try {
            const json = JSON.parse(stdout);

            const title = json.title || json.description || (platform === 'instagram' ? 'Instagram Media' : 'YouTube Video');
            const thumbnail = json.thumbnail || (json.thumbnails && json.thumbnails.length ? json.thumbnails[json.thumbnails.length - 1].url : '');
            const duration = Math.round(json.duration || 0);

            // Extract best quality options
            const availableFormats = [
              { formatId: 'mp4_best', ext: 'mp4', resolution: 'Best Quality Video (MP4)' },
              { formatId: 'mp3_best', ext: 'mp3', resolution: 'High Quality Audio (MP3)' }
            ];

            resolve({
              platform,
              title,
              thumbnail,
              duration,
              uploader: json.uploader || json.channel || json.uploader_id,
              viewCount: json.view_count,
              availableFormats,
            });
          } catch (parseErr) {
            reject(new Error('Failed to parse media metadata from extractor output.'));
          }
        }
      );
    });
  }

  /**
   * Download media file to specified target path with progress callbacks
   */
  public downloadMedia(
    url: string,
    format: 'mp4' | 'mp3',
    outputDir: string,
    outputFilenameWithoutExt: string,
    onProgress: (percent: number, speed: string, eta: string, stage: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const ytInfo = getYtDlpInfo();
      const ffmpegPath = getFfmpegPath();
      const nodeBinDir = path.dirname(process.execPath);

      const outputTemplate = `${outputFilenameWithoutExt}.%(ext)s`;

      const args = [
        ...ytInfo.argsPrefix,
        '--no-warnings',
        '--no-playlist',
        '--geo-bypass',
        '--newline',
        '--js-runtimes', `node:${nodeBinDir}`,
        '-o', outputTemplate,
      ];

      if (ffmpegPath && ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', ffmpegPath);
      }

      if (format === 'mp3') {
        args.push(
          '-x', // extract audio
          '--audio-format', 'mp3',
          '--audio-quality', '0', // best VBR quality
          '--no-keep-video'
        );
      } else {
        // MP4 format download
        args.push(
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4'
        );
      }

      args.push(url);

      const child = spawn(ytInfo.command, args, { cwd: outputDir, env: process.env });

      let stderrBuffer = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.parseProgressLine(text, onProgress);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });

      child.on('error', (err) => {
        reject(new Error(`Download process error: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(this.parseYtDlpError(stderrBuffer, 'youtube'));
          return;
        }

        // Find created output file
        const expectedExt = format === 'mp3' ? '.mp3' : '.mp4';
        const expectedFile = path.join(outputDir, `${outputFilenameWithoutExt}${expectedExt}`);

        if (fs.existsSync(expectedFile)) {
          resolve(expectedFile);
          return;
        }

        // Fallback: search directory for any file starting with outputFilenameWithoutExt
        try {
          const files = fs.readdirSync(outputDir);
          const matched = files.find(f => f.startsWith(outputFilenameWithoutExt) && (f.endsWith('.mp3') || f.endsWith('.mp4')));
          if (matched) {
            resolve(path.join(outputDir, matched));
            return;
          }
        } catch {
          // ignore
        }

        reject(new Error(`Extraction finished but output file was not found in directory.`));
      });
    });
  }

  private parseProgressLine(
    stdoutText: string,
    onProgress: (percent: number, speed: string, eta: string, stage: string) => void
  ) {
    const lines = stdoutText.split('\n');
    for (const line of lines) {
      if (line.includes('[ExtractAudio]')) {
        onProgress(95, 'Processing', '--:--', 'Converting audio to MP3...');
        continue;
      }
      if (line.includes('[Merger]')) {
        onProgress(90, 'Processing', '--:--', 'Merging video and audio streams...');
        continue;
      }
      if (line.includes('[download]')) {
        // e.g. [download]  45.2% of 12.34MiB at  2.15MiB/s ETA 00:04
        const percentMatch = line.match(/(\d+\.\d+)%/);
        const speedMatch = line.match(/at\s+([\d\.]+\s*[kMG]i?B\/s)/i);
        const etaMatch = line.match(/ETA\s+([\d:]+)/i);

        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          const speed = speedMatch ? speedMatch[1] : 'Downloading...';
          const eta = etaMatch ? etaMatch[1] : '--:--';
          onProgress(percent, speed, eta, 'Downloading media...');
        }
      }
    }
  }

  private parseYtDlpError(rawError: string, platform: SupportedPlatform): Error {
    const lower = rawError.toLowerCase();

    if (lower.includes('sign in to confirm') || lower.includes('bot detection') || lower.includes('confirm your age')) {
      return new Error('Unable to download this video from the current server. YouTube is requiring additional verification.');
    }
    if (lower.includes('private video') || lower.includes('this video is private')) {
      return new Error('This video is marked as private by the creator.');
    }
    if (lower.includes('video unavailable') || lower.includes('is not available')) {
      return new Error('This media content is unavailable or has been removed.');
    }
    if (lower.includes('login') || lower.includes('private post') || platform === 'instagram' && lower.includes('redirected to login')) {
      return new Error('This Instagram post is private, requires account login, or is unavailable.');
    }

    return new Error('Extraction failed. Please verify the URL is public and accessible.');
  }
}

export const ytdlpService = new YtDlpService();
