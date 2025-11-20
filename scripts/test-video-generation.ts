/**
 * Test Video Generation Endpoint
 *
 * This script tests the video generation endpoint with all photos in alexis-docs/test_photos
 *
 * Usage:
 *   npm run test:video-generation
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });

import { uploadToS3, getS3Url } from '../lib/storage/s3-uploader';
import fs from 'fs/promises';

const TEST_PHOTOS_DIR = path.join(process.cwd(), 'alexis-docs/test_photos');
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PROJECT_ID = `test-${Date.now()}`;

interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  seedFrame?: string;
  sceneIndex: number;
  projectId: string;
}

interface VideoGenerationResponse {
  success: boolean;
  data?: {
    predictionId: string;
  };
  error?: string;
}

async function uploadPhotoToS3(photoPath: string): Promise<string> {
  console.log(`  📤 Uploading ${path.basename(photoPath)} to S3...`);

  const photoName = path.basename(photoPath, path.extname(photoPath));
  const s3Key = await uploadToS3(
    photoPath,
    `${PROJECT_ID}/${photoName}`,
    { contentType: 'image/png' }
  );

  const s3Url = getS3Url(s3Key);
  console.log(`     ✅ Uploaded to: ${s3Url}`);
  return s3Url;
}

async function generateVideo(
  imageUrl: string,
  photoName: string,
  sceneIndex: number
): Promise<VideoGenerationResponse> {
  console.log(`  🎬 Generating video for ${photoName}...`);

  const requestBody: VideoGenerationRequest = {
    imageUrl,
    prompt: `A smooth, cinematic camera movement showcasing the ${photoName} product with dynamic lighting`,
    sceneIndex,
    projectId: PROJECT_ID,
  };

  const response = await fetch(`${API_URL}/api/generate-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const result: VideoGenerationResponse = await response.json();

  if (!response.ok) {
    console.error(`     ❌ Error: ${result.error}`);
    throw new Error(`Failed to generate video: ${result.error}`);
  }

  console.log(`     ✅ Prediction ID: ${result.data?.predictionId}`);
  return result;
}

async function testVideoGeneration() {
  console.log('🧪 Testing Video Generation Endpoint\n');
  console.log('='.repeat(70));
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`API URL: ${API_URL}`);
  console.log('='.repeat(70));

  try {
    // Get all photos in test_photos directory
    const files = await fs.readdir(TEST_PHOTOS_DIR);
    const photoFiles = files.filter(file =>
      file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
    );

    if (photoFiles.length === 0) {
      throw new Error('No photos found in alexis-docs/test_photos');
    }

    console.log(`\n📸 Found ${photoFiles.length} photos to process:\n`);
    photoFiles.forEach((file, i) => console.log(`  ${i + 1}. ${file}`));

    const results: Array<{
      photoName: string;
      imageUrl: string;
      predictionId: string;
      sceneIndex: number;
    }> = [];

    // Process each photo
    for (let i = 0; i < photoFiles.length; i++) {
      const photoFile = photoFiles[i];
      const photoPath = path.join(TEST_PHOTOS_DIR, photoFile);
      const photoName = path.basename(photoFile, path.extname(photoFile));

      console.log(`\n[${ i + 1}/${photoFiles.length}] Processing ${photoFile}`);
      console.log('-'.repeat(70));

      try {
        // Step 1: Upload to S3
        const imageUrl = await uploadPhotoToS3(photoPath);

        // Step 2: Generate video
        const response = await generateVideo(imageUrl, photoName, i);

        if (response.success && response.data?.predictionId) {
          results.push({
            photoName,
            imageUrl,
            predictionId: response.data.predictionId,
            sceneIndex: i,
          });
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to process ${photoFile}:`, error.message);
        // Continue with next photo
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ Video Generation Test Complete!\n');
    console.log(`Successfully processed: ${results.length}/${photoFiles.length} photos\n`);

    if (results.length > 0) {
      console.log('Results:');
      console.log('-'.repeat(70));
      results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.photoName}`);
        console.log(`   Image URL: ${result.imageUrl}`);
        console.log(`   Prediction ID: ${result.predictionId}`);
        console.log(`   Scene Index: ${result.sceneIndex}`);
      });

      console.log('\n' + '-'.repeat(70));
      console.log('Next Steps:');
      console.log('  - Monitor predictions at: /api/generate-video/[predictionId]');
      console.log('  - Or check Replicate dashboard for video generation status');
    }

    console.log('\n' + '='.repeat(70));

    return {
      success: true,
      projectId: PROJECT_ID,
      results,
    };
  } catch (error: any) {
    console.error('\n❌ Test Failed!');
    console.error('='.repeat(70));
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    throw error;
  }
}

// Run test
if (require.main === module) {
  testVideoGeneration()
    .then((result) => {
      console.log('\n✅ All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

export { testVideoGeneration };