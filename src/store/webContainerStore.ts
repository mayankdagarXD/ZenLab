
import { create } from 'zustand';
import { WebContainer } from '@webcontainer/api';
import { mountFiles } from '../utils/fileSystem';
import { useFileStore, clearProjectStorage } from './fileStore'; // Import clearProjectStorage

interface WebContainerState {
  webcontainerInstance: WebContainer | null;
  isContainerReady: boolean;
  terminal: any | null; // XTerm instance
  serverUrl: string | null;
  isServerRunning: boolean;
  initializeWebContainer: () => Promise<void>;
  setTerminal: (terminal: any) => void;
  runCommand: (command: string, args?: string[]) => Promise<string>; // Keep this for programmatic execution
  installDependencies: () => Promise<void>; // Keep this
  reset: () => Promise<void>;
}

let wcBootPromise: Promise<WebContainer> | null = null;

export const useWebContainerStore = create<WebContainerState>((set, get) => ({
  webcontainerInstance: null,
  isContainerReady: false,
  terminal: null,
  serverUrl: null,
  isServerRunning: false,

  reset: async () => {
    const { webcontainerInstance, terminal } = get();
    
    if (terminal?.element) {
      terminal.clear();
      // The shell process might still be running, this only clears the xterm buffer.
      // A more complete reset might involve trying to kill processes if WC API allows.
    }

    if (webcontainerInstance) {
      try {
        webcontainerInstance.off('server-ready');
        webcontainerInstance.off('error');
        // Don't call teardown, as it fully destroys the instance.
        // Instead, we want to clear its FS and re-mount.
        // For a full reset including WC instance, teardown would be needed.
        // However, re-booting is expensive. So, we clear FS and reload.
        
        // Clear files from WebContainer FS (by removing all at root)
        const entries = await webcontainerInstance.fs.readdir('/');
        for (const entry of entries) {
          if (entry === '.' || entry === '..') continue;
          try {
            await webcontainerInstance.fs.rm(`/${entry}`, { recursive: true });
          } catch(e) {
            console.warn(`Could not remove /${entry} during reset:`, e)
          }
        }
        console.log("WebContainer file system cleared.");

      } catch (e) {
        console.warn('Error during WebContainer FS clear:', e);
      }
    }
    
    await clearProjectStorage(); // Clear IndexedDB and fileStore state

    set({
      // webcontainerInstance: null, // Keep instance if not tearing down
      // isContainerReady: false, // Will be set by re-initialization steps
      serverUrl: null,
      isServerRunning: false,
      // terminal: null, // Terminal instance itself might be reused if not disposed
    });
    
    // Re-mount files (which will be empty from IDB now, or default if any)
    if (get().webcontainerInstance) {
      await mountFiles(get().webcontainerInstance!);
    } else {
      // If WC instance was somehow lost, re-initialize fully
      wcBootPromise = null; // Allow re-boot
      await get().initializeWebContainer(); // This will call mountFiles internally
    }
    
    await useFileStore.getState().loadFileTree(); // Reload file tree for the (now empty) container
    console.log("Environment reset complete.");
  },

  initializeWebContainer: async () => {
    if (get().isContainerReady && get().webcontainerInstance) {
      console.log("WebContainer already initialized.");
      return;
    }
    if (wcBootPromise) {
      console.log("WebContainer initialization in progress, awaiting existing promise...");
      await wcBootPromise; // Await the ongoing boot process
      // Check if successful after awaiting
      if (get().isContainerReady && get().webcontainerInstance) return;
      // If it failed, wcBootPromise might be null, proceed to boot
    }

    console.log("Initializing WebContainer...");
    wcBootPromise = WebContainer.boot();

    try {
      const webcontainerInstance = await wcBootPromise;
      set({ webcontainerInstance });

      webcontainerInstance.on('server-ready', (port, url) => {
        console.log(`WebContainer server ready on port ${port}, URL: ${url}`);
        set({ serverUrl: url, isServerRunning: true });
      });

      webcontainerInstance.on('error', (errorData) => {
        console.error('WebContainer global error:', errorData.message, errorData);
        // Potentially set isContainerReady to false if it's a critical error
      });
      
      await mountFiles(webcontainerInstance); // Mount files from IndexedDB or defaults
      
      set({ isContainerReady: true });
      console.log("WebContainer initialized and ready.");
      
      // Trigger initial file tree load
      await useFileStore.getState().loadFileTree();

    } catch (error) {
      console.error('WebContainer initialization failed:', error);
      set({
        webcontainerInstance: null,
        isContainerReady: false,
        serverUrl: null,
        isServerRunning: false
      });
      wcBootPromise = null; // Reset promise on failure to allow retry
      throw error; // Re-throw for App.tsx to catch
    }
    // wcBootPromise = null; // Clear promise after successful boot if we don't want to reuse the instance via this promise
  },

  setTerminal: (terminalInstance) => {
    set({ terminal: terminalInstance });
  },

  runCommand: async (command, args = []) => {
    const { webcontainerInstance, terminal } = get();
    if (!webcontainerInstance) {
      throw new Error('WebContainer not initialized');
    }

    if (command === 'npm' && args && args[0] === 'run' && args[1] === 'dev') {
      set({ isServerRunning: true, serverUrl: null }); 
    }

    try {
      const process = await webcontainerInstance.spawn(command, args);
      
      if (terminal?.element) { // Check if terminal UI is available
        process.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            }
          })
        ).catch(streamError => {
          console.error('Error piping process output to terminal:', streamError);
          if (terminal?.element) {
            terminal.write(`\r\nError streaming process output: ${streamError.message}\r\n`);
          }
        });
      }

      const exitCode = await process.exit;
      if (exitCode !== 0) {
        if (command === 'npm' && args && args[0] === 'run' && args[1] === 'dev') {
            set({ serverUrl: null, isServerRunning: false });
        }
        // Don't throw error for commands like `npm run dev` that might be killed by user
        // but log it for other commands.
        console.warn(`Command '${command} ${args.join(' ')}' exited with code ${exitCode}`);
        // throw new Error(`Command '${command} ${args.join(' ')}' failed with exit code ${exitCode}`);
      } else {
        if (command === 'npm' && args && args[0] === 'run' && args[1] === 'dev') {
           // if it exits cleanly with 0, it might have been stopped.
           // server-ready event would set the URL if it starts.
        }
      }
      return `Command exited with code ${exitCode}`;
    } catch (error) {
      console.error(`Command execution failed: ${command} ${args?.join(' ')}`, error);
      if (command === 'npm' && args && args[0] === 'run' && args[1] === 'dev') {
        set({ serverUrl: null, isServerRunning: false });
      }
      throw error;
    }
  },

  installDependencies: async () => {
    const { webcontainerInstance, terminal } = get();
    if (!webcontainerInstance) {
      throw new Error('WebContainer not initialized');
    }

    try {
      if (terminal?.element) {
        terminal.write('Installing dependencies (npm install)...\r\n');
      }

      const installProcess = await webcontainerInstance.spawn('npm', ['install']);
      
      if (terminal?.element) {
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            }
          })
        ).catch(streamError => {
          console.error('Error piping npm install output to terminal:', streamError);
           if (terminal?.element) {
            terminal.write(`\r\nError streaming install output: ${streamError.message}\r\n`);
          }
        });
      }

      const exitCode = await installProcess.exit;
      if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`);
      }

      if (terminal?.element) {
        terminal.write('\r\nDependencies installed successfully.\r\n');
      }
    } catch (error) {
      console.error('Failed to install dependencies:', error);
      if (terminal?.element) {
        terminal.write(`\r\nFailed to install dependencies: ${error}\r\n`);
      }
      throw error;
    }
  }
}));
