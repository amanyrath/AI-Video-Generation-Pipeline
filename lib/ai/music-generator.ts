/**
 * Music Generator Service
 *
 * Generates music using MusicGen via Replicate API.
 * Designed to be extensible for adding Suno or other providers later.
 */

import { MusicGenPrompt } from './video-music-analyzer';

// MusicGen model on Replicate (updated version hash)
const MUSICGEN_MODEL = 'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb';

export type MusicProvider = 'musicgen' | 'suno'; // Extensible for future providers

export interface MusicGenerationRequest {
  prompt: string;
  duration: number; // in seconds
  provider?: MusicProvider;
  temperature?: number;
  topK?: number;
  topP?: number;
  classifierFreeGuidance?: number;
  outputFormat?: 'wav' | 'mp3';
  modelVersion?: 'stereo-melody-large' | 'stereo-large' | 'melody-large' | 'large';
}

export interface MusicGenerationResult {
  success: boolean;
  audioUrl?: string;
  localPath?: string;
  duration?: number;
  provider: MusicProvider;
  predictionId?: string;
  error?: string;
}

export interface MusicGenerationStatus {
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  progress?: number;
  audioUrl?: string;
  error?: string;
}

/**
 * Generate music using MusicGen via Replicate
 */
export async function generateMusicWithMusicGen(
  request: MusicGenerationRequest
): Promise<{ predictionId: string; status: string }> {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN is required for music generation');
  }

  const inputParams = {
    prompt: request.prompt,
    duration: Math.floor(Math.min(Math.max(request.duration, 1), 30)),
    model_version: request.modelVersion || 'stereo-melody-large',
    output_format: request.outputFormat || 'wav',
    temperature: request.temperature ?? 1.0,
    top_k: request.topK ?? 250,
    top_p: request.topP ?? 0.0,
    classifier_free_guidance: request.classifierFreeGuidance ?? 3,
    normalization_strategy: 'loudness',
  };

  console.log('[MusicGenerator] Starting MusicGen generation:', {
    promptLength: request.prompt.length,
    promptPreview: request.prompt.substring(0, 100) + '...',
    duration: inputParams.duration,
    model: inputParams.model_version,
    outputFormat: inputParams.output_format,
  });

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: MUSICGEN_MODEL.split(':')[1],
      input: inputParams,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[MusicGenerator] Replicate API error:', response.status, errorText);
    // Try to parse the error for more details
    try {
      const errorJson = JSON.parse(errorText);
      console.error('[MusicGenerator] Error details:', JSON.stringify(errorJson, null, 2));
      throw new Error(`Failed to start music generation: ${response.status} - ${errorJson.detail || errorJson.error || errorText}`);
    } catch {
      throw new Error(`Failed to start music generation: ${response.status} - ${errorText}`);
    }
  }

  const prediction = await response.json();

  console.log('[MusicGenerator] Generation started:', {
    predictionId: prediction.id,
    status: prediction.status,
  });

  return {
    predictionId: prediction.id,
    status: prediction.status,
  };
}

/**
 * Check the status of a music generation prediction
 */
export async function getMusicGenerationStatus(
  predictionId: string
): Promise<MusicGenerationStatus> {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN is required');
  }

  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: {
        'Authorization': `Token ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get prediction status: ${response.status}`);
  }

  const prediction = await response.json();

  return {
    status: prediction.status,
    audioUrl: prediction.output,
    error: prediction.error,
  };
}

/**
 * Wait for music generation to complete (with polling)
 */
export async function waitForMusicGeneration(
  predictionId: string,
  options: {
    pollInterval?: number;
    timeout?: number;
    onProgress?: (status: MusicGenerationStatus) => void;
  } = {}
): Promise<MusicGenerationResult> {
  const { pollInterval = 2000, timeout = 120000, onProgress } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getMusicGenerationStatus(predictionId);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === 'succeeded') {
      return {
        success: true,
        audioUrl: status.audioUrl,
        provider: 'musicgen',
        predictionId,
      };
    }

    if (status.status === 'failed' || status.status === 'canceled') {
      return {
        success: false,
        provider: 'musicgen',
        predictionId,
        error: status.error || 'Generation failed',
      };
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return {
    success: false,
    provider: 'musicgen',
    predictionId,
    error: 'Generation timed out',
  };
}

/**
 * High-level function to generate music from a prompt
 * Handles the full flow: start generation → poll → return result
 */
export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResult> {
  const provider = request.provider || 'musicgen';

  if (provider === 'musicgen') {
    const { predictionId } = await generateMusicWithMusicGen(request);
    return waitForMusicGeneration(predictionId);
  }

  // Future: Add Suno support here
  if (provider === 'suno') {
    throw new Error('Suno provider not yet implemented');
  }

  throw new Error(`Unknown music provider: ${provider}`);
}

/**
 * Generate music from video analysis (convenience function)
 */
export async function generateMusicFromAnalysis(
  musicPrompt: MusicGenPrompt,
  options?: Partial<MusicGenerationRequest>
): Promise<MusicGenerationResult> {
  return generateMusic({
    prompt: musicPrompt.prompt,
    duration: musicPrompt.duration,
    temperature: musicPrompt.temperature,
    ...options,
  });
}
