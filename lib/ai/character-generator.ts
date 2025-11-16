/**
 * Character Generator - Style-Aware Character Generation
 * 
 * This module handles character generation with style-aware prompts
 * that adapt based on user preferences (cartoon vs realistic, etc.)
 */

import { v4 as uuidv4 } from 'uuid';
import { createImagePredictionWithRetry, pollReplicateStatus, downloadAndSaveImage } from './image-generator';

/**
 * Generates multiple character variations based on a description
 * @param description Character description with style preferences
 * @param projectId Project ID for file organization
 * @param count Number of variations to generate (1-10)
 * @returns Array of generated character images
 */
export async function generateCharacterVariation(
  description: string,
  projectId: string,
  count: number = 5
): Promise<Array<{ id: string; url: string }>> {
  if (!description || typeof description !== 'string') {
    throw new Error('Description is required and must be a string');
  }

  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a string');
  }

  if (count < 1 || count > 10) {
    throw new Error('Count must be between 1 and 10');
  }

  const logPrefix = '[CharacterGenerator]';
  console.log(`${logPrefix} Generating ${count} character variation(s)`);
  console.log(`${logPrefix} Description: ${description}`);
  console.log(`${logPrefix} Project ID: ${projectId}`);

  const results: Array<{ id: string; url: string }> = [];

  // Generate variations sequentially to avoid overwhelming the API
  for (let i = 0; i < count; i++) {
    console.log(`${logPrefix} Generating variation ${i + 1}/${count}`);

    try {
      // Add variation seed to prompt for diversity
      const variationPrompt = addVariationSeed(description, i);

      // Create prediction
      const predictionId = await createImagePredictionWithRetry(variationPrompt);
      console.log(`${logPrefix} Prediction created for variation ${i + 1}: ${predictionId}`);

      // Poll for completion
      const imageUrl = await pollReplicateStatus(predictionId);
      console.log(`${logPrefix} Variation ${i + 1} completed`);

      // Download and save
      const savedImage = await downloadAndSaveImage(imageUrl, projectId, 999); // Use 999 as placeholder scene index for characters
      console.log(`${logPrefix} Variation ${i + 1} saved: ${savedImage.localPath}`);

      results.push({
        id: savedImage.id,
        url: savedImage.url,
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to generate variation ${i + 1}:`, error);
      // Continue with other variations even if one fails
      // We'll return whatever we successfully generated
    }
  }

  if (results.length === 0) {
    throw new Error('Failed to generate any character variations');
  }

  console.log(`${logPrefix} Successfully generated ${results.length}/${count} variation(s)`);
  return results;
}

/**
 * Adds variation seed to prompt for diversity
 * @param prompt Base prompt
 * @param index Variation index
 * @returns Modified prompt with variation seed
 */
function addVariationSeed(prompt: string, index: number): string {
  const variations = [
    'front view, centered composition',
    'three-quarter view, dynamic angle',
    'side profile, clear silhouette',
    'slight angle from above, hero perspective',
    'straight-on view, powerful stance',
  ];

  const seed = variations[index % variations.length];
  return `${prompt}, ${seed}`;
}

/**
 * Detects style keywords in description and returns style type
 * @param description Character description
 * @returns Style type: 'cartoon', 'realistic', or 'default'
 */
export function detectStyleType(description: string): 'cartoon' | 'realistic' | 'default' {
  const lowerDescription = description.toLowerCase();

  // Cartoon keywords
  const cartoonKeywords = [
    'cartoon', 'animated', 'stylized', 'illustrated', 'comic', 'anime',
    'cel-shaded', 'toon', '2d', 'hand-drawn', 'pixar', 'disney',
  ];

  // Realistic keywords
  const realisticKeywords = [
    'realistic', 'photorealistic', 'hyper-realistic', 'real-life', 'photograph',
    'photo', 'cinematic', '3d render', 'hyperrealism', 'lifelike',
  ];

  const hasCartoon = cartoonKeywords.some(keyword => lowerDescription.includes(keyword));
  const hasRealistic = realisticKeywords.some(keyword => lowerDescription.includes(keyword));

  if (hasCartoon && !hasRealistic) {
    return 'cartoon';
  } else if (hasRealistic && !hasCartoon) {
    return 'realistic';
  } else {
    return 'default';
  }
}

/**
 * Enhances prompt with style-specific instructions
 * @param basePrompt Base character prompt
 * @param styleType Style type detected or specified
 * @returns Enhanced prompt
 */
export function enhancePromptWithStyle(basePrompt: string, styleType: 'cartoon' | 'realistic' | 'default'): string {
  const styleInstructions: Record<string, string> = {
    cartoon: 'cartoon style, vibrant colors, clean lines, animated character design, stylized proportions, cel-shaded',
    realistic: 'photorealistic, hyper-realistic details, studio lighting, professional photography, lifelike textures, cinematic quality',
    default: 'high quality, professional, clean composition, balanced style',
  };

  const instruction = styleInstructions[styleType];
  return `${basePrompt}, ${instruction}`;
}

