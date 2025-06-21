import { get, set, del, keys as idbKeys, clear } from 'idb-keyval';

const STORAGE_PREFIX = 'file:';

function getStorageKey(filePath: string): string {
  return `${STORAGE_PREFIX}${filePath}`;
}

export async function saveFileToStorage(filePath: string, content: string): Promise<void> {
  try {
    await set(getStorageKey(filePath), content);
  } catch (error) {
    console.error(`Error saving file '${filePath}' to IndexedDB:`, error);
    throw error;
  }
}

export async function getFileFromStorage(filePath: string): Promise<string | undefined> {
  try {
    return await get(getStorageKey(filePath));
  } catch (error) {
    console.error(`Error getting file '${filePath}' from IndexedDB:`, error);
    return undefined;
  }
}

export async function deleteFileFromStorage(filePath: string): Promise<void> {
  try {
    await del(getStorageKey(filePath));
  } catch (error) {
    console.error(`Error deleting file '${filePath}' from IndexedDB:`, error);
    throw error;
  }
}

export async function getAllStoredFiles(): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  try {
    const allKeys = await idbKeys();
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(STORAGE_PREFIX)) {
        const filePath = key.substring(STORAGE_PREFIX.length);
        const content = await get<string>(key);
        if (content !== undefined) {
          files[filePath] = content;
        }
      }
    }
  } catch (error) {
    console.error('Error retrieving all files from IndexedDB:', error);
  }
  return files;
}

export async function clearAllStoredFiles(): Promise<void> {
    try {
        const allKeys = await idbKeys();
        const fileKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith(STORAGE_PREFIX));
        await Promise.all(fileKeys.map(key => del(key)));
        console.log('All project files cleared from IndexedDB.');
    } catch (error) {
        console.error('Error clearing files from IndexedDB:', error);
    }
}
