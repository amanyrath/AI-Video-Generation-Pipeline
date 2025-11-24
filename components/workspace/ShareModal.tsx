'use client';

import { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Trash2 } from 'lucide-react';
import type { ShareLinkResponse } from '@/lib/share/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  projectId,
}: ShareModalProps) {
  const [shareLinks, setShareLinks] = useState<ShareLinkResponse[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing share links
  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
    }
  }, [isOpen, projectId]);

  const fetchShareLinks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/share`);
      if (res.ok) {
        const data = await res.json();
        setShareLinks(data);
      }
    } catch (err) {
      console.error('Failed to fetch share links:', err);
    }
  };

  const handleCreateLink = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create share link');
      }

      const newLink = await res.json();
      setShareLinks([newLink, ...shareLinks]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (shareUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDeleteLink = async (token: string) => {
    try {
      const res = await fetch(`/api/share/${token}/manage`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShareLinks(shareLinks.filter((link) => link.shareToken !== token));
      }
    } catch (err) {
      console.error('Failed to delete share link:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white/10 border border-white/20 rounded-3xl backdrop-blur-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-semibold text-white">Share Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Create New Link */}
          <div className="mb-6">
            <button
              onClick={handleCreateLink}
              disabled={isCreating}
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create New Share Link'}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Existing Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Active Share Links ({shareLinks.length})
            </h3>

            {shareLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No share links yet</p>
                <p className="text-sm">Create one to share your project</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-300 truncate">
                          {link.shareUrl}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created {new Date(link.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(link.shareUrl, link.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Copy link"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteLink(link.shareToken)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
