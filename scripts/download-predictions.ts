/**
 * Download Predictions
 *
 * This script polls and downloads completed video predictions
 *
 * Usage:
 *   tsx scripts/download-predictions.ts <predictionId1> <predictionId2> ...
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PROJECT_ID = 'test-wan-model';

interface PredictionStatus {
  success: boolean;
  data?: {
    status: string;
    output?: string;
    video?: {
      localPath: string;
    };
  };
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkAndDownload(predictionId: string, sceneIndex: number): Promise<string | null> {
  const maxAttempts = 150; // 5 minutes
  const pollInterval = 2000; // 2 seconds

  console.log(`\n[${ sceneIndex }] Checking prediction: ${predictionId}`);
  console.log('-'.repeat(70));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const url = `${API_URL}/api/generate-video/${predictionId}?projectId=${PROJECT_ID}&sceneIndex=${sceneIndex}`;
      const response = await fetch(url);
      const result: PredictionStatus = await response.json();

      if (!result.success) {
        console.log(`  ❌ Error: ${result.error}`);
        return null;
      }

      const status = result.data?.status;
      console.log(`  Attempt ${attempt + 1}/${maxAttempts}: ${status}`);

      if (status === 'succeeded') {
        const videoPath = result.data?.video?.localPath;
        const videoUrl = result.data?.output;

        console.log(`  ✅ Video ready!`);
        console.log(`     URL: ${videoUrl}`);
        if (videoPath) {
          console.log(`     Local: ${videoPath}`);
        }
        return videoPath || videoUrl || null;
      } else if (status === 'failed' || status === 'canceled') {
        console.log(`  ❌ Generation ${status}`);
        return null;
      }

      // Still processing, wait before next attempt
      if (attempt < maxAttempts - 1) {
        await sleep(pollInterval);
      }
    } catch (error: any) {
      console.log(`  ⚠️  Request error: ${error.message}`);
      if (attempt < maxAttempts - 1) {
        await sleep(pollInterval);
      }
    }
  }

  console.log(`  ⏱️  Timeout after ${maxAttempts * pollInterval / 1000} seconds`);
  return null;
}

async function main() {
  const predictionIds = process.argv.slice(2);

  if (predictionIds.length === 0) {
    console.log('Usage: tsx scripts/download-predictions.ts <predictionId1> <predictionId2> ...');
    console.log('\nExample:');
    console.log('  tsx scripts/download-predictions.ts 6hxde8b05srm80ctgky883y7c0 ca9e24v3r9rme0ctgky923wan0');
    process.exit(1);
  }

  console.log('🎬 Downloading Video Predictions\n');
  console.log('='.repeat(70));
  console.log(`API URL: ${API_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Predictions to download: ${predictionIds.length}`);
  console.log('='.repeat(70));

  const results: Array<{ predictionId: string; path: string | null }> = [];

  for (let i = 0; i < predictionIds.length; i++) {
    const predictionId = predictionIds[i];
    const path = await checkAndDownload(predictionId, i);
    results.push({ predictionId, path });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('Summary\n');

  const successful = results.filter(r => r.path !== null);
  const failed = results.filter(r => r.path === null);

  console.log(`✅ Downloaded: ${successful.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\nSuccessful downloads:');
    successful.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.predictionId}`);
      console.log(`     → ${r.path}`);
    });
  }

  if (failed.length > 0) {
    console.log('\nFailed downloads:');
    failed.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.predictionId}`);
    });
  }

  console.log('\n' + '='.repeat(70));

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
