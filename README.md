# MouseTrail

**MouseTrail** is a lightweight, dynamic wallpaper application for Windows that creates beautiful, glowing light trails that follow your mouse cursor. It runs as an interactive overlay, allowing you to click through to your desktop and other windows seamlessly.

## 📖 User Guide

### Installation
1.  Download the latest installer from [GitHub Releases](../../releases).
2.  Run `MouseTrail Setup 1.0.0.exe` (requires Administrator privileges).
3.  Once installed, the application will be available in your Start Menu and as a Desktop shortcut.

### Usage
*   **System Tray**: MouseTrail runs quietly in the background. Look for the orange star icon in your system tray (near the clock).
*   **Enable/Disable**: Right-click the tray icon to toggle the trails on or off.
*   **Quit**: Right-click the tray icon and select "Quit" to close the application completely.

### Requirements & Limitations
*   **Operating System**: Windows 10 or Windows 11 (64-bit).
    *   *Note*: Windows 7 and 8 are not supported.
*   **Graphics**: A dedicated or integrated GPU is required.
    *   Performance may vary on high-resolution (4K) multi-monitor setups.
*   **Administrator Windows**: Trails may disappear behind windows running with Administrator privileges (e.g., Task Manager) due to Windows security restrictions.
*   **Fullscreen Games**: Trails may be hidden when playing games in "Exclusive Fullscreen" mode. Use "Borderless Windowed" mode for the best experience.

---

## 🛠️ Developer Guide

### Project Setup
1.  **Prerequisites**: Install [Node.js](https://nodejs.org/) (v16 or higher).
2.  **Clone/Download**: Get the source code.
3.  **Install Dependencies**:
    ```bash
    npm install
    ```

### Development
*   **Run Locally**:
    ```bash
    npm start
    ```
    This launches the Electron app in development mode.

*   **Build Installer**:
    ```bash
    npm run build
    ```
    This generates a Windows installer (`.exe`) in the `dist/` directory using `electron-builder`.
    *   *Note*: Run this command as **Administrator** to ensure symbolic links for the installer can be created correctly.

### Architecture
*   **Core**: Built with [Electron](https://www.electronjs.org/).
*   **Rendering**: Uses HTML5 Canvas API for high-performance 2D drawing.
*   **Structure**:
    *   `main.js`: Handles the main process, window creation (one per display), system tray integration, and global mouse polling.
    *   `renderer.js`: Handles the visual logic, particle system, and animation loop.
    *   `index.html` & `style.css`: The transparent overlay UI.
*   **Key Features**:
    *   **Click-Through**: Uses `win.setIgnoreMouseEvents(true, { forward: true })` to pass input to underlying windows.
    *   **Multi-Monitor**: Automatically detects and creates overlays for all connected displays.
    *   **Single Instance**: Enforces a single running instance using `app.requestSingleInstanceLock()`.

### Configuration
*   **Icon**: The tray icon is loaded from `icon.png`. In production, it is copied to `resources/` via `extraResources` in `package.json`.
*   **Installer**: NSIS configuration is located in `package.json` and `build/installer.nsh`.
