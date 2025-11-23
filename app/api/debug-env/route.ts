import { NextResponse } from 'next/server';

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  
  return NextResponse.json({
    hasOpenAIKey: !!openaiKey,
    openaiKeyPrefix: openaiKey ? openaiKey.substring(0, 15) + '...' : null,
    hasOpenRouterKey: !!openrouterKey,
    openrouterKeyPrefix: openrouterKey ? openrouterKey.substring(0, 15) + '...' : null,
    hasReplicateToken: !!replicateToken,
    replicateTokenPrefix: replicateToken ? replicateToken.substring(0, 15) + '...' : null,
    replicateTokenFormat: replicateToken ? (replicateToken.startsWith('r8_') ? 'valid' : 'invalid (should start with r8_)') : 'missing',
  });
}
