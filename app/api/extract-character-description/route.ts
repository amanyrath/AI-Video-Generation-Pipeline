import { NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullPrompt } = body;

    if (!fullPrompt || typeof fullPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Full prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('[ExtractCharacter] Extracting character description from prompt');

    const systemPrompt = `You are extracting detailed character/object information from a video prompt for consistent AI image generation.

Your task is to extract ONLY the physical description of the main character or object, formatted for image generation consistency.

Include:
- Physical appearance (age, gender, ethnicity, body type, facial features)
- Hair (color, style, length, texture)
- Clothing (detailed description of outfit, colors, style)
- Accessories or props
- Distinctive features or characteristics
- Color palette
- Overall aesthetic or style

Exclude:
- Camera angles, shots, or cinematography details
- Lighting or technical specifications
- Actions, movements, or story elements
- Emotions or expressions
- Background or environment details
- Any meta commentary

Format:
- Write in clear, descriptive prose suitable for AI image generation
- Use specific, visual details
- Keep under 150 words
- Focus on details that ensure consistency across multiple generated images
- Output ONLY the character/object description, nothing else

Example output: "A young woman in her mid-20s with shoulder-length auburn hair styled in loose waves, fair skin with light freckles, and green eyes. She wears a vintage leather motorcycle jacket in dark brown over a white cotton t-shirt, paired with high-waisted black jeans and brown leather boots. She has a delicate silver necklace and small hoop earrings. Her style is casual yet refined, with a bohemian edge. The color palette is warm earth tones with pops of white."`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Video Generation Pipeline',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Full prompt:\n${fullPrompt}\n\nExtract the detailed character/object description:`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ExtractCharacter] OpenRouter API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to extract character description' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const extractedDescription = data.choices?.[0]?.message?.content?.trim() || '';

    if (!extractedDescription) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract character description' },
        { status: 500 }
      );
    }

    // Validate extraction quality - should not be error messages or original prompt
    if (
      extractedDescription.toLowerCase().includes('i cannot') ||
      extractedDescription.toLowerCase().includes('i apologize') ||
      extractedDescription.length < 20 ||
      extractedDescription === fullPrompt
    ) {
      console.warn('[ExtractCharacter] Poor quality extraction, using fallback');
      // Simple fallback: extract first sentence/phrase from prompt
      const firstSentence = fullPrompt.split(/[.!?]/)[0].trim();
      return NextResponse.json({
        success: true,
        characterDescription: firstSentence || 'Character from your video prompt',
      });
    }

    console.log('[ExtractCharacter] Successfully extracted character description');

    return NextResponse.json({
      success: true,
      characterDescription: extractedDescription,
    });

  } catch (error) {
    console.error('[ExtractCharacter] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

