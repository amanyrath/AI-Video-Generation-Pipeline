/**
 * API Route: Upscale Image
 * POST /api/upscale-image
 * 
 * Upscales images 4x using Replicate's Real-ESRGAN model
 */

import { NextRequest, NextResponse } from 'next/server';
import { upscaleImages } from '@/lib/services/image-upscaler';
import { v4 as uuidv4 } from 'uuid';

interface UpscaleRequest {
  imageUrls: string[];
  projectId: string;
  faceEnhance?: boolean;
}

interface UpscaledImage {
  id: string;
  url: string;
  originalUrl: string;
}

interface UpscaleResponse {
  success: boolean;
  upscaledImages?: UpscaledImage[];
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<UpscaleResponse>> {
  try {
    const body: UpscaleRequest = await req.json();

    // Validate request
    if (!body.imageUrls || !Array.isArray(body.imageUrls) || body.imageUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'imageUrls array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    if (!body.projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId is required',
        },
        { status: 400 }
      );
    }

    console.log(`[API:UpscaleImage] Upscaling ${body.imageUrls.length} images for project ${body.projectId}`);

    // Upscale all images
    const upscaledUrls = await upscaleImages(body.imageUrls, body.projectId);

    // Map to response format
    const upscaledImages: UpscaledImage[] = upscaledUrls.map((url, index) => ({
      id: uuidv4(),
      url,
      originalUrl: body.imageUrls[index],
    }));

    return NextResponse.json({
      success: true,
      upscaledImages,
    });
  } catch (error) {
    console.error('[API:UpscaleImage] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

