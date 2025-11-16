/**
 * Image Upload API Route
 * 
 * POST /api/upload-images
 * 
 * Uploads user-provided reference images for use in storyboard and image generation.
 * Currently saves to local storage. S3 support can be enabled in the future.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedImage, ProcessedImage } from '@/lib/storage/image-storage';
import { removeBackgroundIterative } from '@/lib/ai/background-remover';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_RUNTIME_CONFIG } from '@/lib/config/model-runtime';

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validates the upload request
 */
function validateRequest(formData: FormData): string | null {
  const projectId = formData.get('projectId');
  if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
    return 'Missing required field: projectId';
  }

  const images = formData.getAll('images');
  if (!images || images.length === 0) {
    return 'Missing required field: images (at least one image required)';
  }

  // Validate each file
  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    if (!(file instanceof File)) {
      return `Invalid file at index ${i}: must be a File object`;
    }

    // Check file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds maximum size of 10MB`;
    }

    // Check MIME type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return `File "${file.name}" has unsupported type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`;
    }
  }

  return null;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/upload-images
 * 
 * Uploads one or more images for use as reference in storyboard/image generation.
 * 
 * Request (FormData):
 * - projectId: string (required)
 * - images: File[] (required, at least one)
 * 
 * Response:
 * {
 *   success: true;
 *   images: UploadedImage[];
 * }
 * 
 * Error Responses:
 * - 400: Invalid request
 * - 500: Upload failed
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('[Upload Images API] Failed to parse form data:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid form data',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Validate request
    const validationError = validateRequest(formData);
    if (validationError) {
      console.error('[Upload Images API] Validation error:', validationError);
      return NextResponse.json(
        {
          success: false,
          error: validationError,
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Extract parameters
    const projectId = formData.get('projectId') as string;
    const imageFiles = formData.getAll('images') as File[];
    
    // Check if background removal is enabled (from form data or default to true)
    const enableBgRemovalParam = formData.get('enableBackgroundRemoval');
    const enableBackgroundRemoval = enableBgRemovalParam === null 
      ? DEFAULT_RUNTIME_CONFIG.enableBackgroundRemoval !== false // Default to true if not specified
      : enableBgRemovalParam === 'true' || enableBgRemovalParam === '1';

    console.log('[Upload Images API] Request received:', {
      projectId,
      imageCount: imageFiles.length,
      enableBackgroundRemoval,
    });

    // Process each image
    const uploadedImages = [];
    const errors: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save image (upload to S3 for public access)
        const uploadedImage = await saveUploadedImage(
          buffer,
          file.name,
          file.type,
          {
            projectId,
            useS3: true, // Enable S3 for public URLs needed by Replicate
          }
        );

        console.log(`[Upload Images API] Successfully uploaded image ${i + 1}/${imageFiles.length}: ${uploadedImage.id}`);

        // Process image through background removal (2 iterations) if enabled
        if (enableBackgroundRemoval) {
          try {
            console.log(`[Upload Images API] Starting background removal for image ${i + 1}...`);
            const processedPaths = await removeBackgroundIterative(
              uploadedImage.localPath,
              2 // 2 iterations
            );

          // Create ProcessedImage objects for each iteration
          const processedVersions: ProcessedImage[] = [];
          for (let iter = 0; iter < processedPaths.length; iter++) {
            const processedPath = processedPaths[iter];
            
            // Get file stats
            const stats = await fs.stat(processedPath);

            const processedImage: ProcessedImage = {
              id: uuidv4(),
              iteration: iter + 1,
              url: processedPath, // Local path for now
              localPath: processedPath,
              size: stats.size,
              createdAt: new Date().toISOString(),
            };

            processedVersions.push(processedImage);
            console.log(`[Upload Images API] Created processed version ${iter + 1}/2 for image ${i + 1}`);
          }

            // Attach processed versions to uploaded image
            uploadedImage.processedVersions = processedVersions;
            console.log(`[Upload Images API] Background removal completed for image ${i + 1} (${processedVersions.length} versions)`);
          } catch (bgError: any) {
            const bgErrorMessage = bgError.message || 'Unknown error';
            console.error(`[Upload Images API] Background removal failed for image ${i + 1}:`, bgErrorMessage);
            // Don't fail the upload if background removal fails - just log it
            // The original image will still be available
            errors.push(`Image "${file.name}" background removal: ${bgErrorMessage}`);
          }
        } else {
          console.log(`[Upload Images API] Background removal disabled, skipping for image ${i + 1}`);
        }

        uploadedImages.push(uploadedImage);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.error(`[Upload Images API] Failed to upload image ${i + 1} (${file.name}):`, errorMessage);
        errors.push(`Image "${file.name}": ${errorMessage}`);
      }
    }

    // If all images failed, return error
    if (uploadedImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to upload all images: ${errors.join('; ')}`,
          code: 'UPLOAD_FAILED',
        },
        { status: 500 }
      );
    }

    // If some images failed, return partial success
    if (errors.length > 0) {
      console.warn(`[Upload Images API] Partial success: ${uploadedImages.length}/${imageFiles.length} images uploaded`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Upload Images API] Successfully uploaded ${uploadedImages.length} image(s) in ${duration}ms`);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        images: uploadedImages,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Upload Images API] Error after ${duration}ms:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Upload failed: ${errorMessage}`,
        code: 'UPLOAD_FAILED',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /api/upload-images
 * 
 * Health check endpoint.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'image-upload',
      storage: 's3',
    },
    { status: 200 }
  );
}

