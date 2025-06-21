
import React, { useEffect, useRef, useState } from 'react';
import { useWebContainerStore } from '../../store/webContainerStore';
import { RefreshCw, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';

const Preview: React.FC = () => {
  const { serverUrl, isServerRunning } = useWebContainerStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setIframeError(null); 
    setIsLoadingUrl(true);
  };

  useEffect(() => {
    setIframeError(null);
    setIsLoadingUrl(false); // Reset loading state initially or on serverUrl change before load attempt

    const currentIframe = iframeRef.current;
    if (!currentIframe) return;

    if (serverUrl) {
      setIsLoadingUrl(true);
      console.log(`[Preview] Received serverUrl: ${serverUrl}. Preparing to load.`);

      const url = new URL(serverUrl); // Check if URL is valid first
      if (!url.hostname.endsWith('webcontainer.io') && 
          !url.hostname.includes('webcontainer-api.io') && // For some WC setups
          url.hostname !== 'localhost' && // For local dev of the editor itself
          !url.hostname.match(/^[\d.]+$/) // Allow raw IP, though less common for WC
        ) {
        console.warn('[Preview] Invalid preview URL hostname:', serverUrl);
        setIframeError('Invalid preview URL. Ensure server is running on a WebContainer-mapped port.');
        currentIframe.src = 'about:blank';
        setIsLoadingUrl(false);
        return;
      }

      // Force iframe to reload: set to blank, then to new URL
      currentIframe.src = 'about:blank';

      const loadTimeout = setTimeout(() => {
        if (currentIframe && serverUrl === useWebContainerStore.getState().serverUrl) { // Check if serverUrl is still the one we want
          console.log(`[Preview] Attempting to load URL into iframe: ${serverUrl}`);
          currentIframe.src = serverUrl;
          // setIsLoadingUrl(false); // isLoadingUrl will be set to false on iframe.onload or iframe.onerror
        } else {
          console.log('[Preview] serverUrl changed before load attempt or iframe detached.');
          setIsLoadingUrl(false);
        }
      }, 100); // A short delay to ensure about:blank has loaded

      return () => clearTimeout(loadTimeout);

    } else {
      console.log('[Preview] serverUrl is null or empty, setting iframe to about:blank');
      currentIframe.src = 'about:blank';
      setIsLoadingUrl(false);
    }
  }, [serverUrl, refreshKey]);

  const handleIframeLoad = () => {
    console.log('[Preview] Iframe content loaded.');
    setIframeError(null);
    setIsLoadingUrl(false);
  };

  const handleIframeError = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error('[Preview] Iframe loading error:', e);
    setIframeError('Failed to load preview. Check server logs and ensure it is running correctly and accessible.');
    setIsLoadingUrl(false);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      <div className="panel-header">
        <span className="font-medium">Preview</span>
        <div className="flex items-center space-x-2">
          {serverUrl && isServerRunning && (
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              title="Refresh Preview"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 bg-white relative">
        {isLoadingUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-accent)] mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading preview...</p>
          </div>
        )}
        {iframeError && !isLoadingUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] p-4 z-10">
            <AlertTriangle size={32} className="text-yellow-500 mb-3" />
            <p className="text-sm font-medium mb-1">Preview Error</p>
            <p className="text-xs text-center max-w-xs">{iframeError}</p>
          </div>
        )}
        {!isServerRunning && !iframeError && !isLoadingUrl && (
          <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] p-4">
            <ExternalLink size={32} className="opacity-50 mb-3" />
            <p className="text-sm font-medium mb-1">Server Not Running</p>
            <p className="text-xs text-center">Run <code className="bg-[var(--color-bg-tertiary)] px-1 py-0.5 rounded">npm run dev</code> in the terminal to start the preview.</p>
          </div>
        ) }
        {isServerRunning && !serverUrl && !iframeError && !isLoadingUrl && (
          <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] p-4">
             <Loader2 size={32} className="animate-spin opacity-50 mb-3" />
            <p className="text-sm font-medium mb-1">Starting Dev Server...</p>
            <p className="text-xs text-center">Waiting for server URL from WebContainer.</p>
          </div>
        )}
        {/* The iframe is always rendered so ref is stable, visibility of content handled by loading/error states */}
        <iframe
          ref={iframeRef}
          key={refreshKey} // Still useful for manual refresh to ensure effect re-runs
          className={`w-full h-full border-none ${isLoadingUrl || iframeError ? 'opacity-0' : 'opacity-100'}`} // Hide iframe visually during load/error
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Application Preview"
        />
      </div>
    </div>
  );
};

export default Preview;

    