/**
 * Background Removal Service
 * 
 * This module handles background removal from images using Replicate's RMBG model.
 */

import Replicate from 'replicate';

// Use Replicate's RMBG (Remove Background) model
const RMBG_MODEL = 'lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1';
const MAX_RETRIES = 3;
const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 30;

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string;
  error?: string;
}

/**
 * Creates and configures a Replicate client
 */
function createReplicateClient(): Replicate {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN environment variable is not set');
  }

  return new Replicate({
    auth: apiToken,
  });
}

/**
 * Removes background from an image URL
 * @param imageUrl URL of the image to process (can be HTTP/HTTPS URL or base64 data URI)
 * @returns URL of the processed image with background removed
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('Image URL is required and must be a string');
  }

  const logPrefix = '[BackgroundRemover]';
  console.log(`${logPrefix} Starting background removal`);
  console.log(`${logPrefix} Input image: ${imageUrl.substring(0, 80)}${imageUrl.length > 80 ? '...' : ''}`);

  const replicate = createReplicateClient();

  try {
    // Create prediction
    const prediction = await replicate.predictions.create({
      version: RMBG_MODEL,
      input: {
        image: imageUrl,
      },
    });

    if (!prediction.id) {
      throw new Error('Replicate API returned prediction without ID');
    }

    console.log(`${logPrefix} Prediction created: ${prediction.id}`);

    // Poll for completion
    const outputUrl = await pollForCompletion(prediction.id);
    
    console.log(`${logPrefix} Background removal completed`);
    console.log(`${logPrefix} Output image: ${outputUrl.substring(0, 80)}${outputUrl.length > 80 ? '...' : ''}`);

    return outputUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} Failed to remove background:`, errorMessage);
    throw new Error(`Background removal failed: ${errorMessage}`);
  }
}

/**
 * Polls Replicate for prediction completion
 */
async function pollForCompletion(predictionId: string): Promise<string> {
  const logPrefix = '[BackgroundRemover]';
  const replicate = createReplicateClient();

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const prediction = (await replicate.predictions.get(predictionId)) as ReplicatePrediction;

      console.log(
        `${logPrefix} Poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}: Status = ${prediction.status}`
      );

      if (prediction.status === 'succeeded') {
        if (!prediction.output || typeof prediction.output !== 'string') {
          throw new Error('Prediction succeeded but no output URL found');
        }
        return prediction.output;
      }

      if (prediction.status === 'failed') {
        const errorMessage = prediction.error || 'Unknown error';
        throw new Error(`Prediction failed: ${errorMessage}`);
      }

      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled');
      }

      // Status is 'starting' or 'processing', continue polling
      if (prediction.status === 'starting' || prediction.status === 'processing') {
        if (attempt < MAX_POLL_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          continue;
        } else {
          throw new Error(
            `Prediction timeout: Status is still "${prediction.status}" after ${MAX_POLL_ATTEMPTS} attempts`
          );
        }
      }

      // Unknown status
      throw new Error(`Unknown prediction status: ${prediction.status}`);
    } catch (error) {
      // If it's a known error, throw it
      if (error instanceof Error && (
        error.message.includes('failed') ||
        error.message.includes('canceled') ||
        error.message.includes('timeout')
      )) {
        throw error;
      }

      // For other errors, retry if we have attempts left
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        console.warn(`${logPrefix} Poll error (attempt ${attempt + 1}):`, error);
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        continue;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to poll prediction status: ${errorMessage}`);
      }
    }
  }

  throw new Error(`Polling timeout after ${MAX_POLL_ATTEMPTS} attempts`);
}

/**
 * Removes background from multiple images
 * @param imageUrls Array of image URLs to process
 * @returns Array of URLs of processed images with backgrounds removed
 */
export async function removeBackgrounds(imageUrls: string[]): Promise<string[]> {
  if (!Array.isArray(imageUrls)) {
    throw new Error('Image URLs must be an array');
  }

  const logPrefix = '[BackgroundRemover]';
  console.log(`${logPrefix} Processing ${imageUrls.length} image(s)`);

  const results: string[] = [];

  // Process images sequentially to avoid overwhelming the API
  for (let i = 0; i < imageUrls.length; i++) {
    console.log(`${logPrefix} Processing image ${i + 1}/${imageUrls.length}`);
    try {
      const result = await removeBackground(imageUrls[i]);
      results.push(result);
    } catch (error) {
      console.error(`${logPrefix} Failed to process image ${i + 1}:`, error);
      // Continue with other images even if one fails
      // Store original URL as fallback
      results.push(imageUrls[i]);
    }
  }

  console.log(`${logPrefix} Completed processing ${results.length}/${imageUrls.length} image(s)`);
  return results;
}

