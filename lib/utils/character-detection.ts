/**
 * Character Detection Utility
 * 
 * Detects mentions of characters or products in text responses
 */

/**
 * Detects if the text mentions characters or products that would benefit from reference images
 * @param text Text to analyze
 * @returns true if character/product mentions are detected
 */
export function detectCharacterMention(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();

  // Keywords that suggest character or product focus
  const characterKeywords = [
    // People/Characters
    'person', 'character', 'protagonist', 'hero', 'driver', 'rider', 'athlete', 'actor',
    'model', 'woman', 'man', 'boy', 'girl', 'founder', 'ceo', 'employee', 'customer',
    'user', 'player', 'performer', 'dancer', 'singer', 'musician',
    
    // Products/Objects
    'product', 'car', 'vehicle', 'bike', 'motorcycle', 'bicycle', 'watch', 'phone',
    'laptop', 'device', 'bottle', 'package', 'box', 'clothing', 'shoes', 'sneakers',
    'sunglasses', 'bag', 'backpack', 'jewelry', 'ring', 'necklace', 'bracelet',
    'gadget', 'tool', 'equipment', 'gear', 'accessory',
    
    // Branded/specific items
    'brand', 'logo', 'mascot', 'icon', 'symbol',
  ];

  // Check for keyword mentions
  const hasKeyword = characterKeywords.some(keyword => {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}s?\\b`, 'i');
    return regex.test(lowerText);
  });

  if (hasKeyword) {
    return true;
  }

  // Check for possessive forms or descriptive patterns that suggest a specific subject
  // e.g., "the car's design", "a young driver", "my product"
  const subjectPatterns = [
    /\b(the|a|an|our|my|your|their)\s+(specific|unique|custom|branded)\b/i,
    /\b(focus on|featuring|showcasing|highlighting)\s+(the|a|an)\b/i,
    /\b(close[-\s]up|hero shot|product shot)\b/i,
    /\b(consistency|continuity|same)\s+(character|person|product|object)\b/i,
  ];

  const hasPattern = subjectPatterns.some(pattern => pattern.test(text));

  return hasPattern;
}

/**
 * Extracts character or product description from text
 * @param text Text to analyze
 * @returns Extracted description or empty string
 */
export function extractCharacterDescription(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const lowerText = text.toLowerCase();
  
  // Simple extraction: look for descriptive patterns
  // This is a basic implementation - could be enhanced with NLP
  
  // Pattern: "The X is..." or "A X that..."
  const descriptionPatterns = [
    /(?:the|a|an)\s+([^.,]+?)\s+(?:is|that|which|who)/i,
    /(?:featuring|showcasing)\s+([^.,]+?)(?:\.|,|$)/i,
    /(?:focus on|centered on)\s+([^.,]+?)(?:\.|,|$)/i,
  ];

  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no specific pattern found, return first sentence if it mentions product/character
  const firstSentence = text.split(/[.!?]/)[0];
  if (firstSentence && detectCharacterMention(firstSentence)) {
    return firstSentence.trim();
  }

  return '';
}

/**
 * Analyzes wizard responses to determine if character validation is needed
 * @param responses Object containing wizard responses
 * @returns Object with detection results
 */
export function analyzeWizardResponses(responses: {
  idea: string;
  subject: string;
  style: string;
  audio: string;
  platform: string;
}): {
  needsValidation: boolean;
  characterDescription: string;
  detectedIn: string[];
} {
  const detectedIn: string[] = [];
  let characterDescription = '';

  // Check each response field
  if (detectCharacterMention(responses.idea)) {
    detectedIn.push('idea');
    if (!characterDescription) {
      characterDescription = extractCharacterDescription(responses.idea);
    }
  }

  if (detectCharacterMention(responses.subject)) {
    detectedIn.push('subject');
    if (!characterDescription) {
      characterDescription = extractCharacterDescription(responses.subject);
    }
  }

  // Less likely but still check style and audio
  if (detectCharacterMention(responses.style)) {
    detectedIn.push('style');
  }

  return {
    needsValidation: detectedIn.length > 0,
    characterDescription: characterDescription || responses.subject, // Fallback to subject
    detectedIn,
  };
}

