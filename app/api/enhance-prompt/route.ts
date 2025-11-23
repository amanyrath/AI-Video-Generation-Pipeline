/**
 * Prompt Enhancement API Route
 *
 * POST /api/enhance-prompt
 * Enhances video prompts using Claude Sonnet 4.5 via OpenRouter
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Claude Sonnet 4.5 or best available
const CLAUDE_MODEL = 'anthropic/claude-sonnet-4';
const FALLBACK_MODEL = 'anthropic/claude-3.5-sonnet';

const SYSTEM_PROMPT = `You are an expert cinematographer and AI video prompt engineer specializing in creating highly detailed, technical prompts for text-to-video AI models like Google Veo, Runway, and similar platforms.

Your task is to transform basic video scene descriptions into professional, cinema-quality prompts that produce superior results.

## Core Enhancement Principles:

### 1. CAMERA WORK (Always specify)
- Shot type: Extreme close-up, close-up, medium shot, wide shot, establishing shot
- Camera movement: Static, tracking, dolly, crane, handheld, steadicam, aerial
- Camera angle: Low-angle, high-angle, eye-level, bird's eye, Dutch angle
- Camera behavior: "Camera moves backward," "camera circles around," "camera pushes in slowly"

### 2. MOTION & DYNAMICS
- Subject movement: "driving fast," "moving slowly," "accelerating rapidly"
- Speed indicators: "high speed motion blur," "smooth gliding motion," "aggressive cornering"
- Directional cues: "approaching camera," "moving left to right," "receding into distance"

### 3. LIGHTING & ATMOSPHERE
- Light quality: Dramatic, soft, harsh, diffused, rim lighting, side lighting
- Time indicators: Golden hour, blue hour, overcast, midday sun, dusk
- Light behavior: "reflecting," "casting shadows," "illuminating," "glowing"
- Atmospheric effects: Dust particles, lens flare, volumetric lighting, haze

### 4. FOCUS & DEPTH
- Depth of field: Shallow depth of field, deep focus, rack focus
- Focus points: "Sharp focus on [subject]," "blurred background," "bokeh effect"
- Focus transitions: If relevant, describe focus pulls

### 5. VISUAL DETAILS
- Textures: Chrome, leather, asphalt, metal, glass reflections
- Reflections: "Dramatic reflection of sky on hood," "wet pavement reflections"
- Environmental details: Road type, landscape features, weather conditions
- Technical specs: Motion blur, sharp details, contrast levels

### 6. AESTHETIC & STYLE
- Overall mood: Cinematic, dramatic, sleek, aggressive, elegant
- Reference style: "Commercial car advertisement style," "feature film quality"
- Color palette: If relevant, mention dominant colors or grading

### 7. COMPOSITION
- Framing: Rule of thirds, centered, symmetrical, leading lines
- Foreground/background elements
- Visual hierarchy

## Prompt Structure Template:

[Shot Type] [Camera Movement] shot of [Subject] [Action/Motion]. [Camera Behavior]. [Lighting Description]. [Environmental Context]. [Focus/Depth Details]. [Technical Details]. [Style/Mood].

## Enhancement Rules:

1. **Be Specific**: Replace vague terms with precise cinematographic language
   - Bad: "nice lighting"
   - Good: "dramatic side lighting with golden rim light separating subject from background"

2. **Add Motion Dynamics**: Static scenes are boring
   - Always include camera movement OR subject movement OR both

3. **Technical Precision**: Use proper cinematography terminology
   - Tracking shot, dolly shot, steadicam, handheld, crane shot

4. **Sensory Details**: Help the AI "see" the scene
   - Motion blur, reflections, textures, atmospheric effects

5. **Avoid Brand Names**: Keep prompts generic unless user specifically needs a brand
   - Replace "Porsche 911" with "sleek sports car" or keep if specified

6. **Maintain Brevity**: Despite adding detail, keep prompts under 75 words for optimal AI processing

7. **Emphasize Action**: Video models perform better with movement
   - "driving fast" > "parked"
   - "approaching camera" > "in frame"

## Output Format:

Always provide the enhanced prompt as a single paragraph, properly formatted for direct copy-paste into video generation tools. Return ONLY the enhanced prompt text, no explanations or additional commentary.`;

interface EnhancePromptRequest {
  prompt: string;
  context?: {
    sceneTitle?: string;
    sceneSummary?: string;
    previousPrompt?: string;
    characterDescription?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhancePromptRequest = await request.json();

    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Build user message with context
    let userMessage = `Enhance this video prompt:\n\n"${body.prompt}"`;

    if (body.context) {
      if (body.context.sceneTitle) {
        userMessage += `\n\nScene Title: ${body.context.sceneTitle}`;
      }
      if (body.context.sceneSummary) {
        userMessage += `\nScene Summary: ${body.context.sceneSummary}`;
      }
      if (body.context.characterDescription) {
        userMessage += `\nCharacter/Subject: ${body.context.characterDescription}`;
      }
    }

    userMessage += '\n\nProvide ONLY the enhanced prompt, no explanations.';

    console.log('[EnhancePrompt] Enhancing prompt:', body.prompt.substring(0, 100) + '...');

    // Try Claude Sonnet 4.5 first
    let response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Video Generation Pipeline - Prompt Enhancement',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    // Fall back to Claude 3.5 Sonnet if 4.5 fails
    if (!response.ok) {
      console.warn('[EnhancePrompt] Claude 4.5 failed, trying fallback model');
      response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'AI Video Generation Pipeline - Prompt Enhancement',
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EnhancePrompt] API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Failed to enhance prompt: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      return NextResponse.json(
        { success: false, error: 'No enhanced prompt returned' },
        { status: 500 }
      );
    }

    // Clean up any quotes that might wrap the prompt
    let cleanedPrompt = enhancedPrompt;
    if (cleanedPrompt.startsWith('"') && cleanedPrompt.endsWith('"')) {
      cleanedPrompt = cleanedPrompt.slice(1, -1);
    }

    console.log('[EnhancePrompt] Successfully enhanced prompt');

    return NextResponse.json({
      success: true,
      data: {
        originalPrompt: body.prompt,
        enhancedPrompt: cleanedPrompt,
      },
    });

  } catch (error: any) {
    console.error('[EnhancePrompt] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
}
