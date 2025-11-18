'use client';

import { useProjectStore } from '@/lib/state/project-store';
import VideoPlayer from './VideoPlayer';
import TimelineClip from './TimelineClip';
import { Clock, Play, Download, Loader2, AlertCircle, RefreshCw, Film, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { stitchVideos, applyClipEdits, generatePreview } from '@/lib/api-client';

export default function TimelineView() {
  const {
    project,
    scenes,
    timelineClips,
    initializeTimelineClips,
    splitClip,
    deleteClip,
    cropClip,
    setFinalVideo,
    addChatMessage,
  } = useProjectStore();

  const [isStitching, setIsStitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, >1 = zoomed in, <1 = zoomed out
  const [currentTimelineTime, setCurrentTimelineTime] = useState(0); // Overall timeline playback time
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [actualVideoDuration, setActualVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize timeline clips when scenes change
  useEffect(() => {
    if (project && scenes.length > 0 && !isInitialized) {
      const hasVideos = scenes.some(s => {
        if (s.selectedVideoId && s.generatedVideos) {
          return s.generatedVideos.some(v => v.id === s.selectedVideoId);
        }
        return !!s.videoLocalPath;
      });

      if (hasVideos) {
        initializeTimelineClips();
        setIsInitialized(true);
      }
    }
  }, [project, scenes, isInitialized, initializeTimelineClips]);

  // Generate preview video when clips are ready or edited
  useEffect(() => {
    if (!project || timelineClips.length === 0) return;

    let cancelled = false;

    const generatePreviewVideo = async () => {
      setIsGeneratingPreview(true);
      setError(null);
      setActualVideoDuration(null); // Reset duration for new preview

      try {
        addChatMessage({
          role: 'agent',
          content: 'Generating preview video...',
          type: 'status',
        });

        const previewPath = await generatePreview(
          timelineClips.map(clip => ({
            id: clip.id,
            videoLocalPath: clip.videoLocalPath,
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd,
            sourceDuration: clip.sourceDuration,
          })),
          project.id
        );

        if (cancelled) return;

        const previewUrl = previewPath.startsWith('http://') || previewPath.startsWith('https://')
          ? previewPath
          : `/api/serve-video?path=${encodeURIComponent(previewPath)}`;

        setPreviewVideoUrl(previewUrl);

        addChatMessage({
          role: 'agent',
          content: 'Preview video ready',
          type: 'status',
        });
      } catch (err) {
        if (cancelled) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
        setError(errorMessage);
        console.error('[TimelineView] Preview generation error:', err);
      } finally {
        if (!cancelled) {
          setIsGeneratingPreview(false);
        }
      }
    };

    // Debounce preview generation to avoid too many requests
    const timeoutId = setTimeout(() => {
      generatePreviewVideo();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [project?.id, timelineClips, addChatMessage]);

  if (!project || !project.storyboard || project.storyboard.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        <p className="text-sm">No storyboard available. Generate a storyboard first.</p>
      </div>
    );
  }

  // Calculate total duration from clips or fallback to storyboard
  const totalDuration = timelineClips.length > 0
    ? timelineClips.reduce((sum, clip) => sum + clip.duration, 0)
    : project.storyboard.reduce((sum, scene) => sum + scene.suggestedDuration, 0);
  
  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10)); // Max 10x zoom
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.25)); // Min 0.25x zoom (4x zoom out)
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  // Check if all scenes have videos
  const allScenesHaveVideos = scenes.every(s => {
    if (s.selectedVideoId && s.generatedVideos) {
      return s.generatedVideos.some(v => v.id === s.selectedVideoId);
    }
    return !!s.videoLocalPath;
  });

  // Smooth playhead updates - use timeupdate as source of truth, interpolate smoothly
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (!videoRef.current || !previewVideoUrl) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const video = videoRef.current;

    // Use timeupdate event as the authoritative source of truth
    // This fires when the video actually updates (not just when we poll)
    const handleTimeUpdate = () => {
      if (video && !video.paused) {
        const videoTime = Math.max(0, video.currentTime || 0);
        lastVideoTimeRef.current = videoTime;
        lastUpdateTimeRef.current = performance.now();
        setCurrentTimelineTime(videoTime);
      }
    };

    // Smooth interpolation between timeupdate events
    const updatePlayhead = () => {
      if (!video || video.paused || !isPlaying) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      const now = performance.now();
      const timeSinceLastUpdate = (now - lastUpdateTimeRef.current) / 1000; // Convert to seconds
      
      // Get actual video time as the absolute maximum
      const actualVideoTime = Math.max(0, video.currentTime || 0);
      
      // Only interpolate if we have a recent timeupdate (within 0.05 seconds)
      // Use a shorter window to prevent getting ahead
      if (timeSinceLastUpdate < 0.05 && lastVideoTimeRef.current <= actualVideoTime) {
        // Interpolate smoothly based on playback rate
        const playbackRate = video.playbackRate || 1;
        const interpolatedTime = lastVideoTimeRef.current + (timeSinceLastUpdate * playbackRate);
        
        // CRITICAL: Never let interpolation exceed actual video time
        // Use actualVideoTime as the hard limit
        const clampedTime = Math.min(interpolatedTime, actualVideoTime);
        
        setCurrentTimelineTime(clampedTime);
      } else {
        // Always use actual video time - never interpolate ahead
        setCurrentTimelineTime(actualVideoTime);
        lastVideoTimeRef.current = actualVideoTime;
        lastUpdateTimeRef.current = now;
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    const handlePlay = () => {
      // Reset timing references
      if (video) {
        lastVideoTimeRef.current = Math.max(0, video.currentTime || 0);
        lastUpdateTimeRef.current = performance.now();
      }
      // Start animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    const handlePause = () => {
      // Stop animation loop when paused
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Update one final time with current video time
      if (video) {
        const videoTime = Math.max(0, video.currentTime || 0);
        setCurrentTimelineTime(videoTime);
        lastVideoTimeRef.current = videoTime;
        lastUpdateTimeRef.current = performance.now();
      }
    };

    const handleEnded = () => {
      // Video ended, stop playback and animation loop
      setIsPlaying(false);
      // Use actual video duration for accurate end position
      const endTime = video?.duration || totalDuration;
      setCurrentTimelineTime(endTime);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const handleSeeking = () => {
      // When user seeks, immediately update timeline time
      if (video) {
        const videoTime = Math.max(0, video.currentTime || 0);
        setCurrentTimelineTime(videoTime);
        lastVideoTimeRef.current = videoTime;
        lastUpdateTimeRef.current = performance.now();
      }
    };

    // Start animation loop if already playing
    if (isPlaying && !video.paused) {
      lastVideoTimeRef.current = Math.max(0, video.currentTime || 0);
      lastUpdateTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    }

    // Use timeupdate as the authoritative source
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('seeking', handleSeeking);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('seeking', handleSeeking);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [previewVideoUrl, isPlaying, totalDuration]);

  // Calculate playhead position on timeline (smooth, no jumps)
  // Use actual video duration for accurate sync, fallback to totalDuration
  const playheadPosition = useMemo(() => {
    const effectiveDuration = actualVideoDuration || totalDuration;
    if (effectiveDuration === 0) return 0;
    // Clamp to valid range
    const clampedTime = Math.max(0, Math.min(currentTimelineTime, effectiveDuration));
    return (clampedTime / effectiveDuration) * 100;
  }, [currentTimelineTime, totalDuration, actualVideoDuration]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!videoRef.current || !previewVideoUrl) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start from beginning if at end - use actual video duration
      const effectiveDuration = actualVideoDuration || totalDuration;
      if (currentTimelineTime >= effectiveDuration - 0.1) {
        setCurrentTimelineTime(0);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Get video paths for stitching
  const getVideoPathsForStitching = () => {
    if (timelineClips.length > 0) {
      return timelineClips.map(clip => clip.videoLocalPath);
    }
    return scenes
      .map(s => {
        if (s.selectedVideoId && s.generatedVideos) {
          const selectedVideo = s.generatedVideos.find(v => v.id === s.selectedVideoId);
          return selectedVideo?.localPath;
        }
        return s.videoLocalPath;
      })
      .filter((path): path is string => !!path);
  };

  const handleSplit = (clipId: string, time: number) => {
    splitClip(clipId, time);
    // Preview will be regenerated automatically via useEffect
    addChatMessage({
      role: 'agent',
      content: 'Clip split successfully. Regenerating preview...',
      type: 'status',
    });
  };

  const handleDelete = (clipId: string) => {
    deleteClip(clipId);
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
    // Preview will be regenerated automatically via useEffect
    addChatMessage({
      role: 'agent',
      content: 'Clip deleted. Regenerating preview...',
      type: 'status',
    });
  };

  const handleCrop = (clipId: string, trimStart: number, trimEnd: number) => {
    cropClip(clipId, trimStart, trimEnd);
    // Preview will be regenerated automatically via useEffect
    addChatMessage({
      role: 'agent',
      content: 'Clip cropped successfully. Regenerating preview...',
      type: 'status',
    });
  };

  const handleStitchVideos = async () => {
    const videoPaths = getVideoPathsForStitching();
    
    if (!project || videoPaths.length === 0) {
      setError('No videos available to stitch');
      return;
    }

    setIsStitching(true);
    setError(null);

    try {
      addChatMessage({
        role: 'agent',
        content: `Stitching ${videoPaths.length} video${videoPaths.length > 1 ? 's' : ''} together...`,
        type: 'status',
      });

      // If clips have been edited, apply edits first
      let pathsToStitch = videoPaths;
      if (timelineClips.length > 0 && timelineClips.some(c => c.trimStart || c.trimEnd)) {
        addChatMessage({
          role: 'agent',
          content: 'Applying clip edits...',
          type: 'status',
        });
        pathsToStitch = await applyClipEdits(timelineClips, project.id);
      }

      const response = await stitchVideos(pathsToStitch, project.id);

      if (response.finalVideoPath) {
        const finalVideoUrl = response.finalVideoPath.startsWith('http')
          ? response.finalVideoPath
          : `/api/serve-video?path=${encodeURIComponent(response.finalVideoPath)}`;

        setFinalVideo(finalVideoUrl, response.s3Url);

        addChatMessage({
          role: 'agent',
          content: `✓ Final video stitched successfully! Ready for download.`,
          type: 'status',
        });
      } else {
        throw new Error('Failed to stitch videos');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stitch videos';
      setError(errorMessage);
      addChatMessage({
        role: 'agent',
        content: `❌ Error: ${errorMessage}`,
        type: 'error',
      });
    } finally {
      setIsStitching(false);
    }
  };

  const handleDownload = () => {
    if (!project.finalVideoUrl) return;

    const link = document.createElement('a');
    link.href = project.finalVideoUrl;
    link.download = `video-${project.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefreshClips = () => {
    setIsInitialized(false);
    initializeTimelineClips();
    setIsInitialized(true);
  };

  const handleClipSelect = (clipId: string) => {
    setSelectedClipId(clipId);
  };

  const selectedClip = selectedClipId ? timelineClips.find(c => c.id === selectedClipId) : null;

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header - Compact */}
      <div className="px-6 py-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-white/50">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{totalDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Film className="w-4 h-4" />
              <span>{timelineClips.length || project.storyboard.length} clip{timelineClips.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {timelineClips.length > 0 && (
            <button
              onClick={handleRefreshClips}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/5 text-white/80 rounded-lg hover:bg-white/10 hover:text-white transition-all border border-white/10"
              title="Refresh timeline from scenes"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Video Preview Player */}
        {getVideoPathsForStitching().length > 0 && (
          <div className="px-6 py-4 border-b border-white/10 bg-black/50">
            {isGeneratingPreview ? (
              <div className="h-96 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-white/60">Generating preview video...</p>
                </div>
              </div>
            ) : previewVideoUrl ? (
              <div className="rounded-lg overflow-hidden border border-white/10 bg-black relative group">
                <video
                  key={previewVideoUrl}
                  ref={videoRef}
                  src={previewVideoUrl}
                  className="w-full h-96"
                  onLoadedMetadata={() => {
                    // Reset to start when video loads and capture actual duration
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      setCurrentTimelineTime(0);
                      // Store the actual video duration for accurate playhead sync
                      const videoDuration = videoRef.current.duration;
                      if (videoDuration && isFinite(videoDuration)) {
                        setActualVideoDuration(videoDuration);
                        console.log(`[Timeline] Video duration: ${videoDuration.toFixed(2)}s (timeline: ${totalDuration.toFixed(2)}s)`);
                      }
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                  }}
                  onSeeking={() => {
                    // Immediately sync timeline when user seeks
                    if (videoRef.current) {
                      setCurrentTimelineTime(Math.max(0, videoRef.current.currentTime || 0));
                    }
                  }}
                  onClick={handlePlayPause}
                  preload="auto"
                />
                {/* Custom Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                  {!isPlaying && (
                    <button
                      onClick={handlePlayPause}
                      className="p-4 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                    >
                      <Play className="w-8 h-8 text-white" />
                    </button>
                  )}
                </div>
                {/* Timeline Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${playheadPosition}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/40">Generating preview...</p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Track Section */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white/80">Timeline Track</h3>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-white/80" />
                </button>
                <span className="text-xs text-white/50 font-mono min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-white/80" />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    onClick={handleZoomReset}
                    className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors text-white/60 hover:text-white"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            {/* Timeline Container */}
            <div className="relative bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              {/* Scrollable Timeline Wrapper */}
              <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div 
                  className="relative"
                  style={{ 
                    width: `${Math.max(100, zoomLevel * 100)}%`,
                    minWidth: '100%'
                  }}
                >
                  {/* Time markers - Top */}
                  <div className="absolute top-0 left-0 right-0 h-8 border-b border-white/10 bg-black/30 backdrop-blur-sm z-10">
                    <div className="relative h-full">
                      {Array.from({ length: Math.ceil(totalDuration * zoomLevel) + 1 }).map((_, i) => {
                        const time = i / zoomLevel;
                        if (time > totalDuration) return null;
                        return (
                          <div
                            key={i}
                            className="absolute h-full border-l border-white/10"
                            style={{ left: `${(time / totalDuration) * 100}%` }}
                          >
                            <span className="absolute left-1 top-1 text-[10px] text-white/40 font-mono">
                              {time.toFixed(1)}s
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline Track */}
                  <div className="relative h-28 bg-gradient-to-b from-white/5 to-white/[0.02] pt-8">
                    {timelineClips.length > 0 ? (
                      timelineClips.map((clip) => (
                        <TimelineClip
                          key={clip.id}
                          clip={clip}
                          totalDuration={totalDuration}
                          zoomLevel={zoomLevel}
                          onSplit={handleSplit}
                          onDelete={handleDelete}
                          onCrop={handleCrop}
                          onSelect={() => handleClipSelect(clip.id)}
                          isSelected={selectedClipId === clip.id}
                        />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/30 text-sm">
                        {allScenesHaveVideos
                          ? 'Click "Refresh" to load clips into timeline'
                          : 'Generate videos for scenes to see them in the timeline'}
                      </div>
                    )}
                    
                    {/* Playhead Indicator - Direct positioning for frame-perfect updates */}
                    {totalDuration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                        style={{
                          left: `${playheadPosition}%`,
                          boxShadow: '0 0 4px rgba(239, 68, 68, 0.8)',
                          willChange: 'left', // Optimize for frequent updates
                        }}
                      >
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Clip Info */}
          {selectedClip && (
            <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-sm font-semibold text-white mb-3">{selectedClip.title}</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-white/40 mb-1">Duration</span>
                  <span className="text-white/80 font-mono">{selectedClip.duration.toFixed(1)}s</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/40 mb-1">Timeline Position</span>
                  <span className="text-white/80 font-mono">{selectedClip.startTime.toFixed(1)}s - {selectedClip.endTime.toFixed(1)}s</span>
                </div>
                {selectedClip.trimStart !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-white/40 mb-1">Trim Start</span>
                    <span className="text-white/80 font-mono">{selectedClip.trimStart.toFixed(1)}s</span>
                  </div>
                )}
                {selectedClip.trimEnd !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-white/40 mb-1">Trim End</span>
                    <span className="text-white/80 font-mono">{selectedClip.trimEnd.toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Stitch Videos Button */}
            {getVideoPathsForStitching().length > 0 && !project.finalVideoUrl && (
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">
                      {allScenesHaveVideos ? 'All Clips Ready' : 'Stitch Available Clips'}
                    </h4>
                    <p className="text-xs text-white/50">
                      {getVideoPathsForStitching().length} clip{getVideoPathsForStitching().length !== 1 ? 's' : ''} ready to stitch
                    </p>
                  </div>
                  <button
                    onClick={handleStitchVideos}
                    disabled={isStitching}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isStitching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Stitching...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Stitch Final Video
                      </>
                    )}
                  </button>
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Final Stitched Video Preview */}
            {project.finalVideoUrl && (
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">Final Video</h4>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/10"
                  >
                    <Download className="w-4 h-4" />
                    Download MP4
                  </button>
                </div>
                <VideoPlayer
                  src={project.finalVideoUrl}
                  className="w-full"
                  showDownload={false}
                />
              </div>
            )}

            {/* Empty State */}
            {!allScenesHaveVideos && !project.finalVideoUrl && timelineClips.length === 0 && (
              <div className="flex items-center justify-center h-32 bg-white/5 rounded-lg border-2 border-dashed border-white/10">
                <div className="text-center text-white/40">
                  <Play className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    {getVideoPathsForStitching().length} of {project.storyboard.length} scenes have videos
                  </p>
                  <p className="text-xs mt-1">Complete all scenes to see them in the timeline</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
