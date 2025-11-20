/**
 * Generate Wes Anderson-style video from Porsche GT3 image
 * 
 * This script:
 * 1. Uploads the Porsche image to S3
 * 2. Generates a video using WAN 2.5 i2v fast model
 * 3. Applies Wes Anderson cinematographic style
 */

import path from 'path';
import fs from 'fs/promises';
import { uploadBufferToS3, getS3Url } from '@/lib/storage/s3-uploader';
import { generateVideo, setRuntimeVideoModel } from '@/lib/video/generator';

// ============================================================================
// Configuration
// ============================================================================

const IMAGE_PATH = '/Users/alexismanyrath/Code/AI-Video-Generation-Pipeline/alexis-docs/991_processed/porsche_gt3_processed_02.png';
const PROJECT_ID = 'wes-anderson-porsche-veo-back';
const SCENE_INDEX = 0;

// Use Google Veo 3.1 - premium quality video generation
const VIDEO_MODEL = 'google/veo-3.1';
const VIDEO_DURATION = 8; // Veo 3.1 supports longer durations

// Refined Wes Anderson-style prompt with cinematographic details
const WES_ANDERSON_PROMPT = `Pristine white Porsche 911 GT3 filmed in the distinctive Wes Anderson style. Perfectly symmetrical composition with the car centered precisely in the middle of the frame. Pastel, muted vintage color palette with soft, diffused natural lighting. Extremely flat composition with minimal depth, whimsical and diorama-like. Meticulous geometric balance, deliberate staging, and perfectly horizontal stability. Slow, controlled, methodical camera movement in classic Wes Anderson cinematography. Slightly desaturated grading, whimsical yet precise aesthetic, as if the car is a perfectly placed miniature model. Style: wes anderson symmetry, flat composition, pastel palette, diorama aesthetic. Camera: centered wide shot, level horizon, 35mm lens equivalent, orthographic feel. Background classic wes anderson movie setting.`;

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Wes Anderson Porsche Video Generator');
  console.log('========================================\n');

  try {
    // Set the video model to Google Veo 3.1
    setRuntimeVideoModel(VIDEO_MODEL);
    console.log(`Using model: ${VIDEO_MODEL}`);
    console.log(`Duration: ${VIDEO_DURATION} seconds\n`);

    // Step 1: Check if image exists
    console.log('Step 1: Checking image file...');
    await fs.access(IMAGE_PATH);
    const stats = await fs.stat(IMAGE_PATH);
    console.log(`✓ Image found: ${path.basename(IMAGE_PATH)}`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

    // Step 2: Upload image to S3
    console.log('Step 2: Uploading image to S3...');
    const imageBuffer = await fs.readFile(IMAGE_PATH);
    const fileName = path.basename(IMAGE_PATH);
    const s3Key = `uploads/${PROJECT_ID}/${fileName}`;
    
    await uploadBufferToS3(
      imageBuffer,
      s3Key,
      'image/png',
      {
        'content-type': 'wes-anderson-styled-porsche',
        'original-filename': fileName,
      }
    );

    const imageUrl = getS3Url(s3Key);
    console.log(`✓ Image uploaded to S3`);
    console.log(`  S3 Key: ${s3Key}`);
    console.log(`  URL: ${imageUrl}\n`);

    // Step 3: Generate video
    console.log('Step 3: Generating Wes Anderson-style video...');
    console.log(`Model: ${VIDEO_MODEL} (Google Veo 3.1 - Premium Quality)`);
    console.log('Style: Wes Anderson cinematography');
    console.log(`Duration: ${VIDEO_DURATION} seconds`);
    console.log('Resolution: 720p\n');

    const videoPath = await generateVideo(
      imageUrl,
      WES_ANDERSON_PROMPT,
      undefined, // No seed frame for Scene 0
      PROJECT_ID,
      SCENE_INDEX
    );

    console.log('\n========================================');
    console.log('✓ Video generation complete!');
    console.log('========================================');
    console.log(`Output: ${videoPath}`);
    console.log(`\nYou can find the video in: video testing/\n`);

  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ Error:', error.message);
    console.error('========================================\n');
    
    if (error.message.includes('AWS')) {
      console.error('💡 Tip: Make sure AWS credentials are configured:');
      console.error('  - AWS_ACCESS_KEY_ID');
      console.error('  - AWS_SECRET_ACCESS_KEY');
      console.error('  - AWS_S3_BUCKET or AWS_S3_BUCKET_NAME');
      console.error('  - AWS_REGION\n');
    }
    
    if (error.message.includes('REPLICATE')) {
      console.error('💡 Tip: Make sure Replicate API token is configured:');
      console.error('  - REPLICATE_API_TOKEN\n');
    }

    process.exit(1);
  }
}

main().catch(console.error);
