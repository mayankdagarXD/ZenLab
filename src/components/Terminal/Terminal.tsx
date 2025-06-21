
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useWebContainerStore } from '../../store/webContainerStore';
import { useThemeStore } from '../../store/themeStore';
import { TerminalSquare, ChevronDown, ChevronUp } from 'lucide-react'; // Removed Chevron icons
import 'xterm/css/xterm.css';

// Enhanced Solarized Dark Theme (slightly more modern feel)
const professionalDark = {
  background: '#0d1117', // GitHub Dark Dimmed background
  foreground: '#c9d1d9', // GitHub Dark Dimmed foreground
  cursor: '#58a6ff',     // GitHub Dark Dimmed cursor (blue)
  cursorAccent: '#0d1117',
  selectionBackground: '#1f6feb', // Brighter blue for selection
  selectionForeground: '#f0f6fc',
  black: '#484f58',   // Darker gray
  red: '#f85149',     // Brighter red
  green: '#56d364',   // Brighter green
  yellow: '#e3b341',  // Brighter yellow
  blue: '#58a6ff',    // Brighter blue
  magenta: '#bc8cff', // Brighter magenta
  cyan: '#79c0ff',    // Brighter cyan
  white: '#f0f6fc',   // GitHub Dark Dimmed bright white
  brightBlack: '#6e7681', 
  brightRed: '#ff7b72',   
  brightGreen: '#7ee787', 
  brightYellow: '#f0cd60',
  brightBlue: '#80b6fc',  
  brightMagenta: '#d8a9ff',
  brightCyan: '#a5d6ff',  
  brightWhite: '#ffffff', 
};

// Enhanced Solarized Light Theme (cleaner look)
const professionalLight = {
  background: '#ffffff', 
  foreground: '#24292f', // GitHub Light foreground
  cursor: '#0969da',     // GitHub Light cursor (blue)
  cursorAccent: '#ffffff',
  selectionBackground: '#add6ff', // Lighter blue for selection
  selectionForeground: '#003366',
  black: '#57606a',   
  red: '#cf222e',     
  green: '#1a7f37',   
  yellow: '#9a6700',  
  blue: '#0969da',    
  magenta: '#8250df', 
  cyan: '#057076',    
  white: '#24292f',  
  brightBlack: '#6e7781', 
  brightRed: '#d1242f',   
  brightGreen: '#2da44e', 
  brightYellow: '#bf8700',
  brightBlue: '#218bff',  
  brightMagenta: '#a041e5',
  brightCyan: '#0a757f',  
  brightWhite: '#000000', 
};


interface TerminalComponentProps {
  isTerminalOpen: boolean;
  // toggleTerminal: () => void; // Removed as toggle is now global
}

const TerminalComponent: React.FC<TerminalComponentProps> = ({ isTerminalOpen }) => {
  const terminalElRef = useRef<HTMLDivElement>(null);
  const xtermInstanceRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const { webcontainerInstance, isContainerReady, setTerminal } = useWebContainerStore();
  const { isDark } = useThemeStore();
  const shellProcessStarted = useRef(false);
  // No local isXtermInitialized state needed if we rely on isTerminalOpen for rendering content

  const initializeXTerm = useCallback(() => {
    // Only initialize if terminal is meant to be open, container ready, and not already initialized
    if (!terminalElRef.current || xtermInstanceRef.current || !isContainerReady ) return;

    console.log("Initializing XTerm instance for TerminalComponent");
    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: '"Fira Code", "JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 13,
      fontWeight: 400,
      fontWeightBold: 700,
      lineHeight: 1.4,
      letterSpacing: 0.2,
      scrollback: 5000,
      convertEol: true,
      theme: isDark ? professionalDark : professionalLight,
      allowProposedApi: true, // For potential future addons
      windowsMode: navigator.platform.startsWith('Win'),
      rightClickSelectsWord: true,
      macOptionIsMeta: navigator.platform.startsWith('Mac'),
      altClickMovesCursor: true,
      // termName: 'xterm-256color', // Helps with color support in some cli apps
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    xterm.open(terminalElRef.current);
    xtermInstanceRef.current = xterm;
    setTerminal(xterm); // Make xterm instance available globally if needed

    // Setup resize observer for fitting
    if (terminalElRef.current.parentElement) {
      resizeObserverRef.current = new ResizeObserver(() => {
        // Only fit if the terminal content area is visible and has a height
        if (fitAddonRef.current && xtermInstanceRef.current?.element && xtermInstanceRef.current.element.clientHeight > 0 && isTerminalOpen) {
            try {
              fitAddonRef.current.fit();
            } catch (e) {
              console.warn("FitAddon fit error:", e);
            }
        }
      });
      resizeObserverRef.current.observe(terminalElRef.current.parentElement);
    }
  }, [isDark, setTerminal, isContainerReady, isTerminalOpen]); // Added isTerminalOpen

  const connectShell = useCallback(async () => {
    // Connect shell only if XTerm is initialized, WC ready, and shell not already started
    if (!webcontainerInstance || !xtermInstanceRef.current || shellProcessStarted.current || !isContainerReady) {
      return;
    }
    
    console.log("Connecting shell process to XTerm");
    shellProcessStarted.current = true; // Mark as attempting to start
    try {
      const shellProcess = await webcontainerInstance.spawn('bash');
      if (!xtermInstanceRef.current) { // Check again in case xterm was disposed
        shellProcessStarted.current = false; 
        return; 
      }

      shellProcess.output.pipeTo(
        new WritableStream({
          write(data) { if(xtermInstanceRef.current) xtermInstanceRef.current.write(data); },
          close() { console.log("Shell output stream closed"); },
          abort(reason) { console.error("Shell output stream aborted:", reason); }
        })
      ).catch(error => {
        console.error("Shell output stream pipeTo error:", error);
        if(xtermInstanceRef.current) xtermInstanceRef.current.write(`\r\nShell output stream error: ${error.message}\r\n`);
      });

      const inputWriter = shellProcess.input.getWriter();
      const dataDisposable = xtermInstanceRef.current.onData(data => {
        inputWriter.write(data).catch(e => console.error("Error writing to shell input:", e));
      });

      // Handle shell exit
      shellProcess.exit.then(code => {
        console.log(`Shell process exited with code ${code}`);
        dataDisposable.dispose(); 
        shellProcessStarted.current = false; // Allow re-connection if needed
        if(xtermInstanceRef.current) {
          xtermInstanceRef.current.write(`\r\nShell exited with code ${code}\r\n`);
          // Optionally, prompt user to restart shell or auto-restart
        }
      }).catch(error => {
        console.error("Shell exit promise error:", error);
        dataDisposable.dispose();
        shellProcessStarted.current = false;
      });

    } catch (error) {
      console.error('Failed to spawn shell process:', error);
      if (xtermInstanceRef.current) xtermInstanceRef.current.write(`\r\nError starting shell: ${error instanceof Error ? error.message : String(error)}\r\n`);
      shellProcessStarted.current = false; // Reset on failure
    }
  }, [webcontainerInstance, isContainerReady]);

  // Initialize XTerm and connect shell when terminal is first opened and ready
  useEffect(() => {
    if (isTerminalOpen && isContainerReady) {
      if (!xtermInstanceRef.current) {
        initializeXTerm();
      }
      // Connect shell if XTerm is initialized and shell not started
      // This check is important to prevent multiple shell connections if component re-renders
      if (xtermInstanceRef.current && webcontainerInstance && !shellProcessStarted.current) {
        connectShell();
      }
    }
  }, [isTerminalOpen, isContainerReady, initializeXTerm, connectShell, webcontainerInstance]);


  // Effect for theme changes and fitting when terminal becomes visible or size changes
  useEffect(() => {
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.options.theme = isDark ? professionalDark : professionalLight;
    }
    // Fit when terminal is opened or its container resizes (handled by ResizeObserver)
    if (isTerminalOpen && fitAddonRef.current && xtermInstanceRef.current?.element) {
      // Ensure the element is actually visible and has dimensions
      if (terminalElRef.current && terminalElRef.current.clientHeight > 0) {
         // Delay fit slightly to ensure layout calculations are complete
         setTimeout(() => {
            try {
              fitAddonRef.current?.fit();
            } catch (e) {
              console.warn("FitAddon fit error on visibility change:", e);
            }
         }, 50); 
      }
    }
  }, [isDark, isTerminalOpen]); // isTerminalOpen triggers fit when shown

  // Cleanup on component unmount
  useEffect(() => {
    const currentXterm = xtermInstanceRef.current; 
    const currentResizeObserver = resizeObserverRef.current;
    return () => {
        console.log("TerminalComponent unmounting, disposing XTerm and observer");
        currentResizeObserver?.disconnect();
        if (currentXterm) {
            // Note: We don't explicitly kill the shell process from here.
            // It should continue running if the terminal is just hidden.
            // If the entire app closes, WebContainer handles teardown.
            currentXterm.dispose(); // Dispose XTerm UI instance
        }
        // xtermInstanceRef.current = null; // Not needed, new instance on remount
        // fitAddonRef.current = null;
        // shellProcessStarted.current = false; // Reset if we want a new shell on remount
        // setTerminal(null); // Clear global ref if it was set
    };
  }, []); // Empty array: run only on mount and unmount


  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
      {/* Header - always visible, acts as toggle trigger via App.tsx */}
      <div
        className="panel-header select-none flex items-center justify-between text-xs shrink-0 cursor-default"
        title="Terminal"
        // onClick={toggleTerminal} // Toggle is now handled globally from App.tsx header
      >
        <div className="flex items-center">
            <TerminalSquare size={14} className="mr-2 text-[var(--color-accent)]" />
            <span className="font-medium">Terminal</span>
        </div>
        {/* Chevron toggle removed from here, button is in App.tsx header */}
      </div>

      {/* Terminal Content - XTerm instance is mounted here */}
      {/* Conditionally render or hide the terminal content area */}
      <div
        className={`flex-1 bg-[var(--color-bg-primary)] terminal-content-area min-h-0 ${!isTerminalOpen && 'hidden'}`}
        ref={terminalElRef}
        // style={{ display: isTerminalOpen ? 'block' : 'none' }} // Alternative to 'hidden' class
      />
      {/* Fallback if terminal is open but instance not ready (e.g. during init) */}
      {isTerminalOpen && !terminalElRef.current && (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
          Initializing terminal...
        </div>
      )}
    </div>
  );
};

export default TerminalComponent;
