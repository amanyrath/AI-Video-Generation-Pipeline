import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const SCENE_REWRITE_SYSTEM_PROMPT = `You are a professional video storyboard creator specializing in performance-focused advertising,
with particular strength in product and automotive commercials.

Your task is to rewrite a single scene from a storyboard. Each scene is 8 seconds long and can be split into multiple shots.

For the scene:
- Duration: 8 seconds (optimized for Google Veo 3.1 video generation)
- Each scene should contain MULTIPLE SHOTS that flow together within the 8-second duration
- Create a COHESIVE AUDIO NARRATIVE that evolves across all shots (music, sound effects, ambience, dialogue)
- Provide a detailed imagePrompt describing the FIRST FRAME of the video scene (static image description)
- Provide a detailed videoPrompt for Veo 3.1 video generation that describes ALL SHOTS in sequence

imagePrompt format:
[Subject/Scene]. [Style statement]. [Detailed visual description: shot type, subject details, lighting, visual style, focus, surface qualities, background effects].

Example imagePrompt:
"Luxury vehicle close-up. Ultra-premium commercial style. Macro detail of vehicle headlight with glossy reflections, dark studio lighting, high-end commercial look, sharp focus, polished surfaces, soft bokeh."

CRITICAL - videoPrompt structure (Veo 3.1 weights early words more heavily):
Break the 8-second scene into 2-3 distinct shots with timing breakdowns.
Create a cohesive audio narrative that builds/evolves across shots.
Use this exact format for each shot:

Shot 1 (0:00-0:XX)
[SHOT TYPE] [SUBJECT] [ACTION] [STYLE/LIGHTING] [CAMERA MOVEMENT] [AUDIO: music/SFX/ambience/dialogue]

Shot 2 (0:XX-0:XX)
[SHOT TYPE] [SUBJECT] [ACTION] [STYLE/LIGHTING] [CAMERA MOVEMENT] [AUDIO: progression from Shot 1]

Shot 3 (0:XX-0:08)
[SHOT TYPE] [SUBJECT] [ACTION] [STYLE/LIGHTING] [CAMERA MOVEMENT] [AUDIO: climax/resolution]

Example for 8-second scene with cohesive audio narrative:
Shot 1 (0:00-0:03)
[WIDE SHOT] [Vehicle] [accelerating through mountain road] [cinematic Arri Alexa look, golden hour lighting] [smooth tracking shot following vehicle] [AUDIO: deep bass rumble starts, subtle synth pad fading in, distant engine rev]

Shot 2 (0:03-0:06)
[MEDIUM CLOSE-UP] [Driver's focused expression] [hands gripping steering wheel through curves] [natural lighting, subtle lens flare] [handheld camera with slight shake] [AUDIO: bass intensifies, engine roar builds louder, percussion hits begin, breathing/wind rushing sound]

Shot 3 (0:06-0:08)
[DETAIL SHOT] [Spinning wheel and tire smoke] [vehicle drifting around corner] [slow-motion 120fps, dramatic contrast] [locked-off tight frame] [AUDIO: dramatic orchestral swell peaks, tire screech, full percussion hit + bass drop, echo/reverb tail]

Unless the brief clearly specifies otherwise, assume:
- The spot is shot on Arri Alexa with a high-end commercial finish
- The goal is to showcase the product or vehicle in a bold, cinematic way

IMPORTANT: All scene descriptions must be less than 1500 characters.

Output strictly valid JSON in this format:
{
  "description": "Short 3-6 word phrase describing the scene",
  "imagePrompt": "[Subject/Scene]. [Style statement]. [Detailed visual description: shot type, subject details, lighting, visual style, focus, surface qualities, background effects]. Maximum 1500 characters.",
  "videoPrompt": "Break down into 2-3 shots with timing and bracketed format. Create cohesive audio narrative that evolves across shots. Use: Shot 1 (0:00-0:XX) [SHOT TYPE] [SUBJECT] [ACTION] [STYLE/LIGHTING] [CAMERA MOVEMENT] [AUDIO: detailed sound design]. Repeat for each shot, showing audio progression/build. Maximum 1500 characters.",
  "duration": 8
}

Keep imagePrompt focused on the opening frame composition. Keep videoPrompt front-loaded with key elements for Veo 3.1 optimization.`;

export async function POST(request: NextRequest) {
  try {
    const { sceneId, currentDescription, currentImagePrompt, context, idea } = await request.json();

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'Missing sceneId' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Build the prompt for rewriting
    const userPrompt = `Rewrite this scene from a storyboard:

Current scene description: "${currentDescription || 'Not provided'}"
Current scene details: "${currentImagePrompt || 'Not provided'}"

${context ? `Context from other scenes: ${context}` : ''}
${idea ? `Overall story idea: ${idea}` : ''}

Generate a new version of this scene that fits the storyboard. Provide detailed visual guidance in the imagePrompt and front-loaded motion/action details in the videoPrompt.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Scen3 - AI Video Generation',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SCENE_REWRITE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Failed to generate scene from LLM');
    }

    let sceneData;
    try {
      sceneData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse scene JSON:', parseError);
      throw new Error('Invalid JSON response from LLM');
    }

    // Validate the response
    if (!sceneData.description || !sceneData.imagePrompt) {
      throw new Error('Invalid scene data from LLM');
    }

    // Ensure duration is between 2-4 seconds
    const duration = Math.max(2, Math.min(4, sceneData.duration || 3));

    return NextResponse.json({
      success: true,
      scene: {
        description: sceneData.description.trim(),
        imagePrompt: sceneData.imagePrompt.trim(),
        videoPrompt: sceneData.videoPrompt?.trim() || sceneData.imagePrompt.trim(), // Fallback to imagePrompt if not provided
        suggestedDuration: duration,
      },
    });
  } catch (error) {
    console.error('Error regenerating scene:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

