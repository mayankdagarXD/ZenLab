<div align="center">

  <h1>
  <span style="background-color: #e0e0e0; padding: 4px 8px; border-radius: 6px;">💻</span>
  ZenTest Web Editor
</h1>
  <p>
    <b>A modern, browser-based code editor and dev environment powered by WebContainer, React, Monaco Editor, and Xterm.js.</b>
  </p>

  <p>
    <a href="https://github.com/mayankdagarXD/zenlab/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/mayankdagarXD/zenlab/ci.yml?branch=main&label=build" alt="Build Status"></a>
    <a href="https://github.com/mayankdagarXD/zenlab/stargazers"><img src="https://img.shields.io/github/stars/mayankdagarXD/zenlab?style=social" alt="GitHub stars"></a>
    <a href="https://github.com/mayankdagarXD/zenlab/issues"><img src="https://img.shields.io/github/issues/mayankdagarXD/zenlab.svg" alt="Issues"></a>
    <a href="https://github.com/mayankdagarXD/zenlab/pulls"><img src="https://img.shields.io/github/issues-pr/mayankdagarXD/zenlab.svg" alt="Pull Requests"></a>
    <a href="https://github.com/mayankdagarXD/zenlab/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mayankdagarXD/zenlab.svg" alt="License: MIT"></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18">
    <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/WebContainer-in--browser%20Node.js-ff69b4?logo=stackblitz" alt="WebContainer">
    <img src="https://img.shields.io/badge/Monaco%20Editor-VS%20Code%20Editor-007acc?logo=visualstudiocode" alt="Monaco Editor">
    <img src="https://img.shields.io/badge/Xterm.js-Terminal-222?logo=gnubash" alt="Xterm.js">
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss" alt="Tailwind CSS">
  </p>

  <br/>

  <img src="https://github.com/user-attachments/assets/d74c0368-6be1-4fd2-a0ac-3a09a825f1b1" alt="ZenLab Demo" width="80%"/>
  <br/>
  🚀 **Live Demo:** [Click here to try it out](https://zenlabbeta.netlify.app/)
</div>

---

# ✨ Features

- **Full In-Browser Development**: Run, edit, and preview full-stack projects directly in your browser using WebContainer technology.
- **File Explorer**: Create, rename, delete, and organize files and folders with a modern, collapsible sidebar.
- **Monaco Editor Integration**: Rich code editing with syntax highlighting, multi-tab support, auto-save, and language detection.
- **Integrated Terminal**: Real shell access (bash) in-browser, with color themes and responsive resizing.
- **Live Preview**: Instantly preview your running app (e.g., Vite dev server) in a secure iframe.
- **Project Persistence**: Files are stored in IndexedDB for persistent sessions and can be exported as a ZIP archive.
- **Theme Switching**: Toggle between dark and light themes for optimal comfort.
- **One-Click React Template Import**: Instantly scaffold a new React + TypeScript project.
- **Reset & Export**: Reset the environment or export your entire project as a ZIP file.

---

# 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/mayankdagarXD/zenlab.git
cd zenlab
npm install
```

### 2. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

# 🖥️ Usage Guide

- <img alt="File Explorer" src="https://img.shields.io/badge/File%20Explorer-222?logo=files" height="18"/> Use the sidebar to create, rename, or delete files/folders. Filter files with the search bar.
- <img alt="Editor" src="https://img.shields.io/badge/Editor-007acc?logo=visualstudiocode" height="18"/> Click a file to open it in a tab. Multiple files can be open at once. Changes are auto-saved.
- <img alt="Terminal" src="https://img.shields.io/badge/Terminal-222?logo=gnubash" height="18"/> Open the terminal to run commands (e.g., `npm install`, `npm run dev`).
- <img alt="Preview" src="https://img.shields.io/badge/Preview-ff69b4?logo=googlechrome" height="18"/> Start your dev server (e.g., `npm run dev`) in the terminal. The preview panel will show your running app.
- <img alt="Theme" src="https://img.shields.io/badge/Theme-dark%20%2F%20light-888?logo=halfmoon" height="18"/> Toggle dark/light mode from the header.
- <img alt="Export" src="https://img.shields.io/badge/Export-ZIP-4ec9b0?logo=zip" height="18"/> Download your project as a ZIP from the header.
- <img alt="Reset" src="https://img.shields.io/badge/Reset-Environment-f44747?logo=power" height="18"/> Clear all files and reset the environment.

---

# 🏗️ Project Structure

```text
final_zeneditor/
├── src/
│   ├── components/
│   │   ├── Editor/         # Monaco-based code editor
│   │   ├── FileExplorer/   # File tree, file/folder actions
│   │   ├── Header/         # App header (branding, actions)
│   │   ├── Preview/        # Live preview iframe
│   │   └── Terminal/       # Xterm.js terminal
│   ├── store/              # Zustand stores (state management)
│   ├── utils/              # File system, storage, dev server helpers
│   ├── App.tsx             # Main app layout and logic
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind and custom styles
├── index.html              # HTML entry point
├── package.json            # Project metadata and dependencies
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── tsconfig*.json          # TypeScript configs
└── vite.config.ts          # Vite config
```

---

# ⚙️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/WebContainer-in--browser%20Node.js-ff69b4?logo=stackblitz" alt="WebContainer"/>
  <img src="https://img.shields.io/badge/Monaco%20Editor-VS%20Code%20Editor-007acc?logo=visualstudiocode" alt="Monaco Editor"/>
  <img src="https://img.shields.io/badge/Xterm.js-Terminal-222?logo=gnubash" alt="Xterm.js"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/JSZip-Project%20Export-4ec9b0?logo=zip" alt="JSZip"/>
  <img src="https://img.shields.io/badge/idb--keyval-IndexedDB-888?logo=database" alt="idb-keyval"/>
  <img src="https://img.shields.io/badge/Lucide%20React-Icons-9e9e9e?logo=lucide" alt="Lucide React"/>
</p>

---

# 🧩 Architecture Overview

- **State Management**: Zustand stores manage file system, theme, and WebContainer state.
- **Persistence**: Files are saved in IndexedDB for session persistence and re-mounted on reload.
- **WebContainer**: Provides a real Node.js environment in-browser, enabling npm scripts, file system, and server processes.
- **Editor**: Monaco Editor powers multi-tab, language-aware editing with auto-save and keyboard shortcuts.
- **Terminal**: Xterm.js connects to a shell process inside WebContainer, supporting real command execution.
- **Preview**: The app listens for the dev server URL and displays it in a secure iframe.

---

# 🤝 Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or improvements.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request


---

# 🙏 Acknowledgments

- [WebContainer](https://webcontainers.io/) by StackBlitz
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Xterm.js](https://xtermjs.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

<p align="center">
  <b>Made with ❤️ by ZenTest Contributors</b>
</p> 
