/**
 * Two-Step Wes Anderson Porsche Pipeline
 * 
 * Step 1: Generate Wes Anderson-styled image using Runway Gen-4 Image (I2I)
 * Step 2: Generate video from that styled image using Google Veo 3.1
 * 
 * This pipeline ensures:
 * - Object consistency with reference image (Runway)
 * - Wes Anderson aesthetic transformation (Runway)
 * - High-quality cinematic video generation (Veo)
 */

// Load environment variables (only needed for local development)
// On Railway/cloud platforms, environment variables are injected automatically
import { config } from 'dotenv';
import { existsSync } from 'fs';

// Only load .env.local if it exists (local development)
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
} else {
  // Fallback to default .env if it exists
  config();
}

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
// Configuration
// ============================================================================

const REFERENCE_IMAGE_PATH = '/Users/alexismanyrath/Code/AI-Video-Generation-Pipeline/alexis-docs/991_processed/porsche_gt3_processed_02.png';
const CONTEXT_IMAGE_PATH = '/Users/alexismanyrath/Code/AI-Video-Generation-Pipeline/alexis-docs/991/gbh.png'; // Grand Budapest Hotel aesthetic reference
const PROJECT_ID = 'wes-anderson-porsche-gbh';
const SCENE_INDEX = 0;

// Step 1: Runway Gen-4 Image for I2I transformation
const IMAGE_MODEL = 'runwayml/gen4-image';

// Step 2: Google Veo 3.1 for premium video generation
const VIDEO_MODEL = 'google/veo-3.1';
const VIDEO_DURATION = 8;

// Wes Anderson style prompt with Grand Budapest Hotel aesthetic
const IMAGE_PROMPT = `A pristine Porsche 911 GT3 in a Wes Anderson film scene with Grand Budapest Hotel aesthetic. The car is centered in front of a pastel pink and peach colored Art Deco building or backdrop. Soft vintage pastel color palette: dusty pinks, warm peaches, muted lavenders, and cream tones. The car is color graded to harmonize with the pastel environment - slightly desaturated with warm peachy-pink tones that complement the background. Perfectly symmetrical composition with the vehicle centered. Flat, theatrical staging with minimal depth like a painted backdrop. Soft, diffused vintage lighting creating a dreamlike atmosphere. Meticulous geometric balance and deliberate art direction. The entire scene has cohesive pastel color grading matching Grand Budapest Hotel's iconic pink palette.`;

// Wes Anderson video prompt for motion
const VIDEO_PROMPT = `Pristine white Porsche 911 GT3 filmed in the distinctive Wes Anderson style. Perfectly symmetrical composition with the car centered precisely in the middle of the frame. Slow, controlled, methodical camera movement in classic Wes Anderson cinematography. Extremely flat composition with minimal depth, whimsical and diorama-like. Meticulous geometric balance, perfectly horizontal stability. Slight slow zoom or dolly movement maintaining perfect symmetry. Camera: centered wide shot, level horizon, 35mm lens equivalent, orthographic feel.`;

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
  console.log('Wes Anderson Porsche Pipeline');
  console.log('Two-Step Generation Process');
  console.log('========================================\n');

  try {
    // -------------------------------------------------------------------------
    // Step 0: Upload reference images to S3
    // -------------------------------------------------------------------------
    console.log('Step 0: Uploading reference images to S3...');
    
    // Upload Porsche reference
    await fs.access(REFERENCE_IMAGE_PATH);
    const stats = await fs.stat(REFERENCE_IMAGE_PATH);
    console.log(`✓ Porsche reference found: ${path.basename(REFERENCE_IMAGE_PATH)}`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const imageBuffer = await fs.readFile(REFERENCE_IMAGE_PATH);
    const fileName = path.basename(REFERENCE_IMAGE_PATH);
    const referenceS3Key = `uploads/${PROJECT_ID}/reference/${fileName}`;
    
    await uploadBufferToS3(
      imageBuffer,
      referenceS3Key,
      'image/png',
      {
        'content-type': 'reference-image-porsche',
        'original-filename': fileName,
      }
    );

    const referenceImageUrl = getS3Url(referenceS3Key);
    console.log(`✓ Porsche reference uploaded to S3`);
    console.log(`  S3 Key: ${referenceS3Key}`);
    
    // Upload Grand Budapest Hotel context image
    await fs.access(CONTEXT_IMAGE_PATH);
    const contextStats = await fs.stat(CONTEXT_IMAGE_PATH);
    console.log(`✓ GBH context image found: ${path.basename(CONTEXT_IMAGE_PATH)}`);
    console.log(`  Size: ${(contextStats.size / 1024 / 1024).toFixed(2)} MB`);

    const contextBuffer = await fs.readFile(CONTEXT_IMAGE_PATH);
    const contextFileName = path.basename(CONTEXT_IMAGE_PATH);
    const contextS3Key = `uploads/${PROJECT_ID}/context/${contextFileName}`;
    
    await uploadBufferToS3(
      contextBuffer,
      contextS3Key,
      'image/png',
      {
        'content-type': 'context-image-gbh',
        'original-filename': contextFileName,
      }
    );

    const contextImageUrl = getS3Url(contextS3Key);
    console.log(`✓ GBH context image uploaded to S3`);
    console.log(`  S3 Key: ${contextS3Key}\n`);

    // -------------------------------------------------------------------------
    // Step 1: Generate Wes Anderson-styled image using Runway Gen-4 Image
    // -------------------------------------------------------------------------
    console.log('========================================');
    console.log('Step 1: Generating Wes Anderson-styled image');
    console.log('========================================');
    console.log(`Model: ${IMAGE_MODEL} (Runway Gen-4 Image)`);
    console.log('Technique: Image-to-Image transformation with dual references');
    console.log('Purpose: Transform Porsche into Grand Budapest Hotel aesthetic\n');
    console.log('Reference images:');
    console.log('  1. Porsche (object consistency)');
    console.log('  2. Grand Budapest Hotel (color palette & style)\n');

    // Set the runtime model
    setRuntimeImageModel(IMAGE_MODEL);

    // Generate the styled image with both references
    console.log('Generating Wes Anderson-styled image with GBH palette...');
    const predictionId = await createImagePredictionWithRetry(
      IMAGE_PROMPT,
      undefined, // No seed image
      [referenceImageUrl, contextImageUrl], // Both Porsche and GBH references
      1.0 // Maximum reference influence
    );

    console.log(`✓ Image generation started`);
    console.log(`  Prediction ID: ${predictionId}`);

    // Wait for image to complete
    const styledImageUrl = await waitForImageGeneration(predictionId);

    // Download and save the styled image locally
    console.log('Downloading styled image...');
    const styledImageResponse = await fetch(styledImageUrl);
    if (!styledImageResponse.ok) {
      throw new Error(`Failed to download styled image: ${styledImageResponse.statusText}`);
    }
    const styledImageBuffer = Buffer.from(await styledImageResponse.arrayBuffer());
    
    const styledImagePath = path.join(
      process.cwd(),
      'video testing',
      `wes-anderson-styled-${Date.now()}.png`
    );
    await fs.mkdir(path.dirname(styledImagePath), { recursive: true });
    await fs.writeFile(styledImagePath, styledImageBuffer);
    console.log(`✓ Styled image saved locally: ${styledImagePath}\n`);

    // Upload styled image to S3
    const styledS3Key = `uploads/${PROJECT_ID}/styled/wes-anderson-${Date.now()}.png`;
    await uploadBufferToS3(
      styledImageBuffer,
      styledS3Key,
      'image/png',
      {
        'generation-step': 'styled-image',
        'original-reference': referenceS3Key,
      }
    );
    const styledImageS3Url = getS3Url(styledS3Key);
    console.log(`✓ Styled image uploaded to S3: ${styledS3Key}\n`);

    // -------------------------------------------------------------------------
    // Step 2: Generate video from styled image using Google Veo 3.1
    // -------------------------------------------------------------------------
    console.log('========================================');
    console.log('Step 2: Generating cinematic video');
    console.log('========================================');
    console.log(`Model: ${VIDEO_MODEL} (Google Veo 3.1 - Premium Quality)`);
    console.log('Input: Wes Anderson-styled image from Step 1');
    console.log(`Duration: ${VIDEO_DURATION} seconds`);
    console.log('Resolution: 720p\n');

    // Set the video model
    setRuntimeVideoModel(VIDEO_MODEL);

    // Generate video
    console.log('Generating video...');
    const videoPath = await generateVideo(
      styledImageS3Url,
      VIDEO_PROMPT,
      undefined, // No seed frame for Scene 0
      PROJECT_ID,
      SCENE_INDEX
    );

    // -------------------------------------------------------------------------
    // Complete
    // -------------------------------------------------------------------------
    console.log('\n========================================');
    console.log('✓ Pipeline Complete!');
    console.log('========================================');
    console.log('Results:');
    console.log(`  1. Styled Image: ${styledImagePath}`);
    console.log(`  2. Final Video: ${videoPath}`);
    console.log('\nPipeline summary:');
    console.log(`  Porsche + GBH → Runway Gen-4 → Wes Anderson Style with GBH palette`);
    console.log(`  Styled Image → Google Veo 3.1 → Cinematic Video\n`);

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
