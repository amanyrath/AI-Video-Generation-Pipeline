/**
 * API Route: Remove Background
 * POST /api/remove-background
 * 
 * Removes background from an image using Replicate's RMBG model
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeBackground, removeBackgrounds } from '@/lib/services/background-remover';

interface RemoveBackgroundRequest {
  imageUrl?: string;
  imageUrls?: string[];
}

interface RemoveBackgroundResponse {
  success: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<RemoveBackgroundResponse>> {
  try {
    const body: RemoveBackgroundRequest = await req.json();

    // Validate request
    if (!body.imageUrl && !body.imageUrls) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either imageUrl or imageUrls is required',
        },
        { status: 400 }
      );
    }

    // Process single image
    if (body.imageUrl) {
      const processedUrl = await removeBackground(body.imageUrl);
      return NextResponse.json({
        success: true,
        imageUrl: processedUrl,
      });
    }

    // Process multiple images
    if (body.imageUrls && Array.isArray(body.imageUrls)) {
      if (body.imageUrls.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'imageUrls array cannot be empty',
          },
          { status: 400 }
        );
      }

      const processedUrls = await removeBackgrounds(body.imageUrls);
      return NextResponse.json({
        success: true,
        imageUrls: processedUrls,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request format',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API:RemoveBackground] Error:', error);

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

