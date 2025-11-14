# Project Brief: AI Video Generation Pipeline

## Overview
End-to-end AI video generation pipeline that converts user prompts into professional-quality video advertisements with minimal human intervention.

## Core Concept
Users input a prompt → AI generates 5-scene storyboard → User refines each scene's image → Videos generated sequentially using last frame as seed for next clip → Final video stitched and exported.

## Timeline
- **Total**: 7 days
- **MVP**: 48 hours (hard gate)

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **State Management**: Zustand
- **Storage**: Local filesystem (temp) + AWS S3 (finals)
- **Video Processing**: FFmpeg (server-side)
- **Deployment**: Vercel

## API Services
- **Image Generation**: Replicate (black-forest-labs/flux-schnell)
- **Video Generation**: Replicate (luma/ray - Dream Machine)
- **Storyboard Generation**: OpenRouter (GPT-4o)

## Key Features
1. User prompt input interface
2. AI-generated 5-scene storyboard
3. Image generation with user approval
4. Sequential video generation with seed frames
5. Video stitching and export

## Current Status
- ✅ Repository initialized
- ✅ .gitignore configured (excludes sensitive files and markdown except README)
- ✅ Memory bank system set up
- ⏳ Project setup in progress

## Success Criteria
- Generate complete 15-20 second video from single prompt
- Each scene 2-4 seconds long (total 5 scenes)
- Visual coherence across all clips
- No crashes or generation failures
- Clear progress indicators throughout

