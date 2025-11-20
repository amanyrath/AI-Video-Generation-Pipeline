/**
 * Character/Product Detection Utility
 * 
 * Detects if a prompt mentions characters or products that should be validated
 */

/**
 * Detects if a prompt mentions characters or products
 * @param prompt User prompt text
 * @returns true if characters/products are detected
 */
export function detectCharactersOrProducts(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();

  // Character keywords
  const characterKeywords = [
    'character', 'person', 'man', 'woman', 'child', 'kid',
    'boy', 'girl', 'protagonist', 'hero', 'villain', 'actor',
    'driver', 'pilot', 'rider', 'athlete', 'model', 'customer',
    'founder', 'executive', 'worker', 'employee', 'figure',
    'mascot', 'creature', 'avatar', 'agent', 'user',
  ];

  // Product keywords
  const productKeywords = [
    'car', 'vehicle', 'automobile', 'truck', 'suv', 'sedan',
    'product', 'item', 'object', 'device', 'gadget', 'tool',
    'phone', 'laptop', 'computer', 'watch', 'shoe', 'shoes',
    'bottle', 'can', 'package', 'box', 'container',
    'porsche', 'mercedes', 'bmw', 'ferrari', 'tesla', 'ford',
    'nike', 'adidas', 'apple', 'samsung', 'sony',
    'motorcycle', 'bike', 'bicycle', 'scooter', 'drone',
  ];

  const allKeywords = [...characterKeywords, ...productKeywords];

  return allKeywords.some(keyword => {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerPrompt);
  });
}

/**
 * Extracts character/product description from prompt
 * @param prompt User prompt text
 * @returns Extracted description or null
 */
export function extractCharacterDescription(prompt: string): string | null {
  const detected = detectCharactersOrProducts(prompt);
  if (!detected) return null;

  // For now, return the whole prompt
  // In future, could use NLP to extract just the relevant part
  return prompt;
}

/**
 * Determines if style is cartoon or realistic based on prompt
 * @param prompt User prompt text
 * @returns 'cartoon', 'realistic', or 'default'
 */
export function detectPromptStyle(prompt: string): 'cartoon' | 'realistic' | 'default' {
  const lowerPrompt = prompt.toLowerCase();

  // Cartoon keywords
  const cartoonKeywords = [
    'cartoon', 'animated', 'animation', 'stylized', 'illustrated',
    'comic', 'anime', 'cel-shaded', 'toon', '2d', 'hand-drawn',
    'pixar', 'disney', 'dreamworks', 'studio ghibli',
  ];

  // Realistic keywords
  const realisticKeywords = [
    'realistic', 'photorealistic', 'hyper-realistic', 'real-life',
    'photograph', 'photo', 'cinematic', 'live-action', '3d render',
    'hyperrealism', 'lifelike', 'real', 'actual',
  ];

  const hasCartoon = cartoonKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerPrompt);
  });

  const hasRealistic = realisticKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerPrompt);
  });

  if (hasCartoon && !hasRealistic) {
    return 'cartoon';
  } else if (hasRealistic && !hasCartoon) {
    return 'realistic';
  } else {
    return 'default';
  }
}
