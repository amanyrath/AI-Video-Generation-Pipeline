/**
 * Director Style Video Pipeline - Simple Test Script
 *
 * Generates a video in a specific director's style from asset and background images.
 * Step 1: Style asset image using background reference (Runway Gen-4)
 * Step 2: Generate video from styled image (Google Veo 3.1)
 */

// ============================================================================
// Configuration (Hardcoded for immediate testing)
// ============================================================================

const ASSET_IMAGE_PATH = '/Users/alexismanyrath/Code/AI-Video-Generation-Pipeline/alexis-docs/991_processed/porsche_gt3_processed_02.png';
const BACKGROUND_IMAGE_PATH = '/Users/alexismanyrath/Code/AI-Video-Generation-Pipeline/alexis-docs/991/gbh.png';
const DIRECTOR = 'Wes Anderson';
const PROJECT_ID = 'test-pipeline';

const IMAGE_MODEL = 'runwayml/gen4-image';
const VIDEO_MODEL = 'google/veo-3.1';
const VIDEO_DURATION = 8;

// Wes Anderson style prompt for image generation
const IMAGE_PROMPT = `A pristine Porsche 911 GT3 in a Wes Anderson film scene with Grand Budapest Hotel aesthetic. The car is centered in front of a pastel pink and peach colored Art Deco building or backdrop. Soft vintage pastel color palette: dusty pinks, warm peaches, muted lavenders, and cream tones. The car is color graded to harmonize with the pastel environment - slightly desaturated with warm peachy-pink tones that complement the background. Perfectly symmetrical composition with the vehicle centered. Flat, theatrical staging with minimal depth like a painted backdrop. Soft, diffused vintage lighting creating a dreamlike atmosphere. Meticulous geometric balance and deliberate art direction. The entire scene has cohesive pastel color grading matching Grand Budapest Hotel's iconic pink palette.`;

// Wes Anderson cinematography prompt for video generation
const VIDEO_PROMPT = `Pristine white Porsche 911 GT3 filmed in the distinctive Wes Anderson style. Perfectly symmetrical composition with the car centered precisely in the middle of the frame. Slow, controlled, methodical camera movement in classic Wes Anderson cinematography. Extremely flat composition with minimal depth, whimsical and diorama-like. Meticulous geometric balance, deliberate staging, and perfectly horizontal stability. Slow zoom or dolly movement maintaining perfect symmetry. Camera: centered wide shot, level horizon, 35mm lens equivalent, orthographic feel.`;

// ============================================================================
// Imports
// ============================================================================

import path from 'path';
import fs from 'fs/promises';
import { uploadBufferToS3, getS3Url } from '@/lib/storage/s3-uploader';
import { generateVideo, setRuntimeVideoModel } from '@/lib/video/generator';
import {
  createImagePredictionWithRetry,
  pollReplicateStatus as pollImageStatus,
  setRuntimeImageModel
} from '@/lib/ai/image-generator';

// ============================================================================
// Helper Functions
// ============================================================================

async function waitForImageGeneration(predictionId: string): Promise<string> {
  console.log('Polling for image completion...');

  const imageUrl = await pollImageStatus(predictionId);
  console.log(`✓ Image generation complete!`);
  console.log(`  URL: ${imageUrl}\n`);

  return imageUrl;
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Director Style Video Pipeline');
  console.log(`Director: ${DIRECTOR}`);
  console.log('========================================\n');

  console.log('Configuration:');
  console.log(`Asset Image: ${path.basename(ASSET_IMAGE_PATH)}`);
  console.log(`Background Image: ${path.basename(BACKGROUND_IMAGE_PATH)}`);
  console.log(`Image Prompt: ${IMAGE_PROMPT}`);
  console.log(`Video Prompt: ${VIDEO_PROMPT}`);
  console.log('\n');

  try {
    // -------------------------------------------------------------------------
    // Step 1: Upload reference images to S3
    // -------------------------------------------------------------------------
    console.log('Step 1: Uploading reference images to S3...');

    // Upload asset (Porsche)
    await fs.access(ASSET_IMAGE_PATH);
    const assetBuffer = await fs.readFile(ASSET_IMAGE_PATH);
    const assetFileName = path.basename(ASSET_IMAGE_PATH);
    const assetS3Key = `uploads/${PROJECT_ID}/asset/${assetFileName}`;

    await uploadBufferToS3(
      assetBuffer,
      assetS3Key,
      'image/png',
      { 'content-type': 'asset-image', 'original-filename': assetFileName }
    );
    const assetImageUrl = getS3Url(assetS3Key);
    console.log(`✓ Asset image uploaded: ${assetS3Key}`);

    // Upload background
    await fs.access(BACKGROUND_IMAGE_PATH);
    const backgroundBuffer = await fs.readFile(BACKGROUND_IMAGE_PATH);
    const backgroundFileName = path.basename(BACKGROUND_IMAGE_PATH);
    const backgroundS3Key = `uploads/${PROJECT_ID}/background/${backgroundFileName}`;

    await uploadBufferToS3(
      backgroundBuffer,
      backgroundS3Key,
      'image/png',
      { 'content-type': 'background-image', 'original-filename': backgroundFileName }
    );
    const backgroundImageUrl = getS3Url(backgroundS3Key);
    console.log(`✓ Background image uploaded: ${backgroundS3Key}\n`);

    // -------------------------------------------------------------------------
    // Step 2: Generate styled image using Runway Gen-4
    // -------------------------------------------------------------------------
    console.log('========================================');
    console.log('Step 2: Generating styled image');
    console.log('========================================');
    console.log(`Model: ${IMAGE_MODEL}`);
    console.log('Technique: Image-to-Image with dual references\n');

    setRuntimeImageModel(IMAGE_MODEL);

    console.log('Generating Wes Anderson-styled image...');
    const predictionId = await createImagePredictionWithRetry(
      IMAGE_PROMPT,
      undefined, // No seed image
      [assetImageUrl, backgroundImageUrl], // Both asset and background references
      1.0 // Maximum reference influence
    );

    console.log(`✓ Image generation started`);
    console.log(`  Prediction ID: ${predictionId}`);

    const styledImageUrl = await waitForImageGeneration(predictionId);

    // Download styled image
    console.log('Downloading styled image...');
    const styledImageResponse = await fetch(styledImageUrl);
    if (!styledImageResponse.ok) {
      throw new Error(`Failed to download styled image: ${styledImageResponse.statusText}`);
    }
    const styledImageBuffer = Buffer.from(await styledImageResponse.arrayBuffer());

    const styledImagePath = path.join(
      process.cwd(),
      'video testing',
      `styled-${DIRECTOR.toLowerCase().replace(' ', '-')}-${Date.now()}.png`
    );
    await fs.mkdir(path.dirname(styledImagePath), { recursive: true });
    await fs.writeFile(styledImagePath, styledImageBuffer);
    console.log(`✓ Styled image saved: ${styledImagePath}\n`);

    // -------------------------------------------------------------------------
    // Step 3: Generate video from styled image
    // -------------------------------------------------------------------------
    console.log('========================================');
    console.log('Step 3: Generating video');
    console.log('========================================');
    console.log(`Model: ${VIDEO_MODEL}`);
    console.log(`Duration: ${VIDEO_DURATION} seconds`);
    console.log('Style: Wes Anderson cinematography\n');

    setRuntimeVideoModel(VIDEO_MODEL);

    // Upload styled image to S3 for video generation
    const styledS3Key = `uploads/${PROJECT_ID}/styled/${DIRECTOR.toLowerCase().replace(' ', '-')}-${Date.now()}.png`;
    await uploadBufferToS3(
      styledImageBuffer,
      styledS3Key,
      'image/png',
      { 'generation-step': 'styled-image' }
    );
    const styledImageS3Url = getS3Url(styledS3Key);

    console.log('Generating video...');
    const videoPath = await generateVideo(
      styledImageS3Url,
      VIDEO_PROMPT,
      undefined, // No seed frame
      PROJECT_ID,
      0 // Scene index
    );

    // -------------------------------------------------------------------------
    // Complete
    // -------------------------------------------------------------------------
    console.log('\n========================================');
    console.log('✓ Pipeline Complete!');
    console.log('========================================');
    console.log('Results:');
    console.log(`  Styled Image: ${styledImagePath}`);
    console.log(`  Final Video: ${videoPath}`);
    console.log(`  Director Style: ${DIRECTOR}\n`);

  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ Pipeline Error:', error.message);
    console.error('========================================\n');

    if (error.message.includes('AWS')) {
      console.error('💡 Tip: Make sure AWS credentials are configured');
    }

    if (error.message.includes('REPLICATE')) {
      console.error('💡 Tip: Make sure Replicate API token is configured');
    }

    process.exit(1);
  }
}

main().catch(console.error);
