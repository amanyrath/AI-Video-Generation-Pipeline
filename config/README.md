# Configuration Files

This directory contains configuration files for the AI Video Generation Pipeline.

## Files

### `models.json`

Configuration for AI models used in image and video generation.

**To change models or settings:**
1. Edit `models.json`
2. Restart your dev server
3. That's it!

## Image Generation Settings

```json
{
  "image": {
    "model": "black-forest-labs/flux-1.1-pro",
    "aspectRatio": "16:9",
    "outputFormat": "png",
    "outputQuality": 90,
    "resolution": "720p"
  }
}
```

**Available Models:**
- `runwayml/gen4-image` - Maximum consistency with reference images, best for Scene 0 (automatically used)
- `runwayml/gen4-image-turbo` - Fast Gen-4 image generation with good consistency
- `black-forest-labs/flux-1.1-pro` - Highest quality (recommended for Scenes 1-4)
- `black-forest-labs/flux-dev` - Good quality, faster
- `black-forest-labs/flux-schnell` - Fastest, lower quality

## Video Generation Settings

```json
{
  "video": {
    "model": "wan-video/wan-2.5-i2v-fast:5be8b80...",
    "duration": 5,
    "resolution": "720p"
  }
}
```

**Available Models:**
- `wan-video/wan-2.5-i2v-fast` - Latest WAN model (recommended for Scenes 1-4)
- `wan-video/wan-2.2-i2v-fast` - Stable, good quality
- `runwayml/gen4-aleph` - Maximum consistency, best for Scene 0→1 transitions
- `runwayml/gen4-turbo` - Fast Gen-4 generation with good consistency
- `luma/ray` - Alternative style

**Duration:** 5 or 10 seconds (WAN models)

**Resolution:** 720p, 1080p, or 4K

## Examples

### Use WAN 2.2 instead of 2.5

```json
{
  "video": {
    "model": "wan-video/wan-2.2-i2v-fast"
  }
}
```

### Use 1080p resolution

```json
{
  "video": {
    "resolution": "1080p"
  }
}
```

### Use 10 second videos

```json
{
  "video": {
    "duration": 10
  }
}
```

### Use Runway Gen-4 for Scene 0

```json
{
  "video": {
    "model": "runwayml/gen4-aleph"
  }
}
```

**Note:** The system automatically uses:
- **Gen-4 Image** for Scene 0 image generation (maximum consistency with reference image)
- **Gen-4 Aleph** for Scene 0→1 video transitions (maximum consistency)

You can override these via the DevPanel or environment variables.

## Notes

- The `_comments` field in `models.json` is for documentation only and is ignored by the application
- Changes require a dev server restart to take effect
- These are not secrets - safe to commit to version control
- For API keys and secrets, use `.env.local` instead

