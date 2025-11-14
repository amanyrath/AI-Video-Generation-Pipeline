# Frontend Architecture

## Structure
```
/app
  /api
    /storyboard
    /generate-image
    /generate-video
    /extract-frames
    /stitch-videos
  /page.tsx (main generation UI)
/components
  ProjectCreation.tsx
  StoryboardView.tsx
  SceneEditor.tsx
  SeedFrameSelector.tsx
  VideoPreview.tsx
  ProgressIndicator.tsx
/lib
  /state
    project-store.ts (Zustand)
  /ai
    storyboard-generator.ts
    image-generator.ts
  /video
    generator.ts
    frame-extractor.ts
    stitcher.ts
  /storage
    s3-uploader.ts
  api-client.ts
  types.ts
```

## Components
[To be populated as components are created]

### Planned Components
- **ProjectCreation**: Initial prompt input and duration selection
- **StoryboardView**: Display 5-scene storyboard
- **SceneEditor**: Image generation and approval interface
- **SeedFrameSelector**: Frame selection for next scene
- **VideoPreview**: Final video player and download
- **ProgressIndicator**: Generation status display

## State Management
- **Zustand Store**: `project-store.ts`
  - Project state (id, prompt, status)
  - Storyboard (5 scenes)
  - Current scene index
  - Generated images and videos
  - Seed frames
  - Final video URL

## API Integration
- API routes in `/app/api/`
- Client wrapper functions in `/lib/api-client.ts`
- Polling for async operations (Replicate predictions)

## Current State
- Frontend structure not yet implemented
- Awaiting project initialization

## UI/UX Requirements
- Single text input for prompt (large textarea)
- Duration selector (15s / 30s / 60s)
- Clear progress indicators
- Loading states for all async operations
- Error messages with retry options

