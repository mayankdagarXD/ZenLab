import { WebContainer } from '@webcontainer/api';
import { getAllStoredFiles } from './storage';

export const mountFiles = async (webcontainerInstance: WebContainer) => {
  try {
    const storedFiles = await getAllStoredFiles();
    const filePaths = Object.keys(storedFiles);

    if (filePaths.length > 0) {
      console.log('Found stored files in IndexedDB, mounting them...');
      const filesToMount: Record<string, { file: { contents: string } }> = {};
      for (const filePath of filePaths) {
        // Ensure parent directories exist for nested files
        const parts = filePath.split('/').filter(p => p); // remove empty strings from leading/trailing slashes
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath += `/${parts[i]}`;
          // This structure is for WebContainer's mount, not direct fs.mkdir
          // We rely on mount to create directory structures from paths.
        }
        // Add file to mount object
        filesToMount[filePath] = { file: { contents: storedFiles[filePath] } };
      }
      await webcontainerInstance.mount(filesToMount);
      console.log(`${filePaths.length} files mounted from IndexedDB.`);
    } else {
      // Mount an empty object if no files are stored, to ensure mount completes
      await webcontainerInstance.mount({});
      console.log('No stored files found in IndexedDB. Initializing empty file system.');
    }
  } catch (error) {
    console.error('Error mounting files:', error);
    // Attempt to mount an empty structure if mounting stored files fails,
    // so the WebContainer can still boot.
    try {
      await webcontainerInstance.mount({});
    } catch (mountError) {
      console.error('Critical error: Failed to mount even an empty file system:', mountError);
    }
    // Do not re-throw here to allow the app to potentially continue with an empty file system
  }
};
