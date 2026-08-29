import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface CookieFileHandle {
  filePath: string | null;
  rowCount: number;
  cleanup: () => void;
}

export interface CookieNameAudit {
  name: string;
  status: 'PRESENT' | 'ABSENT' | 'EXPIRED';
}

export interface CookieInspectionResult {
  totalValidRows: number;
  expiredRows: number;
  nonExpiredRows: number;
  domains: string[];
  cookieAudits: CookieNameAudit[];
}

/**
 * Safely inspects Netscape cookie text and returns non-sensitive structural diagnostics
 */
export function inspectCookiesDetailed(): CookieInspectionResult | null {
  const cookieText = process.env.YOUTUBE_COOKIES_TEXT;
  if (!cookieText || !cookieText.trim()) return null;

  const lines = cookieText.split('\n');
  const nowSec = Math.floor(Date.now() / 1000);

  const domains = new Set<string>();
  const cookieStatusMap = new Map<string, 'PRESENT' | 'EXPIRED'>();

  let totalValidRows = 0;
  let expiredRows = 0;
  let nonExpiredRows = 0;

  const targetNames = [
    'LOGIN_INFO',
    'SID',
    'HSID',
    'SSID',
    'SAPISID',
    '__Secure-1PSID',
    '__Secure-3PSID',
    'VISITOR_INFO1_LIVE',
    'PREF'
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length >= 7) {
      totalValidRows++;
      const domain = parts[0];
      const expiry = parseInt(parts[4], 10);
      const name = parts[5];

      domains.add(domain);

      const isExpired = !isNaN(expiry) && expiry > 0 && expiry < nowSec;
      if (isExpired) {
        expiredRows++;
        if (!cookieStatusMap.has(name)) {
          cookieStatusMap.set(name, 'EXPIRED');
        }
      } else {
        nonExpiredRows++;
        cookieStatusMap.set(name, 'PRESENT');
      }
    }
  }

  const cookieAudits: CookieNameAudit[] = targetNames.map(name => {
    const status = cookieStatusMap.get(name) || 'ABSENT';
    return { name, status };
  });

  return {
    totalValidRows,
    expiredRows,
    nonExpiredRows,
    domains: Array.from(domains),
    cookieAudits
  };
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
