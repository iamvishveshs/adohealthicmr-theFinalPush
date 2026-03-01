/**
 * Cleanup script to remove base64 data from videos.json
 * 
 * This script:
 * 1. Reads videos.json
 * 2. Removes videos with base64 data URLs in preview or fileUrl
 * 3. Saves cleaned data back to videos.json
 * 4. Creates a backup of the original file
 * 
 * Usage: node scripts/cleanup-videos-json.js
 */

const fs = require('fs');
const path = require('path');

const VIDEOS_FILE = path.join(process.cwd(), 'data', 'videos.json');
const BACKUP_FILE = path.join(process.cwd(), 'data', 'videos.json.backup');

function isBase64DataUrl(str) {
  return str && (str.startsWith('data:') || str.startsWith('blob:'));
}

function cleanupVideosJson() {
  try {
    // Check if file exists
    if (!fs.existsSync(VIDEOS_FILE)) {
      console.log('videos.json not found. Nothing to clean up.');
      return;
    }

    // Read current file
    console.log('Reading videos.json...');
    const fileContent = fs.readFileSync(VIDEOS_FILE, 'utf8');
    const videos = JSON.parse(fileContent);

    if (!Array.isArray(videos)) {
      console.error('videos.json does not contain an array. Aborting cleanup.');
      return;
    }

    console.log(`Found ${videos.length} video entries.`);

    // Create backup
    console.log('Creating backup...');
    fs.writeFileSync(BACKUP_FILE, fileContent, 'utf8');
    console.log(`Backup created: ${BACKUP_FILE}`);

    // Filter out videos with base64 data
    const cleanedVideos = [];
    const removedVideos = [];

    for (const video of videos) {
      const hasBase64Preview = isBase64DataUrl(video.preview);
      const hasBase64FileUrl = isBase64DataUrl(video.fileUrl);

      if (hasBase64Preview || hasBase64FileUrl) {
        removedVideos.push({
          moduleId: video.moduleId,
          videoType: video.videoType,
          videoId: video.videoId,
          fileName: video.fileName,
          reason: hasBase64Preview ? 'base64 preview' : 'base64 fileUrl',
        });
      } else {
        cleanedVideos.push(video);
      }
    }

    console.log(`\nCleanup Summary:`);
    console.log(`  - Total videos: ${videos.length}`);
    console.log(`  - Valid videos: ${cleanedVideos.length}`);
    console.log(`  - Removed videos: ${removedVideos.length}`);

    if (removedVideos.length > 0) {
      console.log(`\nRemoved videos (these need to be re-uploaded to Cloudinary):`);
      removedVideos.forEach(v => {
        console.log(`  - Module ${v.moduleId}, ${v.videoType}, Video ${v.videoId}: ${v.fileName} (${v.reason})`);
      });
    }

    // Write cleaned data
    console.log('\nWriting cleaned videos.json...');
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(cleanedVideos, null, 2), 'utf8');
    
    // Check file size
    const originalSize = fs.statSync(BACKUP_FILE).size;
    const newSize = fs.statSync(VIDEOS_FILE).size;
    const sizeReduction = ((1 - newSize / originalSize) * 100).toFixed(2);

    console.log(`\nFile size reduction: ${sizeReduction}%`);
    console.log(`  Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Cleaned: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n✅ Cleanup complete! Backup saved to: ${BACKUP_FILE}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupVideosJson();
