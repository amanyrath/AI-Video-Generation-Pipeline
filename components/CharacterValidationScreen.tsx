'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/state/project-store';
import ImageDropZone from './ImageDropZone';
import { X, RefreshCw, Check, Loader2 } from 'lucide-react';

interface CharacterImage {
  id: string;
  url: string;
  selected: boolean;
}

interface FeedbackState {
  styleValue: number; // 0 = Cartoon, 100 = Realistic
  detailedValue: number; // 0 = Simplified, 100 = Detailed
  colorfulValue: number; // 0 = Muted, 100 = Colorful
  qualityValue: number; // 0 = Sketch, 100 = High Detail
  textFeedback: string;
}

export default function CharacterValidationScreen() {
  const router = useRouter();
  const { 
    project, 
    setCharacterReferences, 
    addCharacterReference,
  } = useProjectStore();

  const [characterImages, setCharacterImages] = useState<CharacterImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>({
    styleValue: 50,
    detailedValue: 50,
    colorfulValue: 50,
    qualityValue: 75,
    textFeedback: '',
  });

  // Generate initial character variations on mount
  useEffect(() => {
    if (!project?.characterDescription) {
      // No character description, skip to workspace
      router.push('/workspace');
      return;
    }

    generateCharacterVariations();
  }, []);

  const generateCharacterVariations = async () => {
    if (!project?.characterDescription) return;

    setIsGenerating(true);

    try {
      // Build style-aware prompt based on feedback
      const stylePrompt = buildStylePrompt(project.characterDescription, feedback);

      // Call API to generate 5 variations
      const response = await fetch('/api/generate-character-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: stylePrompt,
          projectId: project.id,
          count: 5,
        }),
      });

      const data = await response.json();

      if (data.success && data.images) {
        setCharacterImages(
          data.images.map((img: { id: string; url: string }) => ({
            id: img.id,
            url: img.url,
            selected: false,
          }))
        );
      } else {
        console.error('Failed to generate character variations:', data.error);
      }
    } catch (error) {
      console.error('Error generating character variations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildStylePrompt = (description: string, feedback: FeedbackState): string => {
    const parts: string[] = [description];

    // Style (Cartoon vs Realistic)
    if (feedback.styleValue < 40) {
      parts.push('cartoon style, animated, stylized');
    } else if (feedback.styleValue > 60) {
      parts.push('photorealistic, hyper-realistic, detailed photography');
    }

    // Detail level
    if (feedback.detailedValue < 40) {
      parts.push('simplified, clean, minimal details');
    } else if (feedback.detailedValue > 60) {
      parts.push('highly detailed, intricate, complex');
    }

    // Color
    if (feedback.colorfulValue < 40) {
      parts.push('muted colors, desaturated, subtle tones');
    } else if (feedback.colorfulValue > 60) {
      parts.push('vibrant colors, saturated, bold palette');
    }

    // Quality
    if (feedback.qualityValue < 40) {
      parts.push('sketch-like, loose, artistic');
    } else if (feedback.qualityValue > 60) {
      parts.push('high quality, crisp, professional');
    }

    // Text feedback
    if (feedback.textFeedback.trim()) {
      parts.push(feedback.textFeedback.trim());
    }

    // Background removal instruction
    parts.push('isolated subject, clean background, white or transparent background');

    return parts.join(', ');
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImageId(imageId);
    setCharacterImages((prev) =>
      prev.map((img) => ({
        ...img,
        selected: img.id === imageId,
      }))
    );
  };

  const handleRegenerate = () => {
    generateCharacterVariations();
  };

  const handleUploadedImages = (files: File[]) => {
    // Limit to 3 total images
    const availableSlots = 3 - characterImages.filter((img) => img.selected).length;
    const newImages = files.slice(0, availableSlots);
    setUploadedImages((prev) => [...prev, ...newImages].slice(0, 3));
  };

  const handleConfirm = async () => {
    // Get selected character image
    const selectedImage = characterImages.find((img) => img.selected);

    if (!selectedImage) {
      alert('Please select a character variation first');
      return;
    }

    // Upload any additional reference images
    const additionalImageUrls: string[] = [];

    if (uploadedImages.length > 0) {
      try {
        const formData = new FormData();
        uploadedImages.forEach((file) => {
          formData.append('images', file);
        });

        const uploadResponse = await fetch('/api/upload-images', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();
        if (uploadData.success && uploadData.urls) {
          additionalImageUrls.push(...uploadData.urls);
        }
      } catch (error) {
        console.error('Error uploading additional images:', error);
      }
    }

    // Set character references in store
    const allReferences = [selectedImage.url, ...additionalImageUrls];
    setCharacterReferences(allReferences);

    // Navigate to workspace
    router.push('/workspace');
  };

  const handleSkip = () => {
    router.push('/workspace');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Validate Your Character
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select the character variation that best matches your vision, or regenerate with feedback
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          {/* Character Description */}
          {project?.characterDescription && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Character Description:
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                {project.characterDescription}
              </p>
            </div>
          )}

          {/* Character Variations Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Generated Variations
            </h2>

            {isGenerating ? (
              <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
                  >
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                ))}
              </div>
            ) : characterImages.length > 0 ? (
              <div className="grid grid-cols-5 gap-4">
                {characterImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageSelect(image.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      image.selected
                        ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-200 dark:ring-blue-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt="Character variation"
                      className="w-full h-full object-cover"
                    />
                    {image.selected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                No character variations generated yet
              </div>
            )}
          </div>

          {/* Feedback Controls */}
          <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              Adjust Style Preferences
            </h3>

            <div className="space-y-4">
              {/* Style Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Style</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {feedback.styleValue < 40 ? 'Cartoon' : feedback.styleValue > 60 ? 'Realistic' : 'Balanced'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Cartoon</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feedback.styleValue}
                    onChange={(e) =>
                      setFeedback({ ...feedback, styleValue: parseInt(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">Realistic</span>
                </div>
              </div>

              {/* Detail Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Detail Level</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {feedback.detailedValue < 40 ? 'Simplified' : feedback.detailedValue > 60 ? 'Detailed' : 'Moderate'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Simple</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feedback.detailedValue}
                    onChange={(e) =>
                      setFeedback({ ...feedback, detailedValue: parseInt(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">Detailed</span>
                </div>
              </div>

              {/* Color Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Color Saturation</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {feedback.colorfulValue < 40 ? 'Muted' : feedback.colorfulValue > 60 ? 'Vibrant' : 'Balanced'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Muted</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feedback.colorfulValue}
                    onChange={(e) =>
                      setFeedback({ ...feedback, colorfulValue: parseInt(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">Colorful</span>
                </div>
              </div>

              {/* Quality Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Quality</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {feedback.qualityValue < 40 ? 'Sketch' : feedback.qualityValue > 60 ? 'High Detail' : 'Standard'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Sketch</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={feedback.qualityValue}
                    onChange={(e) =>
                      setFeedback({ ...feedback, qualityValue: parseInt(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">High Detail</span>
                </div>
              </div>

              {/* Text Feedback */}
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                  Additional Feedback (Optional)
                </label>
                <textarea
                  value={feedback.textFeedback}
                  onChange={(e) => setFeedback({ ...feedback, textFeedback: e.target.value })}
                  placeholder="Describe any specific changes you'd like to see..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Regenerate Button */}
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Regenerate with Feedback'}
            </button>
          </div>

          {/* Upload Additional References */}
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              Add Additional Reference Images (Optional)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Upload up to 3 additional reference images to help refine the character
            </p>
            <ImageDropZone onFilesSelected={handleUploadedImages} maxFiles={3} />
            {uploadedImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadedImages.map((file, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Uploaded ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleSkip}
              className="px-6 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Skip
            </button>

            <button
              onClick={handleConfirm}
              disabled={!selectedImageId}
              className="px-6 py-2 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Use This Character
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

