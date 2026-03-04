'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * VideoUploader Component
 * - Handles direct secure upload to Cloudinary
 * - Notifies parent page.tsx on success to update PostgreSQL
 */
export default function VideoUploader({ moduleId, videoType, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'adohealth';
  const uploadPreset = 'adohealth_signed';
  const folder = `videos/${moduleId}`;

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      setError(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5GB`);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadResult(null);
    setUploadProgress(0);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle secure upload to Cloudinary
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Get the signature from your API
      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      const paramsToSign = {
        timestamp: timestamp,
        folder: folder,
        upload_preset: uploadPreset,
      };

      const signRes = await fetch('/api/sign-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paramsToSign }),
      });

      const signData = await signRes.json();
      if (!signData.signature) throw new Error(signData.error || "Signature failed");

      // 2. Prepare FormData for Direct Upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signData.signature);
      formData.append('folder', folder);
      formData.append('upload_preset', uploadPreset);

      // 3. XHR for Progress Tracking
      const xhr = new XMLHttpRequest();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadResult(response);
          setUploading(false);

          // Notify page.tsx to save the record to PostgreSQL
          if (onUploadSuccess) {
            onUploadSuccess(
              response.secure_url,
              response.public_id,
              response.bytes
            );
          }
        } else {
          const errorRes = JSON.parse(xhr.responseText || '{}');
          setError(errorRes.error?.message || 'Upload failed.');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('Network error during upload.');
        setUploading(false);
      };

      xhr.open('POST', uploadUrl);
      xhr.send(formData);

    } catch (err) {
      setError(err.message || 'Failed to initiate secure upload.');
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const videoUrl = uploadResult?.secure_url || uploadResult?.url;

  return (
    <div className="video-uploader-container" style={{ width: '100%', padding: '10px' }}>
      {/* File Selection */}
      {!uploadResult && (
        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
          <label
            htmlFor={`video-input-${moduleId}-${videoType}`}
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: '#0070f3',
              color: 'white',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {selectedFile ? 'Change Video' : `Select ${videoType} Video`}
          </label>
          <input
            id={`video-input-${moduleId}-${videoType}`}
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {selectedFile && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '5px', color: '#c00', marginBottom: '15px', fontSize: '13px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Local Preview */}
      {previewUrl && !uploadResult && (
        <div style={{ marginBottom: '15px' }}>
          <video src={previewUrl} controls style={{ width: '100%', maxHeight: '250px', borderRadius: '5px', backgroundColor: '#000' }} />
        </div>
      )}

      {/* Upload Button & Progress */}
      {selectedFile && !uploadResult && (
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: uploading ? '#ccc' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {uploading ? `Uploading ${uploadProgress}%...` : 'Confirm & Upload Video'}
          </button>

          {uploading && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ width: '100%', height: '10px', backgroundColor: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#0070f3', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Result - Your full original UI for results */}
      {uploadResult && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '5px', textAlign: 'center' }}>
            <h3 style={{ color: '#2e7d32', marginTop: 0, fontSize: '16px' }}>✅ Upload Successful!</h3>
            <div style={{ marginTop: '10px', fontSize: '12px', textAlign: 'left' }}>
              <div style={{ marginBottom: '5px' }}><strong>Public ID:</strong> {uploadResult.public_id}</div>
              <div style={{ marginBottom: '5px' }}><strong>Size:</strong> {(uploadResult.bytes / 1024 / 1024).toFixed(2)} MB</div>
              {uploadResult.width && (
                <div><strong>Resolution:</strong> {uploadResult.width} x {uploadResult.height}</div>
              )}
            </div>
            <button
              onClick={handleReset}
              style={{ marginTop: '15px', fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Upload another video
            </button>
          </div>

          {/* Player for the Cloudinary URL */}
          <div style={{ marginTop: '15px' }}>
            <video src={videoUrl} controls style={{ width: '100%', borderRadius: '5px', backgroundColor: '#000' }} />
          </div>
        </div>
      )}
    </div>
  );
}