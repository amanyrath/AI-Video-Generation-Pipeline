/**
 * Runway Car Replacement Script
 * 
 * Replace the car in Asteroid City image with the Porsche GT3
 * Using Runway Gen-4 Image with I2I capabilities
 */

import { config } from 'dotenv';
import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

interface CarReplacementOptions {
  sceneImagePath: string;
  carImagePath: string;
  outputPath: string;
  prompt: string;
}

async function replaceCarWithRunway(options: CarReplacementOptions): Promise<string> {
  const { sceneImagePath, carImagePath, outputPath, prompt } = options;

  console.log('\n=== Runway Car Replacement ===\n');
  console.log('Scene Image:', sceneImagePath);
  console.log('Car Image:', carImagePath);
  console.log('Output Path:', outputPath);
  console.log('Prompt:', prompt);
  console.log('\n');

  // Step 1: Read and convert images to data URIs for Replicate
  console.log('Step 1: Reading images and converting to data URIs...');
  
  const sceneImageBuffer = fs.readFileSync(sceneImagePath);
  const carImageBuffer = fs.readFileSync(carImagePath);

  // Convert to data URIs
  const sceneDataUri = `data:image/png;base64,${sceneImageBuffer.toString('base64')}`;
  const carDataUri = `data:image/png;base64,${carImageBuffer.toString('base64')}`;
  
  console.log('  Scene image converted to data URI');
  console.log('  Car image converted to data URI');

  // Step 2: Generate replacement using Runway Gen-4 Image
  console.log('\nStep 2: Generating replacement with Runway Gen-4 Image...');
  
  const prediction = await replicate.run(
    'runwayml/gen4-image',
    {
      input: {
        prompt: prompt,
        image: sceneDataUri, // Base image (Asteroid City scene)
        reference_images: [carDataUri], // Reference image (Porsche GT3)
        output_format: 'png',
        aspect_ratio: '16:9', // Maintain Wes Anderson cinema aspect ratio
        guidance_scale: 7.5,
        num_inference_steps: 50,
      }
    }
  ) as any;

  console.log('Prediction response:', prediction);

  // Step 3: Download and save the result
  let outputUrl: string;
  if (Array.isArray(prediction)) {
    outputUrl = prediction[0];
  } else if (typeof prediction === 'string') {
    outputUrl = prediction;
  } else if (prediction.output) {
    outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  } else {
    throw new Error('Unexpected prediction response format');
  }

  console.log('\nStep 3: Downloading result...');
  console.log('  Output URL:', outputUrl);

  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  console.log('  Saved to:', outputPath);

  return outputPath;
}

// Main execution
async function main() {
  // Check for API token
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Error: REPLICATE_API_TOKEN environment variable is not set.');
    console.error('Please set it in your .env file or environment.');
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  
  const sceneImage = path.join(projectRoot, 'alexis-docs/wes anderson/Asteroid-City.png');
  const carImage = path.join(projectRoot, 'alexis-docs/wes anderson/porsche_gt3_processed_07.png');
  const outputImage = path.join(projectRoot, 'alexis-docs/wes anderson/asteroid-city-with-porsche.png');

  // Verify input files exist
  if (!fs.existsSync(sceneImage)) {
    console.error(`Error: Scene image not found at ${sceneImage}`);
    process.exit(1);
  }

  if (!fs.existsSync(carImage)) {
    console.error(`Error: Car image not found at ${carImage}`);
    process.exit(1);
  }

  // Detailed prompt for car replacement
  const prompt = `A pristine white Porsche 911 GT3 (992) parked in front of a retro gas station and diner in a desert landscape. The scene has a Wes Anderson aesthetic with pastel colors, symmetrical composition, and vintage mid-century modern architecture. The Porsche replaces the old station wagon, maintaining the same position and perspective. Desert rock formations in the background, teal sky, warm lighting. Cinematic, highly detailed, photorealistic.`;

  try {
    const result = await replaceCarWithRunway({
      sceneImagePath: sceneImage,
      carImagePath: carImage,
      outputPath: outputImage,
      prompt: prompt,
    });

    console.log('\n=== Success! ===');
    console.log('Result saved to:', result);
  } catch (error) {
    console.error('\n=== Error ===');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { replaceCarWithRunway };

