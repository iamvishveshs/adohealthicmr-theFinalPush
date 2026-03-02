"use client";

import React, { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  className?: string;
  onError?: (error: Error) => void;
  showControls?: boolean;
}

/**
 * Reusable VideoPlayer component with Cloudinary optimizations
 * 
 * Features:
 * - Uses secure_url from Cloudinary
 * - Applies f_auto,q_auto optimizations
 * - Shows thumbnail/poster before playback
 * - Handles processing errors gracefully
 * - Full video controls
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  poster,
  className = '',
  onError,
  showControls = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Optimize Cloudinary URL with f_mp4,f_auto,q_auto for full compatibility
  // Ensure it's a video URL, not a thumbnail/image
  // Verify URL exists before attempting to play
  const getOptimizedUrl = (videoUrl: string): string => {
    if (!videoUrl) return videoUrl;
    
    // If it's a Cloudinary URL
    if (videoUrl.includes('res.cloudinary.com')) {
      // Check if it's a video URL (not a thumbnail/image)
      if (videoUrl.includes('/video/upload/')) {
        // Check if this is actually a thumbnail image (has image transformations or .jpg/.png extension)
        const isThumbnail = videoUrl.includes('/w_') || 
                           videoUrl.includes('/h_') || 
                           videoUrl.includes('/c_') ||
                           videoUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                           videoUrl.includes('/f_jpg') ||
                           videoUrl.includes('/f_png');
        
        if (isThumbnail) {
          // Extract public_id from thumbnail URL and construct video URL
          const publicIdMatch = videoUrl.match(/\/video\/upload\/[^\/]*\/([^\/\.]+)/);
          if (publicIdMatch) {
            const publicId = publicIdMatch[1];
            const cloudName = videoUrl.match(/res\.cloudinary\.com\/([^\/]+)/)?.[1] || 'adohealth';
            // Return video URL with optimizations: f_mp4 for explicit format, q_auto for quality
            return `https://res.cloudinary.com/${cloudName}/video/upload/f_mp4,q_auto/${publicId}`;
          }
        }
        
        // It's already a video URL, just ensure optimizations are applied
        let cleanUrl = videoUrl;
        
        // Remove any image-specific transformations if they exist
        cleanUrl = cleanUrl.replace(/\/w_\d+/g, '');
        cleanUrl = cleanUrl.replace(/\/h_\d+/g, '');
        cleanUrl = cleanUrl.replace(/\/c_[^\/]+/g, '');
        cleanUrl = cleanUrl.replace(/\/f_jpg/g, '');
        cleanUrl = cleanUrl.replace(/\/f_png/g, '');
        cleanUrl = cleanUrl.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        
        // Check if optimizations are already applied
        // Apply f_mp4,f_auto,q_auto for full compatibility (f_mp4 explicit, f_auto fallback, q_auto quality)
        if (!cleanUrl.includes('f_mp4') || !cleanUrl.includes('f_auto') || !cleanUrl.includes('q_auto')) {
          // Remove existing transformations if present
          cleanUrl = cleanUrl.replace(/\/upload\/[^\/]+\//, '/upload/');
          // Apply f_mp4,f_auto,q_auto transformations
          cleanUrl = cleanUrl.replace('/upload/', '/upload/f_mp4,f_auto,q_auto/');
        }
        
        return cleanUrl;
      }
    }
    
    return videoUrl;
  };

  const optimizedUrl = getOptimizedUrl(url);

  // Verify Cloudinary URL format is valid before attempting to play
  const isValidCloudinaryUrl = (url: string): boolean => {
    if (!url) return false;
    if (!url.includes('res.cloudinary.com')) return true; // Non-Cloudinary URLs are assumed valid
    if (!url.includes('/video/upload/')) return false; // Must be a video upload URL
    // Check for valid URL format
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const urlValid = isValidCloudinaryUrl(optimizedUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !urlValid) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setIsProcessing(false);
      setHasError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      
      const error = video.error;
      if (error) {
        let message = 'Failed to load video';
        
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Video loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'Network error while loading video. The video may still be processing.';
            setIsProcessing(true);
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Video decoding error. The video format may not be supported.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Video format not supported by your browser';
            break;
        }
        
        setErrorMessage(message);
        
        if (onError) {
          onError(new Error(message));
        }
        
        console.error('Video player error:', {
          code: error.code,
          message: error.message,
          url: optimizedUrl,
        });
      }
    };

    const handleWaiting = () => {
      setIsProcessing(true);
    };

    const handlePlaying = () => {
      setIsProcessing(false);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [optimizedUrl, onError, urlValid]);

  if (!optimizedUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <p className="text-gray-600 text-sm">No video URL provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {isProcessing && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-center">
              <div className="animate-pulse text-white text-sm mb-2">⏳</div>
              <p className="text-white text-xs">Video is processing...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75 z-10">
            <div className="text-center p-4">
              <p className="text-white text-sm font-medium mb-2">⚠️ Video Error</p>
              <p className="text-white text-xs mb-4">{errorMessage || 'Failed to load video'}</p>
              {isProcessing && (
                <p className="text-white text-xs">
                  The video may still be processing on Cloudinary. Please try again in a few moments.
                </p>
              )}
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          src={urlValid ? optimizedUrl : undefined}
          poster={poster}
          controls={showControls}
          controlsList="nodownload"
          className="w-full h-full object-contain"
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          onError={(e) => {
            const videoElement = e.currentTarget;
            const error = videoElement.error;
            
            if (error) {
              let message = 'Failed to load video';
              
              switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                  message = 'Video loading was aborted';
                  break;
                case MediaError.MEDIA_ERR_NETWORK:
                  message = 'Network error. The video may still be processing on Cloudinary.';
                  setIsProcessing(true);
                  break;
                case MediaError.MEDIA_ERR_DECODE:
                  message = 'Video decoding error. The file may be corrupted.';
                  break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  message = 'Video format not supported. Please try a different browser.';
                  break;
              }
              
              setHasError(true);
              setErrorMessage(message);
              
              console.error('[VideoPlayer] Playback error:', {
                code: error.code,
                message: error.message,
                url: optimizedUrl,
                originalUrl: url,
                networkState: videoElement.networkState,
                readyState: videoElement.readyState,
                src: videoElement.src,
                errorDetails: {
                  MEDIA_ERR_ABORTED: MediaError.MEDIA_ERR_ABORTED,
                  MEDIA_ERR_NETWORK: MediaError.MEDIA_ERR_NETWORK,
                  MEDIA_ERR_DECODE: MediaError.MEDIA_ERR_DECODE,
                  MEDIA_ERR_SRC_NOT_SUPPORTED: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
                },
              });
              
              if (onError) {
                onError(new Error(message));
              }
            }
          }}
          onLoadStart={() => {
            console.log('[VideoPlayer] Load started:', optimizedUrl);
          }}
          onCanPlay={() => {
            console.log('[VideoPlayer] Video can play:', optimizedUrl);
          }}
          onLoadedData={() => {
            console.log('[VideoPlayer] Video data loaded:', optimizedUrl);
          }}
        >
          {/* Local paths: single source, browser detects type from extension */}
          {urlValid && optimizedUrl.startsWith('/') && (
            <source src={optimizedUrl} />
          )}
          {/* Cloudinary: explicit type and fallbacks */}
          {urlValid && !optimizedUrl.startsWith('/') && (
            <>
              <source src={optimizedUrl} type="video/mp4" />
              {optimizedUrl.includes('res.cloudinary.com') && optimizedUrl.includes('f_mp4') && (
                <source src={optimizedUrl.replace('f_mp4,q_auto', 'q_auto')} type="video/mp4" />
              )}
              {!optimizedUrl.includes('res.cloudinary.com') && (
                <>
                  <source src={optimizedUrl} type="video/webm" />
                  <source src={optimizedUrl} type="video/ogg" />
                </>
              )}
            </>
          )}
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoPlayer;
