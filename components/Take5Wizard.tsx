'use client';

import { useState } from 'react';
import ImageDropZone from './ImageDropZone';

interface Take5WizardProps {
  onSubmit: (combinedPrompt: string, images?: File[], targetDuration?: number) => void | Promise<void>;
  disabled?: boolean;
  initialPrompt?: string;
  initialImages?: File[];
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

type StepId = 1 | 2 | 3 | 4 | 5;

export default function Take5Wizard({ 
  onSubmit, 
  disabled = false,
  initialPrompt = '',
  initialImages = [],
  currentStep = 1,
  onStepChange
}: Take5WizardProps) {
  const [activeStep, setActiveStep] = useState<StepId>(currentStep as StepId);

  const [idea, setIdea] = useState(initialPrompt);
  const [subject, setSubject] = useState('');
  const [style, setStyle] = useState('Leigh Powis–style commercial film, tight and action-driven');
  const [audio, setAudio] = useState('');
  const [platform, setPlatform] = useState('');
  const [duration, setDuration] = useState<15 | 30 | 60>(15);
  const [keepArriAlexa, setKeepArriAlexa] = useState(true);
  const [images, setImages] = useState<File[]>(initialImages);

  const steps: { id: StepId; label: string }[] = [
    { id: 1, label: 'Idea' },
    { id: 2, label: 'Subject' },
    { id: 3, label: 'Style' },
    { id: 4, label: 'Sound' },
    { id: 5, label: 'Format' },
  ];

  const handleImagesSelected = (files: File[]) => {
    setImages(files);
  };

  const goToStep = (step: StepId) => {
    setActiveStep(step);
    if (onStepChange) {
      onStepChange(step);
    }
  };

  const goNext = () => {
    const nextStep = (activeStep < 5 ? activeStep + 1 : activeStep) as StepId;
    setActiveStep(nextStep);
    if (onStepChange) {
      onStepChange(nextStep);
    }
  };

  const goPrev = () => {
    const prevStep = (activeStep > 1 ? activeStep - 1 : activeStep) as StepId;
    setActiveStep(prevStep);
    if (onStepChange) {
      onStepChange(prevStep);
    }
  };

  const buildPrompt = () => {
    const lines: string[] = [];

    lines.push(
      idea.trim()
        ? `Original idea: ${idea.trim()}`
        : 'Original idea: The user wants a high-impact performance advertising spot. Infer a strong automotive or product concept from the answers below.'
    );

    lines.push(
      'Ad context: Performance-focused commercial for a small brand, with a strong emphasis on products and automotive advertising.'
    );

    if (subject.trim()) {
      lines.push(`Story focus (subject): ${subject.trim()}.`);
    }

    const styleLine =
      style.trim() ||
      'Leigh Powis–style commercial film, tight and action-driven, with bold, cinematic framing and punchy pacing.';
    lines.push(
      `Visual style: ${styleLine}${keepArriAlexa ? ' (assume this is shot on Arri Alexa by default).' : '.'}`
    );

    if (audio.trim()) {
      lines.push(`Sound & music: ${audio.trim()}.`);
    }

    if (platform.trim() || duration) {
      const platformText = platform.trim() || 'digital and social platforms';
      lines.push(`Format: ${duration || 15}s spot for ${platformText}.`);
    }

    lines.push(
      'Turn this into a 5-scene cinematic advertising storyboard. Each scene should be described as a single sentence using the structure: [SHOT TYPE] + [SUBJECT] + [ACTION] + [STYLE] + [CAMERA MOVEMENT] + [AUDIO CUES].'
    );

    return lines.join('\n');
  };

  const handleGenerate = async () => {
    if (disabled) return;
    const prompt = buildPrompt();
    await onSubmit(prompt, images.length ? images : undefined, duration);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                Step 1 · What&apos;s the core idea?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Write it messy. Who is this for, what are you selling, and what should viewers feel or do after
                watching?
              </p>
            </div>

            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              placeholder="E.g., A high-energy launch film for a new electric sports car that feels cinematic and aspirational, ending on a bold brand line."
              disabled={disabled}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Quick starters</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Launch film for a new electric car, focused on acceleration and sleek design.',
                  'Founder story for a small DTC brand, mixing product close-ups with human moments.',
                  'Customer testimonial-style ad that feels like a mini-documentary.',
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setIdea(example)}
                    disabled={disabled}
                    className="text-xs rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Optional · Reference images</p>
              <ImageDropZone onFilesSelected={handleImagesSelected} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                Step 2 · Who or what is the hero?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tighten the subject so the storyboard never feels generic. Think about the most important thing we need
                to see on screen.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pick one</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'The car itself (exterior + motion)',
                  'Driver and in-car experience',
                  'The product in close-up hero shots',
                  'A specific place or journey (road, city, landscape)',
                  'Brand / founder presence woven into the story',
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSubject(option)}
                    disabled={disabled}
                    className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                      subject === option
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Or write your own</p>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="E.g., A young driver discovering the car’s performance on an empty coastal road."
                disabled={disabled}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                Step 3 · Which director or style?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We&apos;ll default to a clean, cinematic look shot on Arri Alexa. Choose a direction to shape framing,
                pacing, and energy.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pick a reference</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Leigh Powis–style commercial film, tight and action-driven',
                  'Greta Gerwig–style, warm, character-led and human',
                  'Denis Villeneuve–style, epic, moody, cinematic scale',
                  'Spike Jonze–style, playful, surreal, emotionally sharp',
                  'David Fincher–style, precise, slick, high-contrast control',
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStyle(option)}
                    disabled={disabled}
                    className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                      style === option
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Or write your own director / style
              </p>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="E.g., Handheld, gritty, night-time car chase with neon reflections."
                disabled={disabled}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                Step 4 · What should this sound like?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sound is half the story. Think about music, engine presence, and how quiet or loud the world should feel.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pick a direction</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'High-energy electronic with punchy hits synced to gear changes and cuts.',
                  'Cinematic trailer build with deep impacts and risers over engine sound.',
                  'Minimal, atmospheric score with detailed road and interior sound design.',
                  'Documentary-style mix of real-world sound, subtle music, and voiceover.',
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAudio(option)}
                    disabled={disabled}
                    className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                      audio === option
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Or write your own soundscape</p>
              <input
                type="text"
                value={audio}
                onChange={(e) => setAudio(e.target.value)}
                placeholder="E.g., Low, pulsing electronic track with engine revs and wind as key rhythm."
                disabled={disabled}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                Step 5 · Where does this run?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We&apos;ll default to a 15s cinematic spot shot on Arri Alexa. Adjust if you need a different length or
                channel.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Duration</p>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDuration(sec as 15 | 30 | 60)}
                      disabled={disabled}
                      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                        duration === sec
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900'
                          : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Primary channel</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'TikTok / Reels',
                    'YouTube pre-roll',
                    'Web / landing page hero',
                    'In-showroom / in-store screen',
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPlatform(option)}
                      disabled={disabled}
                      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                        platform === option
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900'
                          : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Or write your own</p>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="E.g., 30s TV / CTV spot plus cutdowns for social."
                  disabled={disabled}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={keepArriAlexa}
                  onChange={(e) => setKeepArriAlexa(e.target.checked)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-50 focus:ring-gray-900 dark:focus:ring-gray-100"
                />
                <span>
                  Keep <span className="font-semibold">“Shot on Arri Alexa”</span> as the default camera profile in the
                  storyboard.
                </span>
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* 5 Dots Stepper - Monologue style */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`h-2 rounded-full transition-all duration-300 ${
              step === activeStep
                ? 'w-8 bg-white/60'
                : step < activeStep
                  ? 'w-2 bg-white/40'
                  : 'w-2 bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-8 space-y-6">
        {renderStepContent()}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[10px] font-semibold">
              {activeStep}
            </span>
            <span>Step {activeStep} of 5</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={goPrev}
                disabled={disabled}
                className="px-4 py-2 rounded-full border border-white/20 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                Back
              </button>
            )}

            {activeStep < 5 && (
              <button
                type="button"
                onClick={goNext}
                disabled={disabled}
                className="px-4 py-2 rounded-full border border-white/20 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                Next step
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled}
              className="px-6 py-2 rounded-full bg-white text-sm font-semibold text-black hover:bg-white/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {activeStep < 5 ? 'Skip · Generate' : 'Generate storyboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

