import { execFile, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface BinaryInfo {
  command: string;
  argsPrefix: string[];
}

export interface BinaryStatus {
  ytDlp: {
    available: boolean;
    version: string | null;
    path: string;
  };
  ffmpeg: {
    available: boolean;
    version: string | null;
    path: string;
  };
}

let cachedYtDlp: BinaryInfo | null = null;
let cachedFfmpeg: string | null = null;

export function getYtDlpInfo(): BinaryInfo {
  if (cachedYtDlp) return cachedYtDlp;

  // 1. Check custom path if provided in ENV
  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
    cachedYtDlp = { command: process.env.YTDLP_PATH, argsPrefix: [] };
    return cachedYtDlp;
  }

  // 2. Try direct 'yt-dlp' executable
  try {
    execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
    cachedYtDlp = { command: 'yt-dlp', argsPrefix: [] };
    return cachedYtDlp;
  } catch {
    // ignore
  }

  // 3. Try python -m yt_dlp
  for (const py of ['python', 'python3']) {
    try {
      execFileSync(py, ['-m', 'yt_dlp', '--version'], { stdio: 'ignore' });
      cachedYtDlp = { command: py, argsPrefix: ['-m', 'yt_dlp'] };
      return cachedYtDlp;
    } catch {
      // ignore
    }
  }

  // Fallback to direct 'yt-dlp'
  cachedYtDlp = { command: 'yt-dlp', argsPrefix: [] };
  return cachedYtDlp;
}

export function getFfmpegPath(): string {
  if (cachedFfmpeg) return cachedFfmpeg;

  // 1. Check custom path in ENV
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    cachedFfmpeg = process.env.FFMPEG_PATH;
    return cachedFfmpeg;
  }

  // 2. Try direct 'ffmpeg' binary in PATH
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    cachedFfmpeg = 'ffmpeg';
    return cachedFfmpeg;
  } catch {
    // ignore
  }

  // 3. Try obtaining imageio_ffmpeg path via Python
  for (const py of ['python', 'python3']) {
    try {
      const output = execFileSync(
        py,
        ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
        { encoding: 'utf-8' }
      ).trim();
      if (output && fs.existsSync(output)) {
        cachedFfmpeg = output;
        return cachedFfmpeg;
      }
    } catch {
      // ignore
    }
  }

  // Fallback to 'ffmpeg'
  cachedFfmpeg = 'ffmpeg';
  return cachedFfmpeg;
}

export async function checkBinaryStatus(): Promise<BinaryStatus> {
  const ytInfo = getYtDlpInfo();
  const ffmpegPath = getFfmpegPath();

  let ytAvailable = false;
  let ytVersion: string | null = null;
  try {
    const args = [...ytInfo.argsPrefix, '--version'];
    const output = execFileSync(ytInfo.command, args, { encoding: 'utf-8', timeout: 5000 }).trim();
    ytAvailable = true;
    ytVersion = output.split('\n')[0] || output;
  } catch (err: any) {
    ytAvailable = false;
    ytVersion = err.message || 'Not found';
  }

  let ffmpegAvailable = false;
  let ffmpegVersion: string | null = null;
  try {
    const output = execFileSync(ffmpegPath, ['-version'], { encoding: 'utf-8', timeout: 5000 }).trim();
    ffmpegAvailable = true;
    const match = output.match(/ffmpeg version ([^\s]+)/i);
    ffmpegVersion = match ? match[1] : output.split('\n')[0];
  } catch (err: any) {
    ffmpegAvailable = false;
    ffmpegVersion = err.message || 'Not found';
  }

  return {
    ytDlp: {
      available: ytAvailable,
      version: ytVersion,
      path: ytInfo.argsPrefix.length ? `${ytInfo.command} ${ytInfo.argsPrefix.join(' ')}` : ytInfo.command,
    },
    ffmpeg: {
      available: ffmpegAvailable,
      version: ffmpegVersion,
      path: ffmpegPath,
    },
  };
}
