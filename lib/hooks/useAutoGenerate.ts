/**
 * Hook for auto-generating entire video workflow
 * Automatically generates images and videos for all scenes in sequence
 */

import { useEffect, useRef, useState } from 'react';
import { useProjectStore, useSceneStore, useUIStore } from '@/lib/state/project-store';
import {
  generateImage,
  pollImageStatus,
  generateVideo,
  pollVideoStatus,
  extractFrames,
} from '@/lib/api-client';
import { ImageGenerationRequest } from '@/lib/types';
import { processBatch } from '@/lib/utils/batch-processor';
import { getImageRateLimit, getVideoRateLimit } from '@/lib/config/rate-limits';
import { getEffectiveImageModel, getEffectiveVideoModel } from '@/lib/config/model-runtime';

interface UseAutoGenerateOptions {
  enabled?: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoGenerate(options: UseAutoGenerateOptions = {}) {
  const { enabled = false, onComplete, onError } = options;

  const { project } = useProjectStore();
  const {
    scenes,
    setSceneStatus,
    addGeneratedImage,
    selectImage,
    setVideoPath,
    setSeedFrames,
    selectSeedFrame,
  } = useSceneStore();
  const { addChatMessage } = useUIStore();

  const [isRunning, setIsRunning] = useState(false);
  const hasStartedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Only run once when enabled and storyboard is available
    if (!enabled || hasStartedRef.current || !project || isRunning) {
      return;
    }

    // Wait for storyboard to be available before starting
    if (!project.storyboard || project.storyboard.length === 0) {
      console.log('[useAutoGenerate] Waiting for storyboard to be available...');
      return;
    }

    hasStartedRef.current = true;
    setIsRunning(true);
    abortControllerRef.current = new AbortController();

    const runAutoGeneration = async () => {
      try {
        console.log('[useAutoGenerate] Starting auto-generation for all scenes');
        addChatMessage({
          role: 'agent',
          content: '🚀 Starting auto-generation for entire video...',
          type: 'status',
        });

        // Double-check storyboard is still available
        if (!project.storyboard || project.storyboard.length === 0) {
          throw new Error('No storyboard found. Please create a project first.');
        }

        // Get rate limits for current models
        const imageModel = getEffectiveImageModel();
        const videoModel = getEffectiveVideoModel();
        const imageRateLimit = getImageRateLimit(imageModel);
        const videoRateLimit = getVideoRateLimit(videoModel);

        console.log('[useAutoGenerate] Rate limits:', {
          imageModel,
          videoModel,
          imageLimit: imageRateLimit,
          videoLimit: videoRateLimit,
        });

        // PHASE 1: Generate all images with rate limiting
        addChatMessage({
          role: 'agent',
          content: `🎨 Generating images (max ${imageRateLimit.maxConcurrent} concurrent)...`,
          type: 'status',
        });

        const imageTasks = project.storyboard.map((scene, sceneIndex) => {
          return async () => {
            try {
              console.log(`[useAutoGenerate] Scene ${sceneIndex}: Starting image generation`);
              const generatedImage = await generateImageForScene(sceneIndex);
              console.log(`[useAutoGenerate] Scene ${sceneIndex}: ✓ Image generated`);
              return { sceneIndex, image: generatedImage };
            } catch (error) {
              console.error(`[useAutoGenerate] Scene ${sceneIndex} image failed:`, error);
              addChatMessage({
                role: 'agent',
                content: `❌ Scene ${sceneIndex + 1} image failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
              });
              throw error;
            }
          };
        });

        let imageResults: any[];
        try {
          imageResults = await processBatch(imageTasks, {
            maxConcurrent: imageRateLimit.maxConcurrent,
            minDelayBetweenRequests: imageRateLimit.minDelayBetweenRequests,
            onProgress: (completed, total) => {
              console.log(`[useAutoGenerate] Images: ${completed}/${total} completed`);
            },
          });
        } catch (error: any) {
          // Batch processing failed - some images didn't generate
          const errors = error.errors || [];
          const results = error.results || [];
          const successCount = results.filter((r: any) => r !== undefined).length;

          console.error(`[useAutoGenerate] Image generation partially failed: ${successCount}/${project.storyboard.length} succeeded`);
          addChatMessage({
            role: 'agent',
            content: `⚠️ Image generation completed with errors: ${successCount}/${project.storyboard.length} scenes succeeded`,
            type: 'error',
          });

          // Stop the workflow - we can't proceed without images
          throw new Error(`Image generation failed: Only ${successCount}/${project.storyboard.length} images generated successfully`);
        }

        const successfulImages = imageResults.filter((r: any) => r !== undefined).length;
        addChatMessage({
          role: 'agent',
          content: `✓ All ${successfulImages} images generated`,
          type: 'status',
        });

        // PHASE 2: Generate all videos with rate limiting
        addChatMessage({
          role: 'agent',
          content: `🎬 Generating videos (max ${videoRateLimit.maxConcurrent} concurrent)...`,
          type: 'status',
        });

        const videoTasks = project.storyboard.map((scene, sceneIndex) => {
          return async () => {
            try {
              console.log(`[useAutoGenerate] Scene ${sceneIndex}: Starting video generation`);
              const imageData = imageResults[sceneIndex];

              // Skip if image generation failed for this scene
              if (!imageData || !imageData.image) {
                console.warn(`[useAutoGenerate] Scene ${sceneIndex}: Skipping video generation - no image available`);
                throw new Error(`No image available for scene ${sceneIndex + 1}`);
              }

              await generateVideoForScene(sceneIndex, imageData.image);
              console.log(`[useAutoGenerate] Scene ${sceneIndex}: ✓ Video generated`);

              addChatMessage({
                role: 'agent',
                content: `✓ Scene ${sceneIndex + 1} completed`,
                type: 'status',
              });

              return { sceneIndex, success: true };
            } catch (error) {
              console.error(`[useAutoGenerate] Scene ${sceneIndex} video failed:`, error);
              addChatMessage({
                role: 'agent',
                content: `❌ Scene ${sceneIndex + 1} video failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
              });
              throw error;
            }
          };
        });

        let videoResults: any[];
        try {
          videoResults = await processBatch(videoTasks, {
            maxConcurrent: videoRateLimit.maxConcurrent,
            minDelayBetweenRequests: videoRateLimit.minDelayBetweenRequests,
            onProgress: (completed, total) => {
              console.log(`[useAutoGenerate] Videos: ${completed}/${total} completed`);
            },
          });
        } catch (error: any) {
          // Batch processing failed - some videos didn't generate
          const errors = error.errors || [];
          const results = error.results || [];
          const successCount = results.filter((r: any) => r !== undefined).length;

          console.error(`[useAutoGenerate] Video generation partially failed: ${successCount}/${project.storyboard.length} succeeded`);
          addChatMessage({
            role: 'agent',
            content: `⚠️ Video generation completed with errors: ${successCount}/${project.storyboard.length} scenes succeeded`,
            type: 'error',
          });

          // Stop the workflow - we can't proceed with incomplete videos
          throw new Error(`Video generation failed: Only ${successCount}/${project.storyboard.length} videos generated successfully`);
        }

        const successfulVideos = videoResults.filter((r: any) => r !== undefined).length;
        addChatMessage({
          role: 'agent',
          content: `✓ All ${successfulVideos} videos generated`,
          type: 'status',
        });

        // PHASE 3: Extract frames sequentially (fast operation)
        for (let sceneIndex = 0; sceneIndex < project.storyboard.length - 1; sceneIndex++) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Auto-generation cancelled');
          }
          await extractFramesForScene(sceneIndex);
        }

        console.log(`[useAutoGenerate] ✓ All ${project.storyboard.length} scenes completed`);

        console.log('[useAutoGenerate] Auto-generation completed successfully');
        addChatMessage({
          role: 'agent',
          content: '✨ Auto-generation complete! All scenes have been generated.',
          type: 'status',
        });

        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        console.error('[useAutoGenerate] Auto-generation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addChatMessage({
          role: 'agent',
          content: `❌ Auto-generation failed: ${errorMessage}`,
          type: 'error',
        });

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    };

    runAutoGeneration();
  }, [enabled, project, isRunning]);

  // Generate image for a specific scene
  const generateImageForScene = async (sceneIndex: number) => {
    const scene = project!.storyboard[sceneIndex];
    const uploadedImages = project!.uploadedImages || [];

    console.log(`[useAutoGenerate] Generating image for scene ${sceneIndex}`);
    setSceneStatus(sceneIndex, 'generating_image');

    // Get seed frame from previous scene if available
    let seedFrameUrl: string | undefined;
    if (sceneIndex > 0 && scenes[sceneIndex - 1]?.seedFrames && scenes[sceneIndex - 1].seedFrames!.length > 0) {
      const prevScene = scenes[sceneIndex - 1];
      const selectedFrameIndex = prevScene.selectedSeedFrameIndex ?? 0;
      seedFrameUrl = prevScene.seedFrames![selectedFrameIndex]?.url;
    }

    // Use scene-specific reference images if available (AI-selected based on interior/exterior)
    // Otherwise fall back to all uploaded images
    let referenceImageUrls: string[] = [];
    if (scene.referenceImageUrls && Array.isArray(scene.referenceImageUrls) && scene.referenceImageUrls.length > 0) {
      referenceImageUrls = scene.referenceImageUrls as string[];
      console.log(`[useAutoGenerate] Scene ${sceneIndex}: Using ${referenceImageUrls.length} AI-selected scene-specific reference images`);
    } else {
      referenceImageUrls = uploadedImages.map(img => img.url);
      console.log(`[useAutoGenerate] Scene ${sceneIndex}: Using ${referenceImageUrls.length} brand assets as reference images (fallback - no scene-specific selection)`);
    }

    if (referenceImageUrls.length > 0) {
      console.log(`[useAutoGenerate] Scene ${sceneIndex}: Reference URLs:`, referenceImageUrls);
    }

    const imageRequest: ImageGenerationRequest = {
      projectId: project!.id,
      sceneIndex,
      prompt: scene.imagePrompt,
      negativePrompt: scene.negativePrompt,
      referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
      seedFrame: seedFrameUrl,
    };

    const imageResponse = await generateImage(imageRequest);

    if (!imageResponse.predictionId) {
      throw new Error(`Image generation failed to start for scene ${sceneIndex + 1}`);
    }

    // Poll for completion
    const imageStatus = await pollImageStatus(imageResponse.predictionId, {
      projectId: project!.id,
      sceneIndex,
    });

    if (!imageStatus || imageStatus.status !== 'succeeded' || !imageStatus.image) {
      throw new Error(`Image generation failed for scene ${sceneIndex + 1}`);
    }

    // Add to store
    addGeneratedImage(sceneIndex, imageStatus.image);
    selectImage(sceneIndex, imageStatus.image.id);
    setSceneStatus(sceneIndex, 'image_ready');

    console.log(`[useAutoGenerate] Image generated for scene ${sceneIndex}`);

    // Return the generated image for immediate use
    return imageStatus.image;
  };

  // Generate video for a specific scene
  const generateVideoForScene = async (sceneIndex: number, imageToUse?: any) => {
    const scene = project!.storyboard[sceneIndex];

    // Use the provided image or fall back to checking scene state
    let selectedImage = imageToUse;
    if (!selectedImage) {
      const sceneState = scenes[sceneIndex];
      if (!sceneState?.selectedImageId) {
        throw new Error(`No selected image for scene ${sceneIndex + 1}`);
      }
      selectedImage = sceneState.generatedImages?.find(
        img => img.id === sceneState.selectedImageId
      );
      if (!selectedImage) {
        throw new Error(`Selected image not found for scene ${sceneIndex + 1}`);
      }
    }

    console.log(`[useAutoGenerate] Generating video for scene ${sceneIndex}`);
    setSceneStatus(sceneIndex, 'generating_video');

    const videoResponse = await generateVideo(
      selectedImage.url,
      scene.videoPrompt || scene.imagePrompt,
      project!.id,
      sceneIndex,
      undefined, // seedFrame
      scene.customDuration || scene.suggestedDuration
    );

    // Poll for completion
    const completedVideo = await pollVideoStatus(videoResponse.predictionId, {
      projectId: project!.id,
      sceneIndex,
    });

    if (!completedVideo || completedVideo.status !== 'succeeded' || !completedVideo.videoPath) {
      throw new Error(`Video generation failed for scene ${sceneIndex + 1}`);
    }

    // Update store with video path
    setVideoPath(sceneIndex, completedVideo.videoPath, completedVideo.actualDuration || scene.suggestedDuration);
    setSceneStatus(sceneIndex, 'video_ready');

    console.log(`[useAutoGenerate] Video generated for scene ${sceneIndex}`);
  };

  // Extract frames for seed frame selection
  const extractFramesForScene = async (sceneIndex: number) => {
    const sceneState = scenes[sceneIndex];

    if (!sceneState?.videoLocalPath) {
      console.warn(`[useAutoGenerate] No video path for scene ${sceneIndex}, skipping frame extraction`);
      return;
    }

    console.log(`[useAutoGenerate] Extracting frames for scene ${sceneIndex}`);

    const framesResponse = await extractFrames(
      sceneState.videoLocalPath,
      project!.id,
      sceneIndex
    );

    if (framesResponse.frames && framesResponse.frames.length > 0) {
      setSeedFrames(sceneIndex, framesResponse.frames);
      // Auto-select the middle frame
      const middleIndex = Math.floor(framesResponse.frames.length / 2);
      selectSeedFrame(sceneIndex, middleIndex);
      console.log(`[useAutoGenerate] Extracted ${framesResponse.frames.length} frames for scene ${sceneIndex}`);
    }
  };

  return {
    isRunning,
  };
}
