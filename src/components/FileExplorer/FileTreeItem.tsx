
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, File, Folder, FileCog, FileCode, FileJson, Package, Edit3, Trash2, FilePlus, FolderPlus, MoreHorizontal
} from 'lucide-react';
import { FileNode, useFileStore } from '../../store/fileStore';

interface FileTreeItemProps {
  node: FileNode;
  depth?: number;
  onCreateNew: (type: 'file' | 'folder', path: string) => void;
  isExplorerCollapsed: boolean;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, depth = 0, onCreateNew, isExplorerCollapsed }) => {
  const { setCurrentFile, currentFile, deleteFileOrDirectory, renameFileOrDirectory } = useFileStore();
  const [isExpanded, setIsExpanded] = useState(depth < 1 && !isExplorerCollapsed);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [showActions, setShowActions] = useState(false);
  const itemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isExplorerCollapsed) {
      setIsExpanded(false);
    }
  }, [isExplorerCollapsed]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExplorerCollapsed) {
      if (node.type === 'file') setCurrentFile(node.path);
      return;
    }
    if (node.type === 'directory') setIsExpanded(!isExpanded);
    setCurrentFile(node.path); 
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExplorerCollapsed) return;
    if (node.type === 'file') setCurrentFile(node.path); // Or open if not already active
    else if (node.type === 'directory') setIsExpanded(!isExpanded);
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setNewName(node.name);
    setShowActions(false);
  };

  const handleRenameSubmit = async () => {
    if (!isRenaming) return;
    const trimmedNewName = newName.trim();
    if (trimmedNewName && trimmedNewName !== node.name) {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${trimmedNewName}` : `/${trimmedNewName}`;
      try {
        await renameFileOrDirectory(node.path, newPath.replace(/\/\//g, '/'));
      } catch (error) {
        console.error('Failed to rename:', error);
        alert(`Failed to rename: ${error instanceof Error ? error.message : String(error)}`);
        setNewName(node.name);
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(false);
    if (confirm(`Are you sure you want to delete '${node.name}'? This action cannot be undone.`)) {
      try {
        await deleteFileOrDirectory(node.path, node.type === 'directory');
      } catch (error) {
        console.error('Failed to delete:', error);
        alert(`Failed to delete: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleCreateInDirectory = (e: React.MouseEvent, type: 'file' | 'folder') => {
    e.stopPropagation();
    setShowActions(false);
    if (node.type === 'directory') {
      onCreateNew(type, node.path);
      setIsExpanded(true);
    }
  };

  const getIcon = () => {
    const iconProps = { className: "h-4 w-4 mr-1.5 shrink-0", style: isExplorerCollapsed ? { marginRight: 0 } : {} };
    if (node.type === 'directory' && !isExplorerCollapsed) {
      return isExpanded 
        ? <ChevronDown {...iconProps} /> 
        : <ChevronRight {...iconProps} />;
    }
    return <div className="w-4 mr-1.5 shrink-0" style={isExplorerCollapsed ? { marginRight: 0 } : {}} />; // Placeholder for alignment
  };

  const getFileSpecificIcon = () => {
    const baseClass = "h-4 w-4 shrink-0";
    const iconProps = { className: `${baseClass} ${isExplorerCollapsed ? '' : 'mr-1.5'}` };
     if (node.type === 'directory') {
      return <Folder {...iconProps} color={isExpanded && !isExplorerCollapsed ? 'var(--color-accent)' : '#a7b0be'} />;
    }
    const extension = node.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': case 'jsx': return <FileCode {...iconProps} color="#f7df1e" />;
      case 'ts': case 'tsx': return <FileCode {...iconProps} color="#3178c6" />;
      case 'json': return <FileJson {...iconProps} color="#f1e05a" />;
      case 'html': case 'htm': return <FileCode {...iconProps} color="#e34f26" />;
      case 'css': return <FileCode {...iconProps} color="#563d7c" />;
      case 'scss': case 'sass': return <FileCode {...iconProps} color="#c6538c" />;
      case 'md': return <File {...iconProps} color="#087ea4" />;
      case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'ico': return <File {...iconProps} color="#8ac926" />; // Generic image
      case 'zip': case 'tar': case 'gz': return <Package {...iconProps} color="#f0ad4e" />;
      case 'txt': return <File {...iconProps} color="#adb5bd" />;
      default:
        if (node.name.toLowerCase() === 'package.json') return <Package {...iconProps} color="#cb3837" />;
        if (node.name.toLowerCase().includes('config') || node.name.startsWith('.')) return <FileCog {...iconProps} color="#adb5bd" />;
        return <File {...iconProps} color="#ced4da" />;
    }
  };

  if (isExplorerCollapsed) {
    return (
      <li className="select-none" title={node.path} ref={itemRef}>
        <div 
          className={`flex items-center justify-center py-1.5 px-1 rounded group transition-colors duration-100 cursor-pointer
            ${currentFile === node.path && !isRenaming ? 'bg-[var(--color-accent)] bg-opacity-25' : 'hover:bg-[var(--color-bg-tertiary)]'}
          `}
          onClick={handleClick}
        >
          {getFileSpecificIcon()}
        </div>
      </li>
    );
  }

  return (
    <li className="my-px select-none relative" ref={itemRef} onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <div 
        className={`flex items-center py-1.5 px-2 rounded group transition-colors duration-100 cursor-pointer
          ${currentFile === node.path && !isRenaming ? 'bg-[var(--color-accent)] bg-opacity-20 text-[var(--color-text-primary)] font-medium' : 'hover:bg-[var(--color-bg-tertiary)]'}
          ${isRenaming ? 'bg-[var(--color-bg-tertiary)]' : ''}
        `}
        style={{ paddingLeft: `${(depth * 14) + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        title={node.path}
      >
        {getIcon()}
        {getFileSpecificIcon()}
        
        {isRenaming ? (
          <input
            ref={renameInputRef} type="text" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setIsRenaming(false); setNewName(node.name); }}}
            onClick={(e) => e.stopPropagation()} // Prevent item click while renaming
            className="flex-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-accent)] rounded px-1 py-0.5 outline-none text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        ) : (
          <span className="flex-1 truncate text-xs">{node.name}</span>
        )}
        
        {!isRenaming && showActions && (
          <div className="ml-auto flex items-center space-x-0.5">
            {node.type === 'directory' && (
              <>
                <button className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]" onClick={(e) => handleCreateInDirectory(e, 'file')} title="New File"><FilePlus size={14} /></button>
                <button className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]" onClick={(e) => handleCreateInDirectory(e, 'folder')} title="New Folder"><FolderPlus size={14} /></button>
              </>
            )}
            <button className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]" onClick={handleStartRename} title="Rename"><Edit3 size={14} /></button>
            <button className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-error)] hover:text-red-500" onClick={handleDelete} title="Delete"><Trash2 size={14} /></button>
          </div>
        )}
         {!isRenaming && !showActions && ( // Placeholder for consistent height or a subtle indicator
            <div className="ml-auto flex items-center space-x-0.5 h-[22px]"> 
              {/* <MoreHorizontal size={14} className="text-transparent group-hover:text-[var(--color-text-secondary)]"/> */}
            </div>
         )}
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && !isExplorerCollapsed && (
        <ul>
          {node.children.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} onCreateNew={onCreateNew} isExplorerCollapsed={isExplorerCollapsed} />
          ))}
          {node.children.length === 0 && (
            <li className="text-[var(--color-text-secondary)] italic text-[11px]" style={{ paddingLeft: `${((depth + 1) * 14) + 8 + 22}px` }}>
              (empty)
            </li>
          )}
        </ul>
      )}
    </li>
  );
};

export default FileTreeItem;
