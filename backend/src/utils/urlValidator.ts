import { URL } from 'url';

export type SupportedPlatform = 'youtube' | 'instagram';

export interface ValidatedUrlResult {
  isValid: boolean;
  platform: SupportedPlatform | null;
  normalizedUrl: string | null;
  error?: string;
}

export function validateAndDetectUrl(inputUrl: string): ValidatedUrlResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      isValid: false,
      platform: null,
      normalizedUrl: null,
      error: 'Please provide a valid URL.',
    };
  }

  const trimmed = inputUrl.trim();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      platform: null,
      normalizedUrl: null,
      error: 'Invalid URL format. Please paste a full web address (e.g. https://www.youtube.com/watch?v=...)',
    };
  }

  // Protocol check
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      isValid: false,
      platform: null,
      normalizedUrl: null,
      error: 'Only HTTP and HTTPS URLs are supported.',
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // SSRF Protection: Check for IP addresses or local hostnames
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return {
      isValid: false,
      platform: null,
      normalizedUrl: null,
      error: 'Access to private or local network addresses is strictly prohibited.',
    };
  }

  // YouTube matchers
  const isYouTubeDomain =
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be';

  if (isYouTubeDomain) {
    // Validate YouTube path structure
    if (hostname === 'youtu.be') {
      if (parsedUrl.pathname.length > 1) {
        return {
          isValid: true,
          platform: 'youtube',
          normalizedUrl: parsedUrl.toString(),
        };
      }
    } else {
      const isWatch = parsedUrl.pathname === '/watch' && parsedUrl.searchParams.has('v');
      const isShorts = parsedUrl.pathname.startsWith('/shorts/');
      const isEmbed = parsedUrl.pathname.startsWith('/embed/');
      const isV = parsedUrl.pathname.startsWith('/v/');

      if (isWatch || isShorts || isEmbed || isV) {
        return {
          isValid: true,
          platform: 'youtube',
          normalizedUrl: parsedUrl.toString(),
        };
      }
    }

    return {
      isValid: false,
      platform: 'youtube',
      normalizedUrl: null,
      error: 'Unsupported YouTube URL format. Please paste a link to a YouTube Video or Short.',
    };
  }

  // Instagram matchers
  const isInstagramDomain =
    hostname === 'instagram.com' || hostname.endsWith('.instagram.com');

  if (isInstagramDomain) {
    const isPost = parsedUrl.pathname.startsWith('/p/');
    const isReel = parsedUrl.pathname.startsWith('/reel/') || parsedUrl.pathname.startsWith('/reels/');
    const isTv = parsedUrl.pathname.startsWith('/tv/');

    if (isPost || isReel || isTv) {
      return {
        isValid: true,
        platform: 'instagram',
        normalizedUrl: parsedUrl.toString(),
      };
    }

    return {
      isValid: false,
      platform: 'instagram',
      normalizedUrl: null,
      error: 'Unsupported Instagram URL format. Please paste a link to a public Instagram post or Reel.',
    };
  }

  // Unsupported platform
  return {
    isValid: false,
    platform: null,
    normalizedUrl: null,
    error: 'Only YouTube and Instagram URLs are supported.',
  };
}
