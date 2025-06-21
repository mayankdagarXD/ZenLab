
import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useWebContainerStore } from './store/webContainerStore';
import { useThemeStore } from './store/themeStore';
import { useFileStore } from './store/fileStore';
import { SidebarClose, SidebarOpen, Moon, Sun, RefreshCw, Loader2, AlertTriangle, TerminalSquare, Code2, Download } from 'lucide-react';
import JSZip from 'jszip';

const FileExplorer = React.lazy(() => import('./components/FileExplorer/FileExplorer'));
const Editor = React.lazy(() => import('./components/Editor/Editor'));
const TerminalComponent = React.lazy(() => import('./components/Terminal/Terminal'));
const Preview = React.lazy(() => import('./components/Preview/Preview'));

const COLLAPSED_EXPLORER_WIDTH = 50;
const DEFAULT_EXPLORER_WIDTH = 260;
const TERMINAL_HEADER_HEIGHT = 30;
const DEFAULT_TERMINAL_OPEN_HEIGHT = 200;

function App() {
  const { initializeWebContainer, webcontainerInstance, isContainerReady, reset } = useWebContainerStore();
  const { currentFile } = useFileStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (!initStartedRef.current) {
      initStartedRef.current = true;
      setInitError(null);
      initializeWebContainer().catch(error => {
        console.error("Failed to initialize WebContainer in App:", error);
        setInitError(error.message || "Failed to initialize WebContainer. Please try refreshing.");
      });
    }
  }, [initializeWebContainer]);

  const toggleTerminal = () => setIsTerminalOpen(prev => !prev);
  const toggleExplorer = () => setIsExplorerCollapsed(prev => !prev);

  const exportProject = async () => {
    if (!webcontainerInstance) {
      alert('WebContainer is not ready yet. Please wait and try again.');
      return;
    }

    try {
      const zip = new JSZip();
      
      const addFilesToZip = async (dirPath: string, zipFolder: JSZip) => {
        const entries = await webcontainerInstance.fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          // Skip . and .. to prevent infinite recursion if they are somehow listed
          if (entry.name === '.' || entry.name === '..') continue;
          
          const rawPath = `${dirPath}/${entry.name}`;
          const fullPath = rawPath.replace(/\/\//g, '/');
          
          if (entry.isDirectory()) {
            const newFolder = zipFolder.folder(entry.name);
            if (newFolder) {
              await addFilesToZip(fullPath, newFolder);
            }
          } else {
            const content = await webcontainerInstance.fs.readFile(fullPath);
            zipFolder.file(entry.name, content);
          }
        }
      };
      
      await addFilesToZip('/', zip);
      
      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zentest-project.zip';
      document.body.appendChild(a);
      a.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export project:', error);
      alert(`Failed to export project: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const LoadingFallback = ({ message = "Loading component..." }: { message?: string }) => (
    <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)]">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      {message}
    </div>
  );

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-8">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Initialization Error</h2>
        <p className="text-center text-[var(--color-text-secondary)] mb-6">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!isContainerReady && !currentFile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        <Code2 size={48} className="text-[var(--color-accent)] mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold mb-2">ZenTest Editor</h2>
        <div className="flex items-center text-[var(--color-text-secondary)]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Initializing WebContainer... Please wait.
        </div>
      </div>
    );
  }

  const gridTemplateColumns = isExplorerCollapsed
    ? `${COLLAPSED_EXPLORER_WIDTH}px minmax(0, 2fr) minmax(0, 1fr)`
    : `0.25fr 0.5fr 0.25fr`;


  const gridContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: gridTemplateColumns,
    height: 'calc(100vh - 48px)', 
    width: '100%',
    overflow: 'hidden',
    transition: 'grid-template-columns 0.2s ease-in-out',
  };

  const HeaderButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }> = ({ children, title, ...props }) => (
    <button
      {...props}
      title={title}
      className="p-2 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] text-sm shrink-0 h-[48px]">
        <div className="flex items-center space-x-3">
          <Code2 className="h-6 w-6 text-[var(--color-accent)]" />
          <span className="font-semibold text-lg">ZenTest Editor</span>
          <HeaderButton
            onClick={toggleExplorer}
            title={isExplorerCollapsed ? "Expand File Explorer" : "Collapse File Explorer"}
          >
            {isExplorerCollapsed ? <SidebarOpen size={20} /> : <SidebarClose size={20} />}
          </HeaderButton>
        </div>
        <div className="flex items-center space-x-2">
          <HeaderButton
            onClick={exportProject}
            title="Export Project as ZIP"
            disabled={!isContainerReady}
          >
            <Download size={20} />
          </HeaderButton>
          <HeaderButton
            onClick={toggleTerminal}
            title={isTerminalOpen ? "Hide Terminal" : "Show Terminal"}
          >
            <TerminalSquare size={20} />
          </HeaderButton>
          <HeaderButton
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </HeaderButton>
          <HeaderButton
            onClick={reset}
            title="Reset Environment & Clear Files"
            disabled={!isContainerReady}
          >
            <RefreshCw size={20} />
          </HeaderButton>
        </div>
      </div>

      {/* Main Content Area - CSS Grid */}
      <div className="flex-1 overflow-hidden w-full" style={gridContainerStyle}>
        {/* Column 1: File Explorer (Grid Item) */}
        <div className={`h-full bg-[var(--color-bg-secondary)] overflow-y-auto overflow-x-hidden custom-scrollbar border-r border-[var(--color-border)] transition-all duration-300 ease-in-out ${isExplorerCollapsed ? `w-[${COLLAPSED_EXPLORER_WIDTH}px]` : 'w-full'}`}>
          <Suspense fallback={<LoadingFallback message="Loading Files..." />}>
            <FileExplorer isCollapsed={isExplorerCollapsed} />
          </Suspense>
        </div>

        {/* Column 2: Editor (Grid Item) */}
        <div className="h-full overflow-hidden">
          <Suspense fallback={<LoadingFallback message="Loading Editor..." />}>
            <Editor />
          </Suspense>
        </div>
        
        {/* Column 3: Right Panel (Preview and Terminal Stacked) (Grid Item) */}
        <div className="flex flex-col h-full bg-[var(--color-bg-primary)] overflow-hidden border-l border-[var(--color-border)]">
          {/* Preview Area */}
          <div className="flex-1 overflow-auto min-h-0">
            <Suspense fallback={<LoadingFallback message="Loading Preview..." />}>
              <Preview />
            </Suspense>
          </div>
          {/* Terminal Area */}
          <div 
            className="shrink-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] transition-all duration-300 ease-in-out"
            style={{ height: isTerminalOpen ? `${DEFAULT_TERMINAL_OPEN_HEIGHT}px` : `${TERMINAL_HEADER_HEIGHT}px`}}
          >
            <Suspense fallback={<LoadingFallback message="Loading Terminal..." />}>
              <TerminalComponent isTerminalOpen={isTerminalOpen} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
