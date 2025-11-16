/**
 * Image Upscaler Service
 * 
 * Uses Replicate's google/upscaler model to upscale images 4x
 * for high-quality character assets
 */

import Replicate from 'replicate';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

/**
 * Upscales a single image 4x using Replicate's google/upscaler
 * @param imageUrl URL or local path of image to upscale
 * @param projectId Project ID for file organization
 * @returns URL of upscaled image
 */
export async function upscaleImage(imageUrl: string, projectId: string): Promise<string> {
  const logPrefix = '[ImageUpscaler]';
  console.log(`${logPrefix} Starting upscale for image: ${imageUrl}`);

  try {
    // Run the upscaler model
    const output = await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: imageUrl,
          scale: 4, // 4x upscaling
          face_enhance: false, // Set to true for portraits/characters with faces
        }
      }
    ) as string;

    console.log(`${logPrefix} Upscale completed, downloading result...`);

    // Download and save the upscaled image
    const savedPath = await downloadUpscaledImage(output, projectId);
    console.log(`${logPrefix} Upscaled image saved: ${savedPath}`);

    return savedPath;
  } catch (error) {
    console.error(`${logPrefix} Upscale failed:`, error);
    throw new Error(`Failed to upscale image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upscales multiple images in parallel
 * @param imageUrls Array of image URLs to upscale
 * @param projectId Project ID for file organization
 * @returns Array of upscaled image URLs
 */
export async function upscaleImages(imageUrls: string[], projectId: string): Promise<string[]> {
  const logPrefix = '[ImageUpscaler]';
  console.log(`${logPrefix} Starting batch upscale for ${imageUrls.length} images`);

  const results: string[] = [];

  // Process sequentially to avoid overwhelming Replicate API
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      console.log(`${logPrefix} Upscaling image ${i + 1}/${imageUrls.length}`);
      const upscaled = await upscaleImage(imageUrls[i], projectId);
      results.push(upscaled);
    } catch (error) {
      console.error(`${logPrefix} Failed to upscale image ${i + 1}:`, error);
      // Return original URL if upscaling fails
      results.push(imageUrls[i]);
    }
  }

  console.log(`${logPrefix} Batch upscale completed: ${results.length}/${imageUrls.length} successful`);
  return results;
}

/**
 * Downloads upscaled image from Replicate output URL and saves to S3
 */
async function downloadUpscaledImage(outputUrl: string, projectId: string): Promise<string> {
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to download upscaled image: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  
  // Save to S3 for public access
  const { uploadToS3, getS3Url } = await import('@/lib/storage/s3-uploader');
  
  // Generate unique filename
  const filename = `upscaled-${uuidv4()}.png`;
  
  // Create temp file for upload
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempPath = path.join(tempDir, filename);
  fs.writeFileSync(tempPath, buffer);
  
  try {
    // Upload to S3
    const s3Key = await uploadToS3(tempPath, projectId, {
      folder: 'characters/upscaled',
      metadata: {
        'content-type': 'image/png',
        'upload-type': 'character-upscaled',
      },
    });
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    // Return S3 URL
    return getS3Url(s3Key);
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

/**
 * Upscales an image with face enhancement enabled (for characters with faces)
 * @param imageUrl URL or local path of image to upscale
 * @param projectId Project ID for file organization
 * @returns URL of upscaled image
 */
export async function upscaleImageWithFaceEnhancement(
  imageUrl: string, 
  projectId: string
): Promise<string> {
  const logPrefix = '[ImageUpscaler:FaceEnhance]';
  console.log(`${logPrefix} Starting face-enhanced upscale for: ${imageUrl}`);

  try {
    const output = await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: imageUrl,
          scale: 4,
          face_enhance: true, // Enable face enhancement
        }
      }
    ) as string;

    const savedPath = await downloadUpscaledImage(output, projectId);
    console.log(`${logPrefix} Face-enhanced upscale saved: ${savedPath}`);

    return savedPath;
  } catch (error) {
    console.error(`${logPrefix} Face-enhanced upscale failed:`, error);
    throw new Error(`Failed to upscale with face enhancement: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

