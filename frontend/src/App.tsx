import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { DownloadProgress } from './components/DownloadProgress';
import { Footer } from './components/Footer';
import { apiClient } from './services/apiClient';
import { AnalyzeResponse, HealthResponse, JobProgressData } from './types/api';
import { AlertCircle, Youtube, Instagram, Sparkles, Film, Music } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedMedia, setAnalyzedMedia] = useState<AnalyzeResponse | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [progressData, setProgressData] = useState<JobProgressData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    // Initial health check
    apiClient
      .getHealth()
      .then(setHealth)
      .catch((err) => console.error('Server health check failed:', err));
  }, []);

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalyzedMedia(null);
    setProgressData(null);
    setActiveJobId(null);
    setCurrentUrl(url);

    try {
      const data = await apiClient.analyzeUrl(url);
      if (data.success) {
        setAnalyzedMedia(data);
      } else {
        setErrorMessage(data.error || 'Failed to analyze URL.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to connect to media extraction server.';
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartDownload = async (format: 'mp4' | 'mp3') => {
    if (!currentUrl) return;

    setSelectedFormat(format);
    setErrorMessage(null);
    setProgressData({
      jobId: '',
      status: 'pending',
      percent: 0,
      speed: '0 KiB/s',
      eta: '--:--',
      stage: 'Initializing download request...',
    });

    try {
      const { jobId } = await apiClient.initiateDownload(currentUrl, format);
      setActiveJobId(jobId);

      // Subscribe to Server-Sent Events (SSE)
      apiClient.listenToProgress(
        jobId,
        (data) => {
          setProgressData(data);
        },
        (errorMsg) => {
          setErrorMessage(errorMsg);
        }
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to initiate download process.';
      setErrorMessage(msg);
      setProgressData(null);
    }
  };

  const handleSaveFile = () => {
    if (activeJobId) {
      const fileUrl = apiClient.getFileDownloadUrl(activeJobId);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setAnalyzedMedia(null);
    setProgressData(null);
    setActiveJobId(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      <Navbar health={health} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center justify-start gap-8 sm:gap-12">
        {/* Hero Banner Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast & Free YouTube + Instagram Media Downloader</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Download Media in <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              High Quality MP4 or MP3
            </span>
          </h2>

          <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto">
            Paste any public YouTube video, Shorts, Instagram Reel, or post URL to instantly analyze and download.
          </p>
        </div>

        {/* Primary Input Form */}
        <UrlForm onAnalyze={handleAnalyze} isLoading={isAnalyzing} />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="w-full max-w-3xl bg-red-500/10 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-red-300 text-sm shadow-xl animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-red-200 mb-1">Extraction Notice</h4>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Active Download Progress Widget */}
        {progressData && (
          <DownloadProgress
            progress={progressData}
            onDownloadFile={handleSaveFile}
            onReset={handleReset}
            format={selectedFormat}
          />
        )}

        {/* Analyzed Media Card Preview (Show only if no active download progress) */}
        {analyzedMedia && !progressData && (
          <MediaCard
            data={analyzedMedia}
            onSelectFormat={handleStartDownload}
            isDownloading={!!activeJobId}
          />
        )}

        {/* Feature Highlights Grid (When Idle) */}
        {!analyzedMedia && !progressData && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 rounded-2xl bg-[#131926] border border-gray-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                <Youtube className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">YouTube & Shorts</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Full support for public YouTube videos and YouTube Shorts with instant metadata parsing and stream extraction.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#131926] border border-gray-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
                <Instagram className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Instagram Reels & Posts</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Extract video or audio from publicly shared Instagram video posts and Instagram Reels cleanly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#131926] border border-gray-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Music className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">MP4 & MP3 Output</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Choose full HD MP4 video downloads or crisp 192kbps MP3 audio extractions powered by FFmpeg.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
