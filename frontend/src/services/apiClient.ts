import axios from 'axios';
import { AnalyzeResponse, HealthResponse, JobProgressData } from '../types/api';

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

const API_BASE = getApiBaseUrl();

export const apiClient = {
  async getHealth(): Promise<HealthResponse> {
    const res = await axios.get<HealthResponse>(`${API_BASE}/health`);
    return res.data;
  },

  async analyzeUrl(url: string): Promise<AnalyzeResponse> {
    const res = await axios.post<AnalyzeResponse>(`${API_BASE}/analyze`, { url });
    return res.data;
  },

  async initiateDownload(url: string, format: 'mp4' | 'mp3'): Promise<{ jobId: string }> {
    const res = await axios.post<{ success: boolean; jobId: string }>(`${API_BASE}/download`, {
      url,
      format,
    });
    return res.data;
  },

  listenToProgress(
    jobId: string,
    onUpdate: (data: JobProgressData) => void,
    onError: (error: string) => void
  ): EventSource {
    const sseUrl = `${API_BASE}/download/${jobId}/progress`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data: JobProgressData = JSON.parse(event.data);
        onUpdate(data);
        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    eventSource.onerror = () => {
      onError('Lost connection to server progress stream.');
      eventSource.close();
    };

    return eventSource;
  },

  getFileDownloadUrl(jobId: string): string {
    return `${API_BASE}/download/${jobId}/file`;
  },
};
