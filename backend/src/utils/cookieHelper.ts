import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface CookieFileHandle {
  filePath: string | null;
  rowCount: number;
  cleanup: () => void;
}

/**
 * Counts non-comment, non-empty cookie rows in Netscape cookie text
 */
export function getCookieRowCount(cookieText?: string): number {
  if (!cookieText) return 0;
  return cookieText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .length;
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
      rowCount: 0,
      cleanup: () => {},
    };
  }

  const rowCount = getCookieRowCount(cookieText);

  try {
    const randomId = crypto.randomBytes(16).toString('hex');
    const tempFilePath = path.join(os.tmpdir(), `yt_cookies_${randomId}.txt`);

    // Write file with restrictive mode permissions (0o600)
    fs.writeFileSync(tempFilePath, cookieText.trim(), { mode: 0o600 });

    return {
      filePath: tempFilePath,
      rowCount,
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
      rowCount: 0,
      cleanup: () => {},
    };
  }
}

/**
 * Safe diagnostic indicator (returns boolean only)
 */
export function isYouTubeCookiesConfigured(): boolean {
  return getCookieRowCount(process.env.YOUTUBE_COOKIES_TEXT) > 0;
}

/**
 * Retrieves configured PO Token if available (for GVS / BotGuard / SABR YouTube verification)
 */
export function getYouTubePoToken(): string | null {
  const token = process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN;
  if (!token || !token.trim()) return null;
  return token.trim();
}
