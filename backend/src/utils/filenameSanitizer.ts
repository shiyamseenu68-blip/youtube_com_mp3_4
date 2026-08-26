import sanitize from 'sanitize-filename';

export function sanitizeTitleToFilename(title: string, fallback: string = 'media_download'): string {
  if (!title || typeof title !== 'string') {
    return fallback;
  }

  // Remove illegal characters and trim whitespace
  let clean = sanitize(title)
    .replace(/[^\w\s\-\.\(\)\[\]]/gi, '_')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length === 0) {
    return fallback;
  }

  // Limit filename length to 100 chars to avoid filesystem issues
  if (clean.length > 100) {
    clean = clean.substring(0, 100).trim();
  }

  return clean;
}
