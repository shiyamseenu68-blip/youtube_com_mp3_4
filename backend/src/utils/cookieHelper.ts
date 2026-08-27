import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface CookieFileHandle {
  filePath: string | null;
  cleanup: () => void;
}

/**
 * Creates a temporary Netscape-format cookie file if YOUTUBE_COOKIES_TEXT is configured.
 * Uses a cryptographically random filename and restrictive permissions (0600).
 */
export function createTempCookieFile(): CookieFileHandle {
  const cookieText = process.env.YOUTUBE_COOKIES_TEXT;

  if (!cookieText || !cookieText.trim()) {
    return {
      filePath: null,
      cleanup: () => {},
    };
  }

  try {
    const randomId = crypto.randomBytes(16).toString('hex');
    const tempFilePath = path.join(os.tmpdir(), `yt_cookies_${randomId}.txt`);

    // Write file with restrictive mode permissions (0o600)
    fs.writeFileSync(tempFilePath, cookieText.trim(), { mode: 0o600 });

    return {
      filePath: tempFilePath,
      cleanup: () => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch {
          // ignore cleanup errors
        }
      },
    };
  } catch {
    return {
      filePath: null,
      cleanup: () => {},
    };
  }
}

/**
 * Safe diagnostic indicator (returns boolean only)
 */
export function isYouTubeCookiesConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_COOKIES_TEXT && process.env.YOUTUBE_COOKIES_TEXT.trim());
}
