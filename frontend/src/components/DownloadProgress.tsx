import React from 'react';
import { Download, Loader2, CheckCircle2, AlertTriangle, Zap, Clock, FileAudio, FileVideo } from 'lucide-react';
import { JobProgressData } from '../types/api';

interface DownloadProgressProps {
  progress: JobProgressData;
  onDownloadFile: () => void;
  onReset: () => void;
  format: 'mp4' | 'mp3';
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  progress,
  onDownloadFile,
  onReset,
  format,
}) => {
  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#151C2C] border border-gray-800 rounded-2xl p-6 shadow-2xl transition-all duration-300">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isFailed
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isFailed ? (
              <AlertTriangle className="w-5 h-5" />
            ) : format === 'mp3' ? (
              <FileAudio className="w-5 h-5" />
            ) : (
              <FileVideo className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white text-base sm:text-lg">
              {isCompleted
                ? 'Extraction Complete!'
                : isFailed
                ? 'Download Failed'
                : `Extracting ${format.toUpperCase()} Media`}
            </h3>
            <p className="text-xs text-gray-400 truncate max-w-md">{progress.stage}</p>
          </div>
        </div>

        <span className="font-mono text-xl font-bold text-white">
          {progress.percent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800 mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : isFailed
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 animate-pulse'
          }`}
          style={{ width: `${Math.min(Math.max(progress.percent, 3), 100)}%` }}
        />
      </div>

      {/* Metrics Row (Speed & ETA) */}
      {!isCompleted && !isFailed && (
        <div className="flex items-center justify-between text-xs text-gray-400 mb-6 bg-gray-900/50 px-4 py-2.5 rounded-xl border border-gray-800/50">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Speed: <strong className="text-gray-200">{progress.speed || 'Calculating...'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>ETA: <strong className="text-gray-200">{progress.eta || '--:--'}</strong></span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {isFailed && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-6">
          <p className="font-semibold text-red-200 mb-1">Notice</p>
          <p>{progress.error || 'Media download failed.'}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-800 transition-colors"
        >
          {isCompleted ? 'Convert Another' : 'Cancel'}
        </button>

        {isCompleted && (
          <button
            type="button"
            onClick={onDownloadFile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>Save {format.toUpperCase()} File</span>
          </button>
        )}
      </div>
    </div>
  );
};
