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

  // 2. Check local bin directory (backend/bin/yt-dlp or yt-dlp.exe)
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const localBinPath = path.join(process.cwd(), 'bin', binName);
  if (fs.existsSync(localBinPath)) {
    try {
      execFileSync(localBinPath, ['--version'], { stdio: 'ignore' });
      cachedYtDlp = { command: localBinPath, argsPrefix: [] };
      return cachedYtDlp;
    } catch {
      // ignore
    }
  }

  // 3. Try direct 'yt-dlp' executable on PATH
  try {
    execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' });
    cachedYtDlp = { command: 'yt-dlp', argsPrefix: [] };
    return cachedYtDlp;
  } catch {
    // ignore
  }

  // 4. Check common Linux / Render installation paths
  const commonLinuxPaths = [
    path.join(process.env.HOME || '/root', '.local/bin/yt-dlp'),
    '/opt/render/.local/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];

  for (const linuxPath of commonLinuxPaths) {
    if (fs.existsSync(linuxPath)) {
      try {
        execFileSync(linuxPath, ['--version'], { stdio: 'ignore' });
        cachedYtDlp = { command: linuxPath, argsPrefix: [] };
        return cachedYtDlp;
      } catch {
        // ignore
      }
    }
  }

  // 5. Try python -m yt_dlp
  for (const py of ['python3', 'python']) {
    try {
      execFileSync(py, ['-m', 'yt_dlp', '--version'], { stdio: 'ignore' });
      cachedYtDlp = { command: py, argsPrefix: ['-m', 'yt_dlp'] };
      return cachedYtDlp;
    } catch {
      // ignore
    }
  }

  // 6. Auto-download binary fallback if missing
  try {
    const downloadedPath = downloadYtDlpSync(localBinPath);
    if (downloadedPath && fs.existsSync(downloadedPath)) {
      cachedYtDlp = { command: downloadedPath, argsPrefix: [] };
      return cachedYtDlp;
    }
  } catch (downloadErr) {
    console.error('Failed auto-downloading yt-dlp binary:', downloadErr);
  }

  // Final fallback to system command
  cachedYtDlp = { command: 'yt-dlp', argsPrefix: [] };
  return cachedYtDlp;
}

function downloadYtDlpSync(targetPath: string): string | null {
  const binDir = path.dirname(targetPath);
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const isWin = process.platform === 'win32';
  const url = isWin
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  try {
    if (isWin) {
      execFileSync('powershell', ['-Command', `Invoke-WebRequest -Uri '${url}' -OutFile '${targetPath}'`], { stdio: 'ignore' });
    } else {
      execFileSync('curl', ['-L', url, '-o', targetPath], { stdio: 'ignore' });
      fs.chmodSync(targetPath, 0o755);
    }
    if (fs.existsSync(targetPath)) {
      return targetPath;
    }
  } catch {
    try {
      execFileSync('wget', ['-O', targetPath, url], { stdio: 'ignore' });
      if (!isWin) fs.chmodSync(targetPath, 0o755);
      if (fs.existsSync(targetPath)) return targetPath;
    } catch {
      // ignore
    }
  }

  return null;
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
  for (const py of ['python3', 'python']) {
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
    ytVersion = output.split('\n')[0] || output || null;
  } catch (err: any) {
    ytAvailable = false;
    ytVersion = (err && typeof err.message === 'string' ? err.message : null);
  }

  let ffmpegAvailable = false;
  let ffmpegVersion: string | null = null;
  try {
    const output = execFileSync(ffmpegPath, ['-version'], { encoding: 'utf-8', timeout: 5000 }).trim();
    ffmpegAvailable = true;
    const match = output.match(/ffmpeg version ([^\s]+)/i);
    ffmpegVersion = match && match[1] ? match[1] : (output.split('\n')[0] || null);
  } catch (err: any) {
    ffmpegAvailable = false;
    ffmpegVersion = (err && typeof err.message === 'string' ? err.message : null);
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
