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
- `black-forest-labs/flux-1.1-pro` - Highest quality (recommended)
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
- `wan-video/wan-2.5-i2v-fast` - Latest WAN model (recommended)
- `wan-video/wan-2.2-i2v-fast` - Stable, good quality
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

## Notes

- The `_comments` field in `models.json` is for documentation only and is ignored by the application
- Changes require a dev server restart to take effect
- These are not secrets - safe to commit to version control
- For API keys and secrets, use `.env.local` instead

