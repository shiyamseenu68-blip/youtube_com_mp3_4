import React, { useState, useEffect } from 'react';
import { Search, Clipboard, X, Youtube, Instagram, Loader2, Link2 } from 'lucide-react';
import { PlatformType } from '../types/api';

interface UrlFormProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const UrlForm: React.FC<UrlFormProps> = ({ onAnalyze, isLoading, disabled }) => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformType | null>(null);

  useEffect(() => {
    const lower = url.trim().toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      setDetectedPlatform('youtube');
    } else if (lower.includes('instagram.com')) {
      setDetectedPlatform('instagram');
    } else {
      setDetectedPlatform(null);
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading && !disabled) {
      onAnalyze(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch {
      // Ignore if clipboard access is denied
    }
  };

  const handleClear = () => {
    setUrl('');
    setDetectedPlatform(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-[#151C2C] border-2 border-gray-700/70 focus-within:border-indigo-500 rounded-2xl shadow-2xl transition-all duration-200 overflow-hidden p-2 gap-2">
          {/* Input Icon / Platform Indicator */}
          <div className="pl-3 flex items-center justify-center text-gray-400">
            {detectedPlatform === 'youtube' ? (
              <Youtube className="w-6 h-6 text-red-500 animate-fade-in" />
            ) : detectedPlatform === 'instagram' ? (
              <Instagram className="w-6 h-6 text-pink-500 animate-fade-in" />
            ) : (
              <Link2 className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {/* Text Input */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube or Instagram link here..."
            className="w-full bg-transparent text-white placeholder-gray-400 text-base sm:text-lg focus:outline-none px-2 py-2"
            disabled={isLoading || disabled}
            aria-label="Media URL input"
          />

          {/* Quick Clear Action */}
          {url && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Clear input"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Clipboard Paste Action */}
          <button
            type="button"
            onClick={handlePaste}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-all"
            title="Paste from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          {/* Submit / Analyze Action Button */}
          <button
            type="submit"
            disabled={!url.trim() || isLoading || disabled}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base shadow-lg shadow-indigo-600/30 transition-all min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>

        {/* Platform detection indicator tag under bar */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400 px-2">
          <span>Supported: YouTube Videos & Shorts, Instagram Reels & Public Posts</span>
          {detectedPlatform && (
            <span className="font-semibold text-indigo-400 capitalize">
              Detected: {detectedPlatform}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
