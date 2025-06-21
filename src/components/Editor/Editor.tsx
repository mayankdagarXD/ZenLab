
import React, { useEffect, useState, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useFileStore, FileNode } from '../../store/fileStore';
import * as monaco from 'monaco-editor';
import { useThemeStore } from '../../store/themeStore';
import { FileCode, FileJson, FileText, Package, FileCog, X, Loader2, ChevronLeft, ChevronRight, File as FileIconDefault, Code2 } from 'lucide-react';

interface OpenFile {
  path: string;
  content: string;
  originalContent: string;
  isSaving?: boolean;
}

const Editor: React.FC = () => {
  const { currentFile, setCurrentFile: setGlobalCurrentFile, getFileContent, saveFile: saveFileToStore, fileTree } = useFileStore();
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useThemeStore();

  const openFiles_forFileLoadEffect_Ref = useRef(openFiles);
  const activeFile_forFileLoadEffect_Ref = useRef(activeFile);

  useEffect(() => {
    openFiles_forFileLoadEffect_Ref.current = openFiles;
  }, [openFiles]);

  useEffect(() => {
    activeFile_forFileLoadEffect_Ref.current = activeFile;
  }, [activeFile]);

  const isModified = useCallback((file: OpenFile | undefined) => {
    if (!file) return false;
    return file.content !== file.originalContent;
  }, []);

  useEffect(() => {
    if (!currentFile) return;

    const loadOrActivateFile = async () => {
      const findNodeInTree = (path: string, tree: FileNode[]): FileNode | null => {
        if (!tree || tree.length === 0) return null;
        for (const node of tree) {
          if (node.path === path) return node;
          if (node.type === 'directory' && node.children) {
            const foundInChild = findNodeInTree(path, node.children);
            if (foundInChild) return foundInChild;
          }
        }
        return null;
      };

      const nodeDetails = findNodeInTree(currentFile, fileTree);
      if (!nodeDetails || nodeDetails.type === 'directory') {
        return;
      }

      const currentOpenFilesSnapshot = openFiles_forFileLoadEffect_Ref.current;
      const currentActiveFileSnapshot = activeFile_forFileLoadEffect_Ref.current;
      const fileIsAlreadyOpen = currentOpenFilesSnapshot.some(f => f.path === currentFile);

      if (fileIsAlreadyOpen) {
        if (currentActiveFileSnapshot !== currentFile) {
          setActiveFile(currentFile);
        }
        const tabElement = document.getElementById(`tab-${currentFile.replace(/[^a-zA-Z0-9]/g, '-')}`);
        tabElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else {
        setIsLoading(true);
        try {
          const fileContent = await getFileContent(currentFile);
          const newOpenFileEntry: OpenFile = {
            path: currentFile,
            content: fileContent,
            originalContent: fileContent,
          };
          setOpenFiles(prev => [...prev, newOpenFileEntry]);
          setActiveFile(currentFile);
          setTimeout(() => {
            const tabElement = document.getElementById(`tab-${currentFile.replace(/[^a-zA-Z0-9]/g, '-')}`);
            tabElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }, 0);
        } catch (error) {
          console.error(`Failed to load file content for ${currentFile}:`, error);
          setGlobalCurrentFile(null);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadOrActivateFile();
  }, [currentFile, getFileContent, setGlobalCurrentFile, fileTree]); 

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFile_forFileLoadEffect_Ref.current || value === undefined) return;
    setOpenFiles(prev => prev.map(file =>
      file.path === activeFile_forFileLoadEffect_Ref.current
        ? { ...file, content: value }
        : file
    ));
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const fileToSave = openFiles_forFileLoadEffect_Ref.current.find(f => f.path === activeFile_forFileLoadEffect_Ref.current);
      if (fileToSave && isModified(fileToSave)) {
        handleSave(activeFile_forFileLoadEffect_Ref.current!, fileToSave.content);
      }
    }, 1000);
  };

  const handleSave = async (filePath: string, valueToSave: string) => {
    setOpenFiles(prev => prev.map(f => f.path === filePath ? { ...f, isSaving: true } : f));
    try {
      await saveFileToStore(filePath, valueToSave);
      setOpenFiles(prev => prev.map(file =>
        file.path === filePath
          ? { ...file, originalContent: valueToSave, isSaving: false }
          : file
      ));
    } catch (error) {
      console.error('Failed to save file:', error);
      alert(`Failed to save ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      setOpenFiles(prev => prev.map(f => f.path === filePath ? { ...f, isSaving: false } : f));
    }
  };

  const handleCloseFile = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const fileToClose = openFiles_forFileLoadEffect_Ref.current.find(f => f.path === filePath);
    if (fileToClose && isModified(fileToClose)) {
      handleSave(filePath, fileToClose.content);
    }
    const newOpenFiles = openFiles_forFileLoadEffect_Ref.current.filter(f => f.path !== filePath);
    setOpenFiles(newOpenFiles);

    if (activeFile_forFileLoadEffect_Ref.current === filePath) {
      if (newOpenFiles.length > 0) {
        const closedFileIndex = openFiles_forFileLoadEffect_Ref.current.findIndex(f => f.path === filePath);
        const newActiveIndex = Math.max(0, closedFileIndex > 0 ? closedFileIndex - 1 : 0);
        const newActivePath = newOpenFiles[newActiveIndex]?.path || newOpenFiles[0]?.path || null;
        setActiveFile(newActivePath);
        setGlobalCurrentFile(newActivePath);
      } else {
        setActiveFile(null);
        setGlobalCurrentFile(null);
      }
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const iconProps = { className: "h-3.5 w-3.5 flex-shrink-0" };
    switch (extension) {
      case 'js': case 'jsx': return <FileCode {...iconProps} color="#f7df1e" />;
      case 'ts': case 'tsx': return <FileCode {...iconProps} color="#3178c6" />;
      case 'json': return <FileJson {...iconProps} color="#f1e05a" />;
      case 'html': case 'htm': return <FileCode {...iconProps} color="#e34f26" />;
      case 'css': return <FileCode {...iconProps} color="#563d7c" />;
      case 'scss': case 'sass': return <FileCode {...iconProps} color="#c6538c" />;
      case 'md': return <FileText {...iconProps} color="#087ea4" />;
      case 'py': return <FileCode {...iconProps} color="#3572A5" />;
      case 'java': return <FileCode {...iconProps} color="#b07219" />;
      case 'c': case 'h': return <FileCode {...iconProps} color="#555555" />;
      case 'cpp': case 'hpp': return <FileCode {...iconProps} color="#f34b7d" />;
      default:
        if (filename.toLowerCase() === 'package.json') return <Package {...iconProps} color="#cb3837" />;
        if (filename.toLowerCase().includes('config') || filename.toLowerCase().startsWith('.')) return <FileCog {...iconProps} color="#adb5bd" />;
        return <FileIconDefault {...iconProps} color="#adb5bd" />;
    }
  };

  const getLanguage = (filename: string | null): string => {
    if (!filename) return 'plaintext';
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript'; 
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript'; 
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'sass': return 'scss'; 
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'c': case 'h': return 'c';
      case 'cpp': case 'hpp': return 'cpp';
      case 'cs': return 'csharp';
      case 'go': return 'go';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'swift': return 'swift';
      case 'yaml': case 'yml': return 'yaml';
      case 'xml': return 'xml';
      case 'sh': return 'shell';
      case 'dockerfile': return 'dockerfile';
      case 'gitignore': return 'gitignore';
      default: return 'plaintext';
    }
  };

  const currentOpenFileToDisplay = openFiles.find(f => f.path === activeFile);
  const activeFileContent = currentOpenFileToDisplay?.content ?? '';

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentActiveFileSnapshot = activeFile_forFileLoadEffect_Ref.current;
      const currentOpenFilesSnapshot = openFiles_forFileLoadEffect_Ref.current;
      if (currentActiveFileSnapshot && currentOpenFilesSnapshot) {
        const fileToSave = currentOpenFilesSnapshot.find(f => f.path === currentActiveFileSnapshot);
        if (fileToSave && isModified(fileToSave)) {
          handleSave(currentActiveFileSnapshot, fileToSave.content);
        }
      }
    });
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const fileTree_forSyncRef = useRef(fileTree);
  const openFiles_forFileTreeSync_Ref = useRef(openFiles);
  const activeFile_forFileTreeSync_Ref = useRef(activeFile);

  useEffect(() => { fileTree_forSyncRef.current = fileTree; }, [fileTree]);
  useEffect(() => { openFiles_forFileTreeSync_Ref.current = openFiles; }, [openFiles]);
  useEffect(() => { activeFile_forFileTreeSync_Ref.current = activeFile; }, [activeFile]);

  useEffect(() => {
    const checkFileExists = (filePath: string, tree: FileNode[]): boolean => {
      if (!tree || !Array.isArray(tree) || tree.length === 0) return false;
      for (const node of tree) {
        if (node.path === filePath) return true;
        if (node.type === 'directory' && node.children && checkFileExists(filePath, node.children)) return true;
      }
      return false;
    };

    const currentOpenFilesSnapshot = openFiles_forFileTreeSync_Ref.current;
    const currentActiveFileSnapshot = activeFile_forFileTreeSync_Ref.current;
    const currentFileTreeSnapshot = fileTree_forSyncRef.current;

    if (!currentFileTreeSnapshot || !Array.isArray(currentFileTreeSnapshot)) return;
    
    const stillExistingOpenFiles = currentOpenFilesSnapshot.filter(of => checkFileExists(of.path, currentFileTreeSnapshot));

    if (stillExistingOpenFiles.length < currentOpenFilesSnapshot.length) {
      setOpenFiles(stillExistingOpenFiles);
      if (currentActiveFileSnapshot && !stillExistingOpenFiles.some(f => f.path === currentActiveFileSnapshot)) {
        const newActivePath = stillExistingOpenFiles.length > 0 ? stillExistingOpenFiles[0]?.path || null : null;
        setActiveFile(newActivePath);
        setGlobalCurrentFile(newActivePath);
      }
    }
  }, [fileTree, setGlobalCurrentFile]); // Removed local state setters

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-editor)]">
      {openFiles.length > 0 && (
        <div className="flex items-center bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shadow-sm relative shrink-0 h-[40px]">
          <button
            onClick={() => scrollTabs('left')}
            className="sticky left-0 z-10 p-2.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
            title="Scroll tabs left"
          >
            <ChevronLeft size={16} />
          </button>
          <div ref={tabsContainerRef} className="flex-1 flex items-stretch overflow-x-auto no-scrollbar">
            {openFiles.map(file => {
              const isActive = file.path === activeFile;
              const fileName = file.path.split('/').pop() || file.path;
              const modified = isModified(file);

              return (
                <div
                  id={`tab-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  key={file.path}
                  className={`
                    flex items-center pl-3 pr-2 py-0 cursor-pointer border-r border-t-2
                    ${isActive ? 'border-t-[var(--color-accent)] bg-[var(--color-bg-editor)] text-[var(--color-text-primary)] font-medium' : 'border-t-transparent border-r-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'}
                    min-w-[160px] max-w-[240px] group relative text-xs h-full
                  `}
                  onClick={() => {
                    if (currentFile !== file.path) setGlobalCurrentFile(file.path);
                    else setActiveFile(file.path);
                  }}
                  title={file.path}
                >
                  <div className="flex items-center gap-1.5 mr-1.5 shrink-0">
                    {getFileIcon(fileName)}
                  </div>
                  <span className="truncate flex-1">
                    {fileName}
                  </span>
                  <div className="ml-2 flex items-center shrink-0">
                    {file.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" /> :
                     modified ? <div className="h-2 w-2 rounded-full bg-blue-400 opacity-70 group-hover:opacity-100" title="Modified"></div> :
                     null
                    }
                    <button
                      className={`ml-1.5 p-0.5 rounded-sm hover:bg-[var(--color-bg-primary)] opacity-0 group-hover:opacity-70 hover:!opacity-100 focus-visible:opacity-100 ${isActive || modified ? 'opacity-70' : ''}`}
                      onClick={(e) => handleCloseFile(file.path, e)}
                      title="Close File"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => scrollTabs('right')}
            className="sticky right-0 z-10 p-2.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
            title="Scroll tabs right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-editor)] bg-opacity-75 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
          </div>
        )}
        {!activeFile && !isLoading && openFiles.length === 0 && (
          <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] px-4">
            <div className="text-center">
              <Code2 size={64} className="mx-auto mb-6 opacity-30" />
              <h2 className="text-xl mb-2 font-medium text-[var(--color-text-primary)]">ZenTest Editor</h2>
              <p className="text-sm">Open a file from the explorer or create a new one to start coding.</p>
            </div>
          </div>
        )}
        {activeFile && currentOpenFileToDisplay && (
          <MonacoEditor
            height="100%"
            key={activeFile} // Key prop ensures re-mount on file change
            language={getLanguage(activeFile)}
            theme={isDark ? "vs-dark" : "vs-light"}
            value={activeFileContent}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            path={activeFile}
            options={{
              minimap: { enabled: true, scale: 0.8, side: 'right', showSlider: 'mouseover' },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              automaticLayout: true,
              formatOnPaste: true,
              formatOnType: true,
              renderLineHighlight: 'gutter',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                alwaysConsumeMouseWheel: false,
              },
              glyphMargin: true,
              folding: true,
              lineNumbersMinChars: 3,
              padding: { top: 12, bottom: 12 },
              mouseWheelZoom: true,
              smoothScrolling: true,
              detectIndentation: true,
              bracketPairColorization: { enabled: true },
              lightbulb: { enabled: true },
              occurrencesHighlight: 'off',
            }}
          />
        )}
         {activeFile && !currentOpenFileToDisplay && !isLoading && (
            <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)] mr-2" />
                Reloading file...
            </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
