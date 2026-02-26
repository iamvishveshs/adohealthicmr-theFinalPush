/**
 * Upload Progress Bar Component
 * 
 * Displays upload progress with visual progress bar and percentage
 */

import React from 'react';

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
  // Calculate compression info if available
  const compressionInfo = originalSize && compressedSize && compressedSize < originalSize
    ? {
        reduction: ((1 - compressedSize / originalSize) * 100).toFixed(1),
        originalMB: (originalSize / 1024 / 1024).toFixed(2),
        compressedMB: (compressedSize / 1024 / 1024).toFixed(2),
      }
    : null;

  // Calculate upload size info
  const uploadSizeInfo = uploadedBytes && totalBytes
    ? {
        uploadedMB: (uploadedBytes / 1024 / 1024).toFixed(2),
        totalMB: (totalBytes / 1024 / 1024).toFixed(2),
      }
    : null;

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">{message}</span>
        <span className="text-sm font-bold text-blue-700">{progress}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Upload size info */}
      {uploadSizeInfo && stage === 'uploading' && (
        <div className="text-xs text-blue-600 mt-1">
          {uploadSizeInfo.uploadedMB}MB / {uploadSizeInfo.totalMB}MB
        </div>
      )}

      {/* Compression info */}
      {compressionInfo && stage !== 'compressing' && (
        <div className="text-xs text-blue-600 mt-1">
          Compressed: {compressionInfo.originalMB}MB → {compressionInfo.compressedMB}MB ({compressionInfo.reduction}% reduction)
        </div>
      )}

      {/* Stage indicator */}
      <div className="text-xs text-blue-500 mt-1 capitalize">
        {stage === 'compressing' && '🔄 Compressing...'}
        {stage === 'uploading' && '📤 Uploading to Cloudinary...'}
        {stage === 'complete' && '✅ Upload complete!'}
      </div>
    </div>
  );
}
