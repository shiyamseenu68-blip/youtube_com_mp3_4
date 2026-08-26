export type PlatformType = 'youtube' | 'instagram';

export interface FormatOption {
  formatId: string;
  ext: string;
  resolution?: string;
  filesize?: number;
}

export interface AnalyzeResponse {
  success: boolean;
  platform: PlatformType;
  title: string;
  thumbnail: string;
  duration: number;
  uploader?: string;
  formats: FormatOption[];
  error?: string;
}

export interface JobProgressData {
  jobId: string;
  status: 'pending' | 'analyzing' | 'downloading' | 'processing' | 'completed' | 'failed';
  percent: number;
  speed: string;
  eta: string;
  stage: string;
  filename?: string;
  error?: string;
}

export interface HealthResponse {
  status: string;
  environment: string;
  ytDlp: {
    available: boolean;
    version: string | null;
  };
  ffmpeg: {
    available: boolean;
    version: string | null;
  };
}
