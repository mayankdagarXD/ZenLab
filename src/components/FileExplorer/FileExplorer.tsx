
import React, { useState, useEffect, useRef } from 'react';
import { useFileStore, FileNode } from '../../store/fileStore';
import { useWebContainerStore } from '../../store/webContainerStore';
import FileTreeItem from './FileTreeItem';
import { Plus, FolderPlus, RefreshCw, FileCode, Loader2, Search, X, FileText } from 'lucide-react';

interface FileExplorerProps {
  isCollapsed: boolean;
}

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string, isCollapsed?: boolean }> = ({ children, title, isCollapsed, ...props }) => (
  <button
    {...props}
    title={title}
    className={`p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors ${isCollapsed ? 'w-full flex justify-center' : ''}`}
  >
    {children}
  </button>
);


const FileExplorer: React.FC<FileExplorerProps> = ({ isCollapsed }) => {
  const { fileTree, loadFileTree, isLoading: isFileTreeLoading, createFile, createDirectory } = useFileStore();
  const { isContainerReady, webcontainerInstance } = useWebContainerStore();
  const [isCreatingNew, setIsCreatingNew] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [creationPath, setCreationPath] = useState<string>('/');
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (isContainerReady) {
      loadFileTree();
    }
  }, [isContainerReady, loadFileTree]);

  useEffect(() => {
    if (isCreatingNew && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [isCreatingNew]);

  const handleRefresh = () => {
    if (!isFileTreeLoading) {
      loadFileTree();
    }
  };

  const handleCreateNew = (type: 'file' | 'folder', path: string = '/') => {
    setCreationPath(path);
    setIsCreatingNew(type);
    setNewItemName('');
  };

  const handleImportTemplate = async () => {
    if (!webcontainerInstance) return;
    // ... (handleImportTemplate logic remains unchanged, omitted for brevity)
          await webcontainerInstance.fs.writeFile('/index.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React TypeScript Template</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
      await webcontainerInstance.fs.mkdir('/src');
      await webcontainerInstance.fs.writeFile('/src/main.tsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`);
      await webcontainerInstance.fs.writeFile('/src/App.tsx', `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">React + TypeScript</h1>
        <div className="p-8 bg-white rounded-lg shadow-lg">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
          <p className="mt-4 text-gray-600">
            Edit <code className="font-mono bg-gray-100 px-2 py-1 rounded">src/App.tsx</code> and save to test HMR
          </p>
        </div>
      </div>
    </div>
  )
}

export default App`);
      await webcontainerInstance.fs.writeFile('/src/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;`);
      await webcontainerInstance.fs.writeFile('/src/App.css', ``);
      await webcontainerInstance.fs.writeFile('/src/vite-env.d.ts', `/// <reference types="vite/client" />`);
      await webcontainerInstance.fs.writeFile('/tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`);
      await webcontainerInstance.fs.writeFile('/postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);
      await webcontainerInstance.fs.writeFile('/vite.config.ts', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  }
})`);
      await webcontainerInstance.fs.writeFile('/tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`);
      await webcontainerInstance.fs.writeFile('/tsconfig.node.json', `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`);
      await webcontainerInstance.fs.writeFile('/package.json', `{
  "name": "react-ts-template",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}`);
      await loadFileTree();
    try {
    } catch (error) {
      console.error('Failed to import template:', error);
      alert(`Failed to import template: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSubmitNewItem = async () => {
    if (!newItemName.trim()) {
      setIsCreatingNew(null);
      return;
    }
    const fullPath = (creationPath === '/' ? `/${newItemName}` : `${creationPath}/${newItemName}`).replace(/\/\//g, '/');
    try {
      if (isCreatingNew === 'file') {
        await createFile(fullPath);
      } else if (isCreatingNew === 'folder') {
        await createDirectory(fullPath);
      }
    } catch (error) {
      console.error(`Error creating ${isCreatingNew}:`, error);
      alert(`Failed to create ${isCreatingNew}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingNew(null);
      setNewItemName('');
    }
  };

  const filterTree = (nodes: FileNode[], filterText: string): FileNode[] => {
    if (!filterText) return nodes;
    const lowerFilterText = filterText.toLowerCase();
    return nodes.reduce((acc, node) => {
      if (node.name.toLowerCase().includes(lowerFilterText)) {
        if (node.type === 'directory' && node.children) {
          const filteredChildren = filterTree(node.children, filterText);
           acc.push({ ...node, children: filteredChildren });
        } else {
          acc.push(node);
        }
      } else if (node.type === 'directory' && node.children) {
        const filteredChildren = filterTree(node.children, filterText);
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, [] as FileNode[]);
  };

  const filteredFileTree = filterTree(fileTree, filter);

  return (
    <div className={`h-full flex flex-col bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] file-explorer overflow-hidden transition-all duration-150 ease-in-out ${isCollapsed ? 'w-[50px] items-center py-2.5' : 'w-full'}`}>
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2 w-full' : 'justify-between px-2.5 py-1.5'} border-b border-[var(--color-border)] shrink-0`}>
        {!isCollapsed && <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Explorer</h2>}
        <div className={`flex ${isCollapsed ? 'flex-col space-y-1.5 items-center' : 'space-x-1'}`}>
          <ActionButton
            isCollapsed={isCollapsed}
            onClick={() => handleCreateNew('file', '/')}
            title="New File (in root)"
            disabled={!isContainerReady || isCreatingNew !== null}
          >
            <Plus size={isCollapsed ? 20 : 16} />
            {!isCollapsed && <span className="ml-1 text-xs">File</span>}
          </ActionButton>
          <ActionButton
            isCollapsed={isCollapsed}
            onClick={() => handleCreateNew('folder', '/')}
            title="New Folder (in root)"
            disabled={!isContainerReady || isCreatingNew !== null}
          >
            <FolderPlus size={isCollapsed ? 20 : 16} />
             {!isCollapsed && <span className="ml-1 text-xs">Folder</span>}
          </ActionButton>
          <ActionButton
            isCollapsed={isCollapsed}
            onClick={handleRefresh}
            title="Refresh File Tree"
            disabled={!isContainerReady || isFileTreeLoading}
          >
            {isFileTreeLoading ? <Loader2 size={isCollapsed ? 20 : 16} className="animate-spin" /> : <RefreshCw size={isCollapsed ? 20 : 16} />}
          </ActionButton>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="p-2 border-b border-[var(--color-border)]">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter files..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none placeholder-[var(--color-text-secondary)] text-[var(--color-text-primary)]"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
              {filter && (
                <button
                  onClick={() => setFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  title="Clear filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {isCreatingNew && (
            <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="newItemNameInput" className="text-xs font-medium">
                  New {isCreatingNew === 'file' ? 'File' : 'Folder'}
                  <span className="text-[var(--color-text-secondary)] ml-1 text-[10px]">(in {creationPath === '/' ? 'root' : creationPath.split('/').pop()})</span>
                </label>
                <button onClick={() => setIsCreatingNew(null)} className="p-0.5 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" title="Cancel">
                  <X size={14} />
                </button>
              </div>
              <input
                id="newItemNameInput"
                ref={newItemInputRef} type="text" value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none placeholder-[var(--color-text-secondary)] text-[var(--color-text-primary)]"
                placeholder={isCreatingNew === 'file' ? 'filename.js' : 'folder-name'}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitNewItem(); if (e.key === 'Escape') setIsCreatingNew(null); }}
              />
            </div>
          )}
        </>
      )}

      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-0' : 'p-1.5'} custom-scrollbar`}>
        {!isContainerReady && !isCollapsed ? (
          <div className={`p-3 text-xs text-center text-[var(--color-text-secondary)]`}>
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            Initializing...
          </div>
        ) : isFileTreeLoading && fileTree.length === 0 && !isCollapsed ? (
          <div className={`p-3 text-xs text-center text-[var(--color-text-secondary)]`}>
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            Loading files...
          </div>
        ) : fileTree.length === 0 && !isCreatingNew && !filter ? (
          <div className={`flex flex-col items-center justify-center h-full p-4 text-center ${isCollapsed ? 'py-2' : ''}`}>
             <ActionButton
                isCollapsed={isCollapsed}
                onClick={handleImportTemplate}
                className={`px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded text-xs transition-colors ${isCollapsed ? 'p-1.5' : ''}`}
                disabled={!isContainerReady}
                title="Import React Template"
              >
                {isCollapsed ? <FileText size={18}/> : "Import React Template"}
              </ActionButton>
            {!isCollapsed && <p className="text-xs text-[var(--color-text-secondary)] mt-3">Or create files/folders using buttons above.</p>}
          </div>
        ) : filteredFileTree.length === 0 && filter && !isCollapsed ? (
            <div className="p-3 text-xs text-center text-[var(--color-text-secondary)]">
                No files or folders found matching "{filter}".
            </div>
        ) : (
          <ul className={`text-xs ${isCollapsed ? 'space-y-0.5 py-1' : ''}`}>
            {filteredFileTree.map((node) => (
              <FileTreeItem key={node.path} node={node} onCreateNew={handleCreateNew} isExplorerCollapsed={isCollapsed} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
