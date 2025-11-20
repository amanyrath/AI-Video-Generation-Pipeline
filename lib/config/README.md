# AI Model Configuration

This directory contains centralized configuration for all AI models used in the video generation pipeline.

## Configuration File

`ai-models.ts` - Central configuration for image and video generation models

## Environment Variables

### Image Generation

```bash
# Image model (default: black-forest-labs/flux-1.1-pro)
# Scene 0 automatically uses runwayml/gen4-image for maximum consistency
REPLICATE_IMAGE_MODEL=black-forest-labs/flux-1.1-pro

# Image-to-Image (I2I) models for reference-based generation
# Options: runwayml/gen4-image (Scene 0), runwayml/gen4-image-turbo, 
#          black-forest-labs/flux-dev (default for Scenes 1-4)
```

### Video Generation

```bash
# Video model - supports aliases or full identifiers
REPLICATE_VIDEO_MODEL=wan2.5

# Supported aliases:
# - wan2.5, wan-2.5 → wan-video/wan-2.5-i2v-fast
# - wan2.2, wan-2.2 → wan-video/wan-2.2-i2v-fast
# - wan2.1, wan-2.1 → wan-video/wan-2.1-i2v-fast
# - gen4, gen4-aleph, runway-gen4 → runwayml/gen4-aleph (best for Scene 0→1)
# - gen4-turbo, runway-gen4-turbo → runwayml/gen4-turbo
# - luma, ray → luma/ray

# Video settings
VIDEO_DURATION=5        # 5 or 10 seconds (WAN models)
VIDEO_RESOLUTION=720p   # 720p, 1080p, or 4K
```

## Current Configuration

### Image Generation
- **Model**: FLUX 1.1 Pro (default), Runway Gen-4 Image (Scene 0)
- **Provider**: Black Forest Labs / Runway
- **Type**: Text-to-image, Image-to-image with reference images
- **Aspect Ratio**: 16:9
- **Output Format**: PNG
- **Quality**: 90
- **Scene 0**: Automatically uses Runway Gen-4 Image for maximum consistency with reference image

### Video Generation
- **Model**: WAN 2.5 (i2v-fast) - default
- **Provider**: Replicate
- **Type**: Image-to-video
- **Duration**: 5 seconds (configurable: 5 or 10)
- **Resolution**: 720p (configurable: 720p, 1080p, 4K)

## Usage

Import the configuration in your code:

```typescript
import { IMAGE_CONFIG, VIDEO_CONFIG, MODEL_INFO } from '@/lib/config/ai-models';

// Access configuration
console.log('Using video model:', VIDEO_CONFIG.model);
console.log('Video duration:', VIDEO_CONFIG.duration);
console.log('Video resolution:', VIDEO_CONFIG.resolution);
```

## Changing Models

To change models, update your `.env.local` file:

```bash
# Use WAN 2.2 instead of 2.5
REPLICATE_VIDEO_MODEL=wan2.2

# Use 1080p resolution
VIDEO_RESOLUTION=1080p

# Use 10 second duration
VIDEO_DURATION=10
```

No code changes required - the configuration is automatically loaded from environment variables.

