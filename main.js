const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');

let windows = [];
let tray = null;
let isEnabled = true;

// Global state for color sync
let globalColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
let lastGlobalPoint = { x: 0, y: 0 };
let lastMoveTime = Date.now();

function createWindows() {
    const displays = screen.getAllDisplays();

    // Initialize lastGlobalPoint
    lastGlobalPoint = screen.getCursorScreenPoint();

    displays.forEach((display) => {
        const { x, y, width, height } = display.bounds;

        const win = new BrowserWindow({
            x,
            y,
            width,
            height,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            hasShadow: false,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        win.setIgnoreMouseEvents(true, { forward: true });
        win.loadFile('index.html');

        windows.push({ win, bounds: display.bounds });
    });

    // Poll mouse position
    setInterval(() => {
        if (!isEnabled) return; // Stop polling if disabled

        const point = screen.getCursorScreenPoint();

        // Check for movement to trigger color change
        const dx = point.x - lastGlobalPoint.x;
        const dy = point.y - lastGlobalPoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            if (Date.now() - lastMoveTime > 200) {
                globalColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            }
            lastMoveTime = Date.now();
            lastGlobalPoint = point;
        }

        windows.forEach(({ win, bounds }) => {
            if (!win.isDestroyed()) {
                const localPoint = {
                    x: point.x - bounds.x,
                    y: point.y - bounds.y,
                    color: globalColor
                };
                win.webContents.send('mouse-move', localPoint);
            }
        });
    }, 8);
}

function createTray() {
    let iconPath;
    if (app.isPackaged) {
        iconPath = path.join(process.resourcesPath, 'icon.png');
    } else {
        iconPath = path.join(__dirname, 'icon.png');
    }

    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    tray.setToolTip('MouseTrail');

    updateTrayMenu();
}

function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: isEnabled ? 'Disable' : 'Enable',
            click: toggleApp
        },
        { type: 'separator' },
        {
            label: 'Quit', click: () => {
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

function toggleApp() {
    isEnabled = !isEnabled;

    if (isEnabled) {
        // Show all windows
        windows.forEach(({ win }) => {
            if (!win.isDestroyed()) win.show();
        });
    } else {
        // Hide all windows
        windows.forEach(({ win }) => {
            if (!win.isDestroyed()) win.hide();
        });
    }

    updateTrayMenu();
}

app.whenReady().then(() => {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
    } else {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            dialog.showMessageBox({
                type: 'info',
                title: 'MouseTrail',
                message: 'MouseTrail is already running. Check your system tray.'
            });
        });

        createWindows();
        createTray();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindows();
        });
    }
});

// Prevent app from quitting when all windows are closed (background mode)
app.on('window-all-closed', function () {
    // Do nothing, keep running
});
