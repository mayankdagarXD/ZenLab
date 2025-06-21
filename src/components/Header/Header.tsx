import React from 'react';
import JSZip from 'jszip';
import { Download, Code2, RefreshCw } from 'lucide-react';
import { useWebContainerStore } from '../../store/webContainerStore';

const Header: React.FC = () => {
  const { webcontainerInstance, isContainerReady, reset } = useWebContainerStore();

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
          const fullPath = `${dirPath}/${entry.name}`.replace(/\/\//g, '/');
          
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
      
      const content = await zip.generateAsync({ type: 'blob' });
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zentest-project.zip';
      document.body.appendChild(a);
      a.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export project:', error);
      alert(`Failed to export project: ${error}`);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
      <div className="flex items-center">
        <Code2 className="h-6 w-6 text-[var(--color-accent)] mr-2" />
        <h1 className="text-xl font-semibold text-white">ZenTest</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={reset}
          className="header-button"
          title="Reset Environment"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Reset
        </button>
        
        <button
          className="header-button"
          onClick={exportProject}
          disabled={!isContainerReady}
          title="Export Project as ZIP"
        >
          <Download className="h-4 w-4 mr-1" />
          Export Project
        </button>
      </div>
    </header>
  );
};

export default Header;