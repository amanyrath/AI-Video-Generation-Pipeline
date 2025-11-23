'use client';

import { useState } from 'react';
import { useProjectStore } from '@/lib/state/project-store';
import { TextOverlay } from '@/lib/types';
import { Plus, X, Copy, Eye, EyeOff } from 'lucide-react';

/**
 * Text Overlay Editor Component
 * Manages text overlays on the timeline with full property editing
 */
export function TextOverlayEditor() {
  const textOverlays = useProjectStore((state) => state.textOverlays);
  const selectedTextOverlayId = useProjectStore((state) => state.selectedTextOverlayId);
  const addTextOverlay = useProjectStore((state) => state.addTextOverlay);
  const deleteTextOverlay = useProjectStore((state) => state.deleteTextOverlay);
  const updateTextOverlay = useProjectStore((state) => state.updateTextOverlay);
  const setSelectedTextOverlayId = useProjectStore((state) => state.setSelectedTextOverlayId);
  const duplicateTextOverlay = useProjectStore((state) => state.duplicateTextOverlay);

  const [isExpanded, setIsExpanded] = useState(true);

  const selectedOverlay = textOverlays.find((o) => o.id === selectedTextOverlayId);

  const handleAddOverlay = () => {
    addTextOverlay('New Text', 0, 3);
  };

  const handleDeleteOverlay = (overlayId: string) => {
    deleteTextOverlay(overlayId);
  };

  const handleDuplicateOverlay = (overlayId: string) => {
    duplicateTextOverlay(overlayId);
  };

  const handleUpdateOverlay = (overlayId: string, updates: Partial<TextOverlay>) => {
    updateTextOverlay(overlayId, updates);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <h3 className="text-sm font-semibold text-white">Text Overlays</h3>
          <span className="text-xs text-gray-500">({textOverlays.length})</span>
        </div>
        <button
          onClick={handleAddOverlay}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Text
        </button>
      </div>

      {/* Overlay List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {textOverlays.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No text overlays yet. Click "Add Text" to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {textOverlays.map((overlay) => (
                <OverlayListItem
                  key={overlay.id}
                  overlay={overlay}
                  isSelected={overlay.id === selectedTextOverlayId}
                  onSelect={() => setSelectedTextOverlayId(overlay.id)}
                  onDelete={() => handleDeleteOverlay(overlay.id)}
                  onDuplicate={() => handleDuplicateOverlay(overlay.id)}
                  onUpdate={(updates) => handleUpdateOverlay(overlay.id, updates)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Property Panel */}
      {selectedOverlay && (
        <TextOverlayPropertyPanel
          overlay={selectedOverlay}
          onUpdate={(updates) => handleUpdateOverlay(selectedOverlay.id, updates)}
        />
      )}
    </div>
  );
}

/**
 * Individual overlay list item
 */
function OverlayListItem({
  overlay,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdate,
}: {
  overlay: TextOverlay;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<TextOverlay>) => void;
}) {
  return (
    <div
      className={`p-3 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-900/30 border-l-2 border-blue-500' : 'hover:bg-gray-800'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={overlay.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-white text-sm font-medium outline-none border-b border-transparent hover:border-gray-600 focus:border-blue-500 transition-colors"
            placeholder="Enter text..."
          />
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>
              {overlay.startTime.toFixed(1)}s - {overlay.endTime.toFixed(1)}s
            </span>
            <span>•</span>
            <span>{overlay.duration.toFixed(1)}s</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div
        className="mt-2 px-2 py-1 rounded text-center text-xs"
        style={{
          color: overlay.fontColor,
          backgroundColor: overlay.backgroundColor
            ? `${overlay.backgroundColor}${Math.round(overlay.backgroundOpacity * 255)
                .toString(16)
                .padStart(2, '0')}`
            : 'transparent',
          fontSize: '10px',
          fontWeight: overlay.fontWeight,
          textAlign: overlay.textAlign,
          borderWidth: overlay.borderWidth > 0 ? '1px' : '0',
          borderColor: overlay.borderColor || 'transparent',
          borderStyle: 'solid',
        }}
      >
        {overlay.text || 'Preview'}
      </div>
    </div>
  );
}

/**
 * Text Overlay Property Panel
 * Detailed property editing for selected overlay
 */
function TextOverlayPropertyPanel({
  overlay,
  onUpdate,
}: {
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'text' | 'position' | 'style' | 'effects'>('text');

  return (
    <div className="border-t border-gray-700 bg-gray-800/50">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'text', label: 'Text' },
          { id: 'position', label: 'Position' },
          { id: 'style', label: 'Style' },
          { id: 'effects', label: 'Effects' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {activeTab === 'text' && <TextTab overlay={overlay} onUpdate={onUpdate} />}
        {activeTab === 'position' && <PositionTab overlay={overlay} onUpdate={onUpdate} />}
        {activeTab === 'style' && <StyleTab overlay={overlay} onUpdate={onUpdate} />}
        {activeTab === 'effects' && <EffectsTab overlay={overlay} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

/**
 * Text Tab - Text content and timing
 */
function TextTab({
  overlay,
  onUpdate,
}: {
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1">Text Content</label>
        <textarea
          value={overlay.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm resize-none focus:outline-none focus:border-blue-500"
          rows={3}
          placeholder="Enter your text..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Start Time (s)</label>
          <input
            type="number"
            value={overlay.startTime}
            onChange={(e) => onUpdate({ startTime: parseFloat(e.target.value) || 0 })}
            step="0.1"
            min="0"
            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Duration (s)</label>
          <input
            type="number"
            value={overlay.duration}
            onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) || 0.1 })}
            step="0.1"
            min="0.1"
            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Position Tab - Position and alignment
 */
function PositionTab({
  overlay,
  onUpdate,
}: {
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">X Position (%)</label>
          <input
            type="range"
            value={overlay.x * 100}
            onChange={(e) => onUpdate({ x: parseFloat(e.target.value) / 100 })}
            min="0"
            max="100"
            step="1"
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">{(overlay.x * 100).toFixed(0)}%</div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Y Position (%)</label>
          <input
            type="range"
            value={overlay.y * 100}
            onChange={(e) => onUpdate({ y: parseFloat(e.target.value) / 100 })}
            min="0"
            max="100"
            step="1"
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">{(overlay.y * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdate({ textAlign: align })}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                overlay.textAlign === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1">Rotation (°)</label>
        <input
          type="range"
          value={overlay.rotation}
          onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) })}
          min="-180"
          max="180"
          step="1"
          className="w-full"
        />
        <div className="text-xs text-gray-400 mt-1">{overlay.rotation}°</div>
      </div>
    </div>
  );
}

/**
 * Style Tab - Font and colors
 */
function StyleTab({
  overlay,
  onUpdate,
}: {
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Font Size</label>
          <input
            type="number"
            value={overlay.fontSize}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
            min="12"
            max="200"
            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Font Weight</label>
          <select
            value={overlay.fontWeight}
            onChange={(e) => onUpdate({ fontWeight: e.target.value as 'normal' | 'bold' })}
            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1">Font Family</label>
        <select
          value={overlay.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times">Times</option>
          <option value="Courier">Courier</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Text Color</label>
          <input
            type="color"
            value={overlay.fontColor}
            onChange={(e) => onUpdate({ fontColor: e.target.value })}
            className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Opacity</label>
          <input
            type="range"
            value={overlay.opacity * 100}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) / 100 })}
            min="0"
            max="100"
            step="1"
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">{(overlay.opacity * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">Background</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <input
              type="color"
              value={overlay.backgroundColor || '#000000'}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Opacity</label>
            <input
              type="range"
              value={overlay.backgroundOpacity * 100}
              onChange={(e) => onUpdate({ backgroundOpacity: parseFloat(e.target.value) / 100 })}
              min="0"
              max="100"
              step="1"
              className="w-full"
            />
            <div className="text-xs text-gray-400 mt-1">
              {(overlay.backgroundOpacity * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Effects Tab - Border and shadow
 */
function EffectsTab({
  overlay,
  onUpdate,
}: {
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Border */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-2">Border</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Width</label>
            <input
              type="number"
              value={overlay.borderWidth}
              onChange={(e) => onUpdate({ borderWidth: parseInt(e.target.value) || 0 })}
              min="0"
              max="10"
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <input
              type="color"
              value={overlay.borderColor || '#000000'}
              onChange={(e) => onUpdate({ borderColor: e.target.value })}
              className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Shadow */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-300">Shadow</label>
          <button
            onClick={() => onUpdate({ shadowEnabled: !overlay.shadowEnabled })}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              overlay.shadowEnabled
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {overlay.shadowEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {overlay.shadowEnabled && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Offset X</label>
                <input
                  type="number"
                  value={overlay.shadowOffsetX}
                  onChange={(e) => onUpdate({ shadowOffsetX: parseInt(e.target.value) || 0 })}
                  min="-20"
                  max="20"
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Offset Y</label>
                <input
                  type="number"
                  value={overlay.shadowOffsetY}
                  onChange={(e) => onUpdate({ shadowOffsetY: parseInt(e.target.value) || 0 })}
                  min="-20"
                  max="20"
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Blur</label>
                <input
                  type="number"
                  value={overlay.shadowBlur}
                  onChange={(e) => onUpdate({ shadowBlur: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="20"
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Color</label>
                <input
                  type="color"
                  value={overlay.shadowColor}
                  onChange={(e) => onUpdate({ shadowColor: e.target.value })}
                  className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
