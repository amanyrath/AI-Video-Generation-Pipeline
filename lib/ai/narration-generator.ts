/**
 * Narration Generator Service
 *
 * Generates narration audio using OpenAI TTS HD via OpenRouter API.
 * Supports multiple voices and provides high-quality text-to-speech for video narration.
 */

// OpenRouter API endpoint for OpenAI TTS
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/audio/speech';

// Available OpenAI TTS HD voices
export type NarrationVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface NarrationRequest {
  text: string;
  voice?: NarrationVoice;
  speed?: number; // 0.25 to 4.0, default 1.0
  projectId: string;
}

export interface NarrationResult {
  success: boolean;
  audioUrl?: string;
  localPath?: string;
  s3Key?: string;
  duration?: number;
  voice: NarrationVoice;
  error?: string;
}

/**
 * Generate narration audio using OpenAI TTS HD via OpenRouter
 */
export async function generateNarration(
  request: NarrationRequest
): Promise<NarrationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for narration generation');
  }

  const voice = request.voice || 'alloy';
  const speed = Math.min(Math.max(request.speed || 1.0, 0.25), 4.0);

  console.log('[NarrationGenerator] Starting TTS generation:', {
    textLength: request.text.length,
    textPreview: request.text.substring(0, 100) + (request.text.length > 100 ? '...' : ''),
    voice,
    speed,
  });

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Video Generation Pipeline - Narration',
      },
      body: JSON.stringify({
        model: 'openai/tts-1-hd',
        input: request.text,
        voice: voice,
        speed: speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NarrationGenerator] OpenRouter API error:', response.status, errorText);

      // Try to parse error for more details
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`Failed to generate narration: ${response.status} - ${errorJson.error?.message || errorJson.detail || errorText}`);
      } catch {
        throw new Error(`Failed to generate narration: ${response.status} - ${errorText}`);
      }
    }

    // Response is audio data
    const audioBuffer = await response.arrayBuffer();

    console.log('[NarrationGenerator] TTS generation completed:', {
      audioSize: audioBuffer.byteLength,
      voice,
    });

    return {
      success: true,
      voice,
      // Audio buffer will be processed by the API route
      audioUrl: undefined, // Will be set after saving
      localPath: undefined,
    };
  } catch (error) {
    console.error('[NarrationGenerator] Error:', error);
    return {
      success: false,
      voice,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate narration and return raw audio buffer
 * Used internally by API route to save the file
 */
export async function generateNarrationBuffer(
  request: NarrationRequest
): Promise<{ success: boolean; buffer?: ArrayBuffer; voice: NarrationVoice; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      voice: request.voice || 'alloy',
      error: 'OPENROUTER_API_KEY is required for narration generation',
    };
  }

  const voice = request.voice || 'alloy';
  const speed = Math.min(Math.max(request.speed || 1.0, 0.25), 4.0);

  console.log('[NarrationGenerator] Starting TTS generation:', {
    textLength: request.text.length,
    textPreview: request.text.substring(0, 100) + (request.text.length > 100 ? '...' : ''),
    voice,
    speed,
  });

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Video Generation Pipeline - Narration',
      },
      body: JSON.stringify({
        model: 'openai/tts-1-hd',
        input: request.text,
        voice: voice,
        speed: speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NarrationGenerator] OpenRouter API error:', response.status, errorText);

      try {
        const errorJson = JSON.parse(errorText);
        return {
          success: false,
          voice,
          error: `Failed to generate narration: ${response.status} - ${errorJson.error?.message || errorJson.detail || errorText}`,
        };
      } catch {
        return {
          success: false,
          voice,
          error: `Failed to generate narration: ${response.status} - ${errorText}`,
        };
      }
    }

    const audioBuffer = await response.arrayBuffer();

    console.log('[NarrationGenerator] TTS generation completed:', {
      audioSize: audioBuffer.byteLength,
      voice,
    });

    return {
      success: true,
      buffer: audioBuffer,
      voice,
    };
  } catch (error) {
    console.error('[NarrationGenerator] Error:', error);
    return {
      success: false,
      voice,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Voice descriptions for UI display
 */
export const VOICE_DESCRIPTIONS: Record<NarrationVoice, { name: string; description: string }> = {
  alloy: { name: 'Alloy', description: 'Neutral, versatile voice' },
  echo: { name: 'Echo', description: 'Warm, conversational voice' },
  fable: { name: 'Fable', description: 'Expressive, storytelling voice' },
  onyx: { name: 'Onyx', description: 'Deep, authoritative voice' },
  nova: { name: 'Nova', description: 'Energetic, youthful voice' },
  shimmer: { name: 'Shimmer', description: 'Soft, gentle voice' },
};

/**
 * Estimate narration duration based on text length
 * Average speaking rate is ~150 words per minute
 */
export function estimateNarrationDuration(text: string, speed: number = 1.0): number {
  const wordCount = text.trim().split(/\s+/).length;
  const wordsPerMinute = 150 * speed;
  const durationMinutes = wordCount / wordsPerMinute;
  return Math.max(1, Math.ceil(durationMinutes * 60)); // Return duration in seconds
}
