"use client";

import React, { useMemo } from 'react';

interface UploadProgressBarProps {
  progress: number; // 0-100
  message: string;
  stage: 'compressing' | 'uploading' | 'complete';
  originalSize?: number;
  compressedSize?: number;
  uploadedBytes?: number;
  totalBytes?: number;
}

export default function UploadProgressBar({
  progress,
  message,
  stage,
  originalSize,
  compressedSize,
  uploadedBytes,
  totalBytes,
}: UploadProgressBarProps) {

  // Logic: Ensure progress is a valid number between 0-100
  // If progress is jammed at 0, we force it to 1% while active to show movement
  const displayProgress = useMemo(() => {
    const value = Math.min(Math.max(progress || 0, 0), 100);
    if (value === 0 && stage !== 'complete') return 1;
    return value;
  }, [progress, stage]);

  const compressionInfo = originalSize && compressedSize && compressedSize < originalSize
    ? {
      reduction: ((1 - compressedSize / originalSize) * 100).toFixed(1),
      originalMB: (originalSize / 1024 / 1024).toFixed(2),
      compressedMB: (compressedSize / 1024 / 1024).toFixed(2),
    }
    : null;

  const uploadSizeInfo = uploadedBytes && totalBytes
    ? {
      uploadedMB: (uploadedBytes / 1024 / 1024).toFixed(2),
      totalMB: (totalBytes / 1024 / 1024).toFixed(2),
    }
    : null;

  return (
    <>
      {/* Inside your UploadProgressBar.tsx return statement */}
<div className="flex items-center justify-between mb-2">
  {/* Status Message - Deep Blue */}
  <span className="text-xs font-bold text-blue-900 uppercase tracking-tight">
    {message}
  </span>

  {/* Percentage - Bright Yellow/Amber to stand out */}
  <span className="text-xs font-black text-amber-600 italic tabular-nums">
    {progress}%
  </span>
</div>

{/* Progress bar track */}
<div className="w-full bg-blue-100 rounded-full h-3 mb-2 overflow-hidden border border-blue-200">
  <div
    className="bg-blue-600 h-full rounded-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) shadow-inner"
    style={{ width: `${progress}%` }}
  />
</div>

{/* Upload Details Row */}
<div className="flex justify-between items-center mt-1">
  {uploadSizeInfo && stage === 'uploading' && (
    <>
      {/* Transferred Data - Muted Slate Blue */}
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {uploadSizeInfo.uploadedMB}MB <span className="text-slate-300">/</span> {uploadSizeInfo.totalMB}MB
      </span>

      {/* Logic for Speed - Teal/Emerald for "Performance" metrics */}
      {/* If you are passing 'speed' as a prop, use it here, otherwise it's in the message above */}
      <span className="text-xs font-black text-emerald-600 uppercase tracking-tighter">
        Verified Transmission
      </span>
    </>
  )}
</div>
    </>);
}