import React from 'react';
import { Video, Music, Clock, User, Youtube, Instagram, Download } from 'lucide-react';
import { AnalyzeResponse } from '../types/api';

interface MediaCardProps {
  data: AnalyzeResponse;
  onSelectFormat: (format: 'mp4' | 'mp3') => void;
  isDownloading: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ data, onSelectFormat, isDownloading }) => {
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'Live / N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#151C2C] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
        {/* Media Thumbnail */}
        <div className="relative w-full md:w-64 h-44 sm:h-48 rounded-xl overflow-hidden bg-gray-900 flex-shrink-0 group">
          {data.thumbnail ? (
            <img
              src={data.thumbnail}
              alt={data.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Fallback thumbnail
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <Video className="w-12 h-12" />
            </div>
          )}

          {/* Platform Tag Badge */}
          <div className="absolute top-3 left-3">
            {data.platform === 'youtube' ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/90 text-white text-xs font-bold shadow-md backdrop-blur-sm">
                <Youtube className="w-3.5 h-3.5" />
                YouTube
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md backdrop-blur-sm">
                <Instagram className="w-3.5 h-3.5" />
                Instagram
              </span>
            )}
          </div>

          {/* Duration Badge */}
          {data.duration > 0 && (
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/80 text-white text-xs font-mono font-medium flex items-center gap-1 backdrop-blur-sm">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{formatDuration(data.duration)}</span>
            </div>
          )}
        </div>

        {/* Media Info & Download Buttons */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
              {data.title}
            </h2>

            {data.uploader && (
              <p className="text-sm text-gray-400 mt-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-400" />
                <span>{data.uploader}</span>
              </p>
            )}
          </div>

          {/* Download Action Section */}
          <div className="mt-6 pt-4 border-t border-gray-800/80">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Select Output Format:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* MP4 Download Button */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => onSelectFormat('mp4')}
                className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20"
              >
                <Video className="w-4 h-4" />
                <span>Download MP4</span>
                <Download className="w-4 h-4 ml-auto opacity-70" />
              </button>

              {/* MP3 Download Button */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => onSelectFormat('mp3')}
                className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20"
              >
                <Music className="w-4 h-4" />
                <span>Download MP3</span>
                <Download className="w-4 h-4 ml-auto opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
