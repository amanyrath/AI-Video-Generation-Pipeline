'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import { useProjectStore } from '@/lib/state/project-store';
import LeftPanel from '@/components/workspace/LeftPanel';
import MiddlePanel from '@/components/workspace/MiddlePanel';
import RightPanel from '@/components/workspace/RightPanel';
import CollapsedLeftPanel from '@/components/workspace/CollapsedLeftPanel';
import CollapsedRightPanel from '@/components/workspace/CollapsedRightPanel';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { project } = useProjectStore();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  useEffect(() => {
    if (!project && !projectId) {
      // Redirect to home if no project
      window.location.href = '/';
    }
  }, [project, projectId]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Workspace Header */}
      <WorkspaceHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel - Twitch style collapse */}
        {leftPanelCollapsed ? (
          <CollapsedLeftPanel onClick={() => setLeftPanelCollapsed(false)} />
        ) : (
          <div className="w-full md:w-80 transition-all duration-300 ease-in-out flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
            <LeftPanel onCollapse={() => setLeftPanelCollapsed(true)} />
          </div>
        )}

        {/* Middle Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <MiddlePanel />
        </div>

        {/* Right Panel - Twitch style collapse */}
        {rightPanelCollapsed ? (
          <CollapsedRightPanel onClick={() => setRightPanelCollapsed(false)} />
        ) : (
          <div className="w-full md:w-80 transition-all duration-300 ease-in-out flex-shrink-0 border-l border-gray-200 dark:border-gray-700">
            <RightPanel onCollapse={() => setRightPanelCollapsed(true)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading workspace...</p>
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}

