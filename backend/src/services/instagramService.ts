import { ytdlpService, MediaMetadata } from './ytdlpService';

export class InstagramService {
  public async analyzeInstagramUrl(url: string): Promise<MediaMetadata> {
    try {
      const metadata = await ytdlpService.analyzeUrl(url, 'instagram');
      return metadata;
    } catch (err: any) {
      if (err.message.includes('verification') || err.message.includes('login') || err.message.includes('private')) {
        throw new Error('This Instagram post/reel is private or requires authentication to access.');
      }
      throw err;
    }
  }

  public async downloadInstagramMedia(
    url: string,
    format: 'mp4' | 'mp3',
    outputDir: string,
    outputFilenameWithoutExt: string,
    onProgress: (percent: number, speed: string, eta: string, stage: string) => void
  ): Promise<string> {
    return ytdlpService.downloadMedia(
      url,
      format,
      outputDir,
      outputFilenameWithoutExt,
      onProgress
    );
  }
}

export const instagramService = new InstagramService();
