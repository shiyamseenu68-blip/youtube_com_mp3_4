import React from 'react';
import { Youtube, Instagram, ShieldCheck, Activity } from 'lucide-react';
import { HealthResponse } from '../types/api';

interface NavbarProps {
  health: HealthResponse | null;
}

export const Navbar: React.FC<NavbarProps> = ({ health }) => {
  const isHealthy = health?.status === 'ok' && health?.ytDlp?.available;

  return (
    <header className="border-b border-gray-800 bg-[#0F1626]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-white text-xl tracking-wider">SF</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              StreamForge
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO
              </span>
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">YouTube + Instagram Downloader</p>
          </div>
        </div>

        {/* Platform Badges & Health */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20">
            <Youtube className="w-4 h-4" />
            <span className="hidden xs:inline">YouTube</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 text-xs font-semibold border border-pink-500/20">
            <Instagram className="w-4 h-4" />
            <span className="hidden xs:inline">Instagram</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              isHealthy
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title={health ? `yt-dlp ${health.ytDlp.version || 'OK'}, FFmpeg ${health.ffmpeg.version || 'OK'}` : 'Checking server'}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{isHealthy ? 'System Ready' : 'Connecting'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
