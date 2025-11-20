/**
 * Process Porsche GT3 Images
 *
 * Batch processes images from the porshe_gt3_final folder:
 * 1. Uploads local images directly to S3
 * 2. Removes backgrounds using Replicate service
 * 3. Upscales the background-removed images
 * 4. Downloads final processed images
 *
 * Usage:
 *   npx tsx scripts/process-porsche-images.ts
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { uploadToS3, getS3Url } from '../lib/storage/s3-uploader';
import { removeBackground } from '../lib/services/background-remover';
import { upscaleImage } from '../lib/services/image-upscaler';

// Load environment variables from .env.local if it exists
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fsSync.existsSync(envPath)) {
    const envContent = fsSync.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Loaded environment variables from .env.local\n');
  } else {
    console.log('ℹ️  No .env.local file found (using system environment variables)\n');
  }
} catch (error) {
  console.log('ℹ️  Could not load .env.local (using system environment variables)\n');
}

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PROJECT_ID = 'porsche-gt3-final-batch-processing-' + Date.now();
const SOURCE_FOLDER = path.join(process.cwd(), 'alexis-docs/porshe_gt3_final');
const OUTPUT_FOLDER = path.join(process.cwd(), 'alexis-docs/porshe_gt3_final_processed');
const tmpDir = path.join(process.cwd(), 'tmp');

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));
  console.log(`📥 Downloaded: ${outputPath}`);
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

// ============================================================================
// Main Processing Functions
// ============================================================================

async function getImageFiles(): Promise<string[]> {
  console.log(`🔍 Scanning folder: ${SOURCE_FOLDER}`);

  try {
    const files = await fs.readdir(SOURCE_FOLDER);
    const imageFiles = files
      .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
      .map(file => path.join(SOURCE_FOLDER, file));

    console.log(`📸 Found ${imageFiles.length} image files:`);
    imageFiles.forEach(file => console.log(`   ${path.basename(file)}`));
    console.log('');

    return imageFiles;
  } catch (error) {
    throw new Error(`Failed to read source folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function uploadAndProcessImages(imagePaths: string[]): Promise<{
  uploadedUrls: string[];
  backgroundRemovedUrls: string[];
}> {
  console.log(`📤 Uploading and processing ${imagePaths.length} images...\n`);

  const uploadedUrls: string[] = [];
  const backgroundRemovedUrls: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const fileName = path.basename(imagePath);

    console.log(`🖼️  Processing image ${i + 1}/${imagePaths.length}: ${fileName}`);

    try {
      // Step 1: Upload original image to S3
      console.log(`   📤 Uploading to S3...`);
      const s3Key = await uploadToS3(imagePath, PROJECT_ID, {
        contentType: 'image/jpeg',
        metadata: {
          'original-filename': fileName,
          'processed-by': 'porsche-batch-processor',
        },
      });

      const uploadedUrl = getS3Url(s3Key);
      console.log(`   ✅ Uploaded: ${uploadedUrl}`);
      uploadedUrls.push(uploadedUrl);

      // Step 2: Remove background (without S3 caching since AWS not configured)
      console.log(`   🎨 Removing background...`);
      const bgRemovedUrl = await removeBackground(uploadedUrl); // No s3Key for caching
      console.log(`   ✅ Background removed: ${bgRemovedUrl}`);

      // Step 3: Download the background-removed image and upload to S3
      console.log(`   💾 Downloading and re-uploading background-removed image...`);
      const localBgRemovedPath = path.join(tmpDir, `bg-removed-${fileName.replace(/\.[^/.]+$/, '')}.png`);

      try {
        await downloadFile(bgRemovedUrl, localBgRemovedPath);

        const bgRemovedS3Key = await uploadToS3(localBgRemovedPath, PROJECT_ID, {
          contentType: 'image/png',
          metadata: {
            'original-filename': fileName,
            'processed-type': 'background-removed',
            'processed-by': 'porsche-batch-processor',
          },
        });

        const bgRemovedS3Url = getS3Url(bgRemovedS3Key);
        console.log(`   ✅ Background-removed image uploaded to S3: ${bgRemovedS3Url}`);
        backgroundRemovedUrls.push(bgRemovedS3Url);

        // Clean up local file
        await fs.unlink(localBgRemovedPath);
      } catch (s3Error) {
        console.error(`   ❌ Failed to upload background-removed image to S3:`, s3Error);
        // Fall back to using the Replicate URL
        backgroundRemovedUrls.push(bgRemovedUrl);
      }

    } catch (error) {
      console.error(`❌ Failed to process image ${fileName}:`, error);
      // Continue with next image
      continue;
    }

    // Small delay between images to avoid overwhelming APIs
    if (i < imagePaths.length - 1) {
      console.log(`   ⏳ Waiting 3 seconds before next image...\n`);
      await sleep(3000);
    }
  }

  console.log(`✅ Processing completed: ${uploadedUrls.length}/${imagePaths.length} images uploaded and processed\n`);

  return {
    uploadedUrls,
    backgroundRemovedUrls,
  };
}

async function upscaleImages(imageUrls: string[]): Promise<string[]> {
  console.log(`🔍 Upscaling ${imageUrls.length} images...\n`);

  const upscaledUrls: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    console.log(`🔧 Upscaling image ${i + 1}/${imageUrls.length}...`);

    try {
      // Download the background-removed image locally
      const localImagePath = path.join(tmpDir, `bg-removed-${i + 1}.png`);
      console.log(`   📥 Downloading background-removed image...`);
      await downloadFile(imageUrl, localImagePath);

      // Upscale using the direct service
      console.log(`   🔍 Upscaling with Real-ESRGAN...`);
      const upscaledUrl = await upscaleImage(imageUrl, PROJECT_ID);

      if (upscaledUrl) {
        console.log(`   ✅ Upscaled: ${upscaledUrl}`);
        upscaledUrls.push(upscaledUrl);
      } else {
        console.log(`   ⚠️  Upscale failed, using original background-removed image`);
        upscaledUrls.push(imageUrl);
      }

      // Clean up local file
      try {
        await fs.unlink(localImagePath);
      } catch (cleanupError) {
        console.warn(`   ⚠️  Failed to clean up local file: ${cleanupError}`);
      }

      // Small delay between requests to avoid overwhelming the API
      if (i < imageUrls.length - 1) {
        console.log(`   ⏳ Waiting 3 seconds before next upscale...`);
        await sleep(3000);
      }
    } catch (error) {
      console.error(`❌ Upscale error for image ${i + 1}:`, error);
      upscaledUrls.push(imageUrl);
    }
  }

  console.log(`\n✅ Upscaling completed: ${upscaledUrls.filter(url => url !== imageUrls[upscaledUrls.indexOf(url)]).length}/${imageUrls.length} successfully upscaled\n`);
  return upscaledUrls;
}

async function downloadProcessedImages(imageUrls: string[]): Promise<void> {
  console.log(`📥 Downloading ${imageUrls.length} processed images...\n`);

  await ensureDirectoryExists(OUTPUT_FOLDER);

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const fileName = `porsche_gt3_processed_${String(i + 1).padStart(2, '0')}.png`;
    const outputPath = path.join(OUTPUT_FOLDER, fileName);

    try {
      console.log(`📥 Downloading image ${i + 1}/${imageUrls.length}...`);
      await downloadFile(imageUrl, outputPath);
    } catch (error) {
      console.error(`❌ Failed to download image ${i + 1}:`, error);
    }

    // Small delay between downloads
    if (i < imageUrls.length - 1) {
      await sleep(500);
    }
  }

  console.log(`\n✅ Download completed! Processed images saved to: ${OUTPUT_FOLDER}\n`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🏁 Starting Porsche GT3 Image Processing Pipeline\n');
  console.log('Configuration:');
  console.log(`   📁 Source: ${SOURCE_FOLDER}`);
  console.log(`   📁 Output: ${OUTPUT_FOLDER}`);
  console.log(`   🏷️  Project ID: ${PROJECT_ID}`);
  console.log(`   🌐 Server: ${BASE_URL}\n`);

  try {
    // Step 1: Get image files
    const imageFiles = await getImageFiles();

    if (imageFiles.length === 0) {
      console.log('❌ No image files found. Exiting.');
      process.exit(1);
    }

    // Step 2: Upload images and remove backgrounds
    const { backgroundRemovedUrls } = await uploadAndProcessImages(imageFiles);

    if (backgroundRemovedUrls.length === 0) {
      throw new Error('No background-removed images to process');
    }

    // Step 3: Upscale the background-removed images
    const upscaledUrls = await upscaleImages(backgroundRemovedUrls);

    // Step 4: Download final processed images
    await downloadProcessedImages(upscaledUrls);

    console.log('🎉 Pipeline completed successfully!');
    console.log('\nSummary:');
    console.log(`   📸 Images processed: ${imageFiles.length}`);
    console.log(`   🎨 Background removed: ${backgroundRemovedUrls.length}`);
    console.log(`   🔍 Upscaled: ${upscaledUrls.length}`);
    console.log(`   💾 Saved to: ${OUTPUT_FOLDER}`);

  } catch (error) {
    console.error('\n❌ Pipeline failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the pipeline
main().catch(console.error);
