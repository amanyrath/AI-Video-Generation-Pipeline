/**
 * API Route: Generate Character Variations
 * POST /api/generate-character-variations
 * 
 * Generates multiple character variations based on a description
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCharacterVariation } from '@/lib/ai/character-generator';

interface GenerateCharacterVariationsRequest {
  description: string;
  projectId: string;
  count?: number;
}

interface GenerateCharacterVariationsResponse {
  success: boolean;
  images?: Array<{ id: string; url: string }>;
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<GenerateCharacterVariationsResponse>> {
  try {
    const body: GenerateCharacterVariationsRequest = await req.json();

    // Validate request
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Description is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!body.projectId || typeof body.projectId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required and must be a string',
        },
        { status: 400 }
      );
    }

    const count = body.count && typeof body.count === 'number' ? body.count : 5;

    if (count < 1 || count > 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Count must be between 1 and 10',
        },
        { status: 400 }
      );
    }

    // Generate character variations
    const images = await generateCharacterVariation(body.description, body.projectId, count);

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('[API:GenerateCharacterVariations] Error:', error);

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

