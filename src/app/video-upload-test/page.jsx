'use client';

import VideoUploader from '../components/VideoUploader';

/**
 * Test page for VideoUploader component
 * Access at: /video-upload-test
 */
export default function VideoUploadTestPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', backgroundColor: '#f5f5f5' }}>
      <VideoUploader />
    </div>
  );
}
