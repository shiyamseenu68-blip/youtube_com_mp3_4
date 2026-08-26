import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-gray-800/80 bg-[#0A0E18] py-8 text-center text-xs text-gray-500">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>StreamForge Media Downloader</span>
        </div>
        <p className="max-w-xl leading-relaxed text-gray-400">
          Extract public YouTube videos, Shorts, Instagram posts, and Reels cleanly in high quality MP4 and MP3 format. Strictly respects platform access controls.
        </p>
        <div className="flex items-center gap-4 pt-2 text-gray-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Secure Processing
          </span>
          <span>•</span>
          <span>No Login Required</span>
          <span>•</span>
          <span>Zero Cookie Retention</span>
        </div>
        <p className="pt-2 text-[11px] text-gray-600">
          © {new Date().getFullYear()} StreamForge. All media processing occurs on isolated backend engines.
        </p>
      </div>
    </footer>
  );
};
