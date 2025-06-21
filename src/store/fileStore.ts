
import { create } from 'zustand';
import { useWebContainerStore } from './webContainerStore';
import { saveFileToStorage, deleteFileFromStorage, getFileFromStorage } from '../utils/storage';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

interface FileState {
  fileTree: FileNode[];
  currentFile: string | null;
  // fileContents cache is less critical now with IDB, but can still speed up editor loads for already fetched files
  fileContents: Record<string, string>;
  isLoading: boolean;
  loadFileTree: () => Promise<void>;
  setCurrentFile: (path: string | null) => void;
  getFileContent: (path: string) => Promise<string>;
  saveFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteFileOrDirectory: (path: string, isDirectory: boolean) => Promise<void>;
  renameFileOrDirectory: (oldPath: string, newPath: string) => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  fileTree: [],
  currentFile: null,
  fileContents: {},
  isLoading: false,

  loadFileTree: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    let timeoutId: NodeJS.Timeout | null = null;

    const operationPromise = (async () => {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        throw new Error('WebContainer not initialized');
      }

      const directoryTree = async (path: string): Promise<FileNode[]> => {
        const currentWebContainerInstance = useWebContainerStore.getState().webcontainerInstance;
         if (!currentWebContainerInstance) {
            throw new Error('WebContainer instance became unavailable during file tree loading');
         }

        const entries = await currentWebContainerInstance.fs.readdir(path, { withFileTypes: true });
        
        const nodes = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = `${path}/${entry.name}`.replace(/\/\//g, '/');
            if (entry.isDirectory()) {
              return {
                name: entry.name,
                type: 'directory' as const,
                path: fullPath,
                children: await directoryTree(fullPath)
              };
            } else {
              return {
                name: entry.name,
                type: 'file' as const,
                path: fullPath
              };
            }
          })
        );
        
        return nodes.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'directory' ? -1 : 1;
        });
      };

      const tree = await directoryTree('/');
      return tree;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('File tree loading timed out after 15 seconds'));
      }, 15000);
    });

    try {
      const tree = await Promise.race([operationPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      set({ fileTree: tree as FileNode[], isLoading: false });
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error('Failed to load file tree (or timed out):', error);
      set({ fileTree: [], isLoading: false });
    }
  },

  setCurrentFile: (path) => {
    set({ currentFile: path });
  },

  getFileContent: async (path) => {
    const { fileContents } = get();
    if (Object.prototype.hasOwnProperty.call(fileContents, path)) {
      return fileContents[path];
    }

    try {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        // Try fetching from storage if WC not ready (e.g., initial load before WC mounts)
        const storedContent = await getFileFromStorage(path);
        if (storedContent !== undefined) {
          set((state) => ({ fileContents: { ...state.fileContents, [path]: storedContent } }));
          return storedContent;
        }
        throw new Error('WebContainer not initialized and file not in storage');
      }

      const content = await webcontainerInstance.fs.readFile(path, 'utf-8');
      set((state) => ({ fileContents: { ...state.fileContents, [path]: content } }));
      return content;
    } catch (error) {
      console.warn(`Failed to read file from WC: ${path}, trying storage. Error: ${error}`);
      // Fallback to storage if WC read fails for some reason
      try {
        const storedContent = await getFileFromStorage(path);
        if (storedContent !== undefined) {
          set((state) => ({ fileContents: { ...state.fileContents, [path]: storedContent } }));
          return storedContent;
        }
      } catch (storageError) {
        console.error(`Failed to read file from storage after WC fail: ${path}`, storageError);
      }
      console.error(`Truly failed to read file: ${path}`);
      return ''; 
    }
  },

  saveFile: async (path, content) => {
    try {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        throw new Error('WebContainer not initialized for saving');
      }
      await webcontainerInstance.fs.writeFile(path, content);
      await saveFileToStorage(path, content); // Save to IndexedDB
      set((state) => ({ 
        fileContents: { ...state.fileContents, [path]: content } 
      }));
      console.log(`File saved to WebContainer and IndexedDB: ${path}`);
    } catch (error) {
      console.error(`Failed to save file: ${path}`, error);
      throw error;
    }
  },

  createFile: async (path) => {
    try {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        throw new Error('WebContainer not initialized');
      }
      await webcontainerInstance.fs.writeFile(path, ''); // Create with empty content
      await saveFileToStorage(path, ''); // Save empty file to IndexedDB
      await get().loadFileTree();
      console.log(`File created: ${path}`);
    } catch (error) {
      console.error(`Failed to create file: ${path}`, error);
      throw error;
    }
  },

  createDirectory: async (path) => {
    try {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        throw new Error('WebContainer not initialized');
      }
      await webcontainerInstance.fs.mkdir(path, { recursive: true });
      // Directories are not explicitly stored in IDB, only their file contents.
      await get().loadFileTree();
      console.log(`Directory created: ${path}`);
    } catch (error) {
      console.error(`Failed to create directory: ${path}`, error);
      throw error;
    }
  },

  deleteFileOrDirectory: async (path, isDirectory) => {
    try {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        throw new Error('WebContainer not initialized');
      }
      await webcontainerInstance.fs.rm(path, { recursive: isDirectory });
      
      if (isDirectory) {
        // For directories, we need to find all files under it and delete them from IDB
        // This is a simplified approach. A robust one might list IDB keys.
        // For now, rely on subsequent operations or a full clear for orphaned IDB entries if needed.
        // A more direct way: get all IDB keys, filter those starting with `path + '/'`, then delete them.
        console.warn(`Directory ${path} deleted. Individual files within it need to be handled for IDB if they were stored.`);
        // For simplicity, we are not deleting individual files from IDB upon directory deletion here.
        // Consider iterating through `fileTree` before deletion to collect file paths for IDB removal.
      } else {
        await deleteFileFromStorage(path); // Delete single file from IndexedDB
      }
      
      if (get().currentFile && (get().currentFile === path || (isDirectory && get().currentFile?.startsWith(`${path}/`)))) {
        set({ currentFile: null });
      }
      
      const newFileContents = { ...get().fileContents };
      delete newFileContents[path];
      // Also clean up children if directory deleted from cache
      if (isDirectory) {
        Object.keys(newFileContents).forEach(cachedPath => {
          if (cachedPath.startsWith(`${path}/`)) {
            delete newFileContents[cachedPath];
          }
        });
      }
      set({ fileContents: newFileContents });
      
      await get().loadFileTree();
      console.log(`${isDirectory ? 'Directory' : 'File'} deleted: ${path}`);
    } catch (error) {
      console.error(`Failed to delete ${isDirectory ? 'directory' : 'file'}: ${path}`, error);
      throw error;
    }
  },

  renameFileOrDirectory: async (oldPath, newPath) => {
    try {
      const webcontainerInstance = useWebContainerStore.getState().webcontainerInstance;
      if (!webcontainerInstance) {
        throw new Error('WebContainer not initialized');
      }

      // For files: read content, write to new path, then delete old.
      // For directories: WebContainer's fs.rename might work, or recursively rename.
      // Here, we'll simplify: assume rename is mainly for files regarding IDB.
      let isFile = false;
      let content = '';
      try {
        content = await webcontainerInstance.fs.readFile(oldPath, 'utf-8');
        isFile = true;
      } catch (e) {
        // Assume directory
      }

      await webcontainerInstance.fs.rename(oldPath, newPath); // Use WebContainer's rename

      if (isFile) {
        await saveFileToStorage(newPath, content);
        await deleteFileFromStorage(oldPath);
      } else {
        // If renaming a directory, all files within it in IDB would need their paths updated.
        // This is complex. For now, direct IDB manipulation for dir renames is not deeply handled.
        console.warn(`Directory ${oldPath} renamed to ${newPath}. Files within it in IndexedDB may need manual path updates if not handled by a full sync later.`);
      }
      
      if (get().currentFile === oldPath) {
        set({ currentFile: newPath });
      }
      
      const newFileContents = { ...get().fileContents };
      if (Object.prototype.hasOwnProperty.call(newFileContents, oldPath)) {
        newFileContents[newPath] = newFileContents[oldPath];
        delete newFileContents[oldPath];
        set({ fileContents: newFileContents });
      }
      // If a directory was renamed, update paths in cache
      if(!isFile) {
         Object.keys(newFileContents).forEach(cachedPath => {
          if (cachedPath.startsWith(`${oldPath}/`)) {
            const newCachedPath = cachedPath.replace(oldPath, newPath);
            newFileContents[newCachedPath] = newFileContents[cachedPath];
            delete newFileContents[cachedPath];
          }
        });
        set({ fileContents: newFileContents });
      }
      
      await get().loadFileTree();
      console.log(`Renamed: ${oldPath} to ${newPath}`);
    } catch (error) {
      console.error(`Failed to rename: ${oldPath} to ${newPath}`, error);
      throw error;
    }
  }
}));

// Helper for clearing storage on reset
export const clearProjectStorage = async () => {
  const { clearAllStoredFiles: clearIDBFİles } = await import('../utils/storage');
  await clearIDBFİles();
  // Clear local file cache in Zustand store
  useFileStore.setState({ fileContents: {}, currentFile: null, fileTree: [] });
};
