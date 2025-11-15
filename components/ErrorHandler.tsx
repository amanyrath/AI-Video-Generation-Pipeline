'use client';

import { useEffect } from 'react';

/**
 * Global error handler to suppress harmless browser extension errors
 */
export default function ErrorHandler() {
  useEffect(() => {
    // Suppress harmless browser extension errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      
      // Suppress browser extension message channel errors
      if (
        errorMessage.includes('message channel closed') ||
        errorMessage.includes('asynchronous response') ||
        errorMessage.includes('listener indicated')
      ) {
        event.preventDefault();
        return false;
      }
    };

    // Suppress unhandled promise rejections from browser extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason || '');
      
      // Suppress browser extension message channel errors
      if (
        errorMessage.includes('message channel closed') ||
        errorMessage.includes('asynchronous response') ||
        errorMessage.includes('listener indicated')
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

