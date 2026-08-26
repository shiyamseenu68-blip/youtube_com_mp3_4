import { execFile } from 'child_process';
import { getFfmpegPath } from '../config/binaries';

export interface FileMediaInfo {
  hasVideo: boolean;
  hasAudio: boolean;
  duration: number;
  formatName: string;
}

export class FfmpegService {
  /**
   * Verify if input file is a valid media container (MP4 or MP3)
   */
  public verifyMediaFile(filePath: string): Promise<FileMediaInfo> {
    return new Promise((resolve, reject) => {
      const ffmpegPath = getFfmpegPath();
      const ffprobePath = ffmpegPath.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');

      execFile(
        ffprobePath,
        [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          filePath,
        ],
        (err, stdout) => {
          if (err) {
            // If ffprobe is not present next to ffmpeg, fallback to ffmpeg test parse
            return resolve(this.fallbackFfmpegVerify(filePath));
          }

          try {
            const data = JSON.parse(stdout);
            const streams = data.streams || [];
            const hasVideo = streams.some((s: any) => s.codec_type === 'video');
            const hasAudio = streams.some((s: any) => s.codec_type === 'audio');
            const duration = parseFloat(data.format?.duration || '0');

            resolve({
              hasVideo,
              hasAudio,
              duration,
              formatName: data.format?.format_name || 'unknown',
            });
          } catch {
            resolve({ hasVideo: false, hasAudio: false, duration: 0, formatName: 'unknown' });
          }
        }
      );
    });
  }

  private fallbackFfmpegVerify(filePath: string): Promise<FileMediaInfo> {
    return new Promise((resolve) => {
      const ffmpegPath = getFfmpegPath();

      execFile(ffmpegPath, ['-i', filePath], (err, stdout, stderr) => {
        const output = (stderr || '') + (stdout || '');
        const hasVideo = output.includes('Stream #') && output.includes('Video:');
        const hasAudio = output.includes('Stream #') && output.includes('Audio:');
        const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);

        let duration = 0;
        if (durationMatch) {
          const hours = parseFloat(durationMatch[1]);
          const mins = parseFloat(durationMatch[2]);
          const secs = parseFloat(durationMatch[3]);
          duration = hours * 3600 + mins * 60 + secs;
        }

        resolve({
          hasVideo,
          hasAudio,
          duration,
          formatName: filePath.endsWith('.mp3') ? 'mp3' : 'mp4',
        });
      });
    });
  }
}

export const ffmpegService = new FfmpegService();
