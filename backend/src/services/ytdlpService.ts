import { execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getYtDlpInfo, getFfmpegPath } from '../config/binaries';
import { SupportedPlatform } from '../utils/urlValidator';
import { createTempCookieFile, getYouTubePoToken } from '../utils/cookieHelper';

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
   * Helper to ensure Node.js binary directory is in PATH for child processes
   */
  private getExecEnv(): NodeJS.ProcessEnv {
    const nodeBinDir = path.dirname(process.execPath);
    const currentPath = process.env.PATH || '';
    const newPath = currentPath.includes(nodeBinDir)
      ? currentPath
      : `${nodeBinDir}${path.delimiter}${currentPath}`;

    return {
      ...process.env,
      PATH: newPath,
    };
  }

  /**
   * Sanitizes diagnostic error output to guarantee secrets, cookies, or tokens are never logged
   */
  private sanitizeErrorOutput(rawStr: string): string {
    if (!rawStr) return '';
    return rawStr
      .replace(/(session_id|VISITOR_INFO1_LIVE|HSID|SSID|APISID|SAPISID|LOGIN_INFO)=[^;\s]+/gi, '$1=[REDACTED]')
      .replace(/(Bearer|Token)\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, '$1 [REDACTED]')
      .replace(/po_token=[^\s&"]+/gi, 'po_token=[REDACTED]');
  }

  /**
   * Analyze media URL using yt-dlp -J
   */
  public async analyzeUrl(url: string, platform: SupportedPlatform): Promise<MediaMetadata> {
    const ytInfo = getYtDlpInfo();
    const env = this.getExecEnv();
    const cookieHandle = createTempCookieFile();
    const poToken = getYouTubePoToken();

    const args = [
      ...ytInfo.argsPrefix,
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--geo-bypass',
      '--no-check-certificates',
      '--js-runtimes', `node:${process.execPath}`,
    ];

    if (cookieHandle.filePath) {
      args.push('--cookies', cookieHandle.filePath);
    }

    if (poToken && platform === 'youtube') {
      args.push('--extractor-args', `youtube:po_token=web.gvs+${poToken}`);
    } else if (platform === 'youtube') {
      args.push('--extractor-args', 'youtube:player_client=android,web');
    }

    args.push(url);

    // Safe sanitized diagnostic logging
    const safeArgs = args.map(a => {
      if (a.includes('yt_cookies_')) return '--cookies <temp-cookie-file>';
      if (a.includes('po_token=')) return 'youtube:po_token=[REDACTED]';
      return a;
    });

    console.log(`[yt-dlp Diagnostic] Engine Command: ${ytInfo.command} ${ytInfo.argsPrefix.join(' ')}`);
    console.log(`[yt-dlp Diagnostic] Node Executable: ${process.execPath}`);
    console.log(`[yt-dlp Diagnostic] Cookies Configured: ${cookieHandle.filePath ? true : false} (Valid Rows: ${cookieHandle.rowCount})`);
    console.log(`[yt-dlp Diagnostic] PO Token Configured: ${poToken ? true : false}`);
    console.log(`[yt-dlp Diagnostic] Arguments:`, safeArgs);

    return new Promise((resolve, reject) => {
      execFile(
        ytInfo.command,
        args,
        { maxBuffer: 10 * 1024 * 1024, timeout: 30000, env },
        (error, stdout, stderr) => {
          try {
            if (error) {
              const rawErrStr = (stderr || error.message || '').toString();
              const sanitizedErr = this.sanitizeErrorOutput(rawErrStr);
              console.error(`[yt-dlp Error] Exit Code: ${(error as any).code || 1}`);
              console.error(`[yt-dlp Raw Stderr]:\n${sanitizedErr}`);
              reject(this.parseYtDlpError(sanitizedErr, platform));
              return;
            }

            try {
              const json = JSON.parse(stdout);

              const title = json.title || json.description || (platform === 'instagram' ? 'Instagram Media' : 'YouTube Video');
              const thumbnail = json.thumbnail || (json.thumbnails && json.thumbnails.length ? json.thumbnails[json.thumbnails.length - 1].url : '');
              const duration = Math.round(json.duration || 0);

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
          } finally {
            cookieHandle.cleanup();
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
      const env = this.getExecEnv();
      const cookieHandle = createTempCookieFile();
      const poToken = getYouTubePoToken();

      const outputTemplate = `${outputFilenameWithoutExt}.%(ext)s`;

      const args = [
        ...ytInfo.argsPrefix,
        '--no-warnings',
        '--no-playlist',
        '--geo-bypass',
        '--newline',
        '--js-runtimes', `node:${process.execPath}`,
        '-o', outputTemplate,
      ];

      if (cookieHandle.filePath) {
        args.push('--cookies', cookieHandle.filePath);
      }

      if (poToken) {
        args.push('--extractor-args', `youtube:po_token=web.gvs+${poToken}`);
      } else {
        args.push('--extractor-args', 'youtube:player_client=android,web');
      }

      if (ffmpegPath && ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', ffmpegPath);
      }

      if (format === 'mp3') {
        args.push(
          '-x',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '--no-keep-video'
        );
      } else {
        args.push(
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4'
        );
      }

      args.push(url);

      const child = spawn(ytInfo.command, args, { cwd: outputDir, env });

      let stderrBuffer = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.parseProgressLine(text, onProgress);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });

      child.on('error', (err) => {
        cookieHandle.cleanup();
        reject(new Error(`Download process error: ${err.message}`));
      });

      child.on('close', (code) => {
        try {
          if (code !== 0) {
            const sanitizedErr = this.sanitizeErrorOutput(stderrBuffer);
            console.error(`[yt-dlp Download Error] Exit Code: ${code}`);
            console.error(`[yt-dlp Download Stderr]:\n${sanitizedErr}`);
            reject(this.parseYtDlpError(sanitizedErr, 'youtube'));
            return;
          }

          const expectedExt = format === 'mp3' ? '.mp3' : '.mp4';
          const expectedFile = path.join(outputDir, `${outputFilenameWithoutExt}${expectedExt}`);

          if (fs.existsSync(expectedFile)) {
            resolve(expectedFile);
            return;
          }

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
        } finally {
          cookieHandle.cleanup();
        }
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
