const { app, BrowserWindow, screen, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');

// Configuration constants
const CONFIG = {
    /** Mouse polling interval in milliseconds */
    POLL_INTERVAL_MS: 8,
    /** Time threshold to change color after mouse stops (ms) */
    COLOR_CHANGE_THRESHOLD_MS: 200,
    /** HSL saturation for trail color */
    COLOR_SATURATION: 100,
    /** HSL lightness for trail color */
    COLOR_LIGHTNESS: 50
};

/**
 * Generates a random HSL color
 * @returns {string} HSL color string
 */
function generateRandomColor() {
    const hue = Math.random() * 360;
    return `hsl(${hue}, ${CONFIG.COLOR_SATURATION}%, ${CONFIG.COLOR_LIGHTNESS}%)`;
}

let windows = [];
let tray = null;
let isEnabled = true;

// Global state for color sync
let globalColor = generateRandomColor();
let lastGlobalPoint = { x: 0, y: 0 };
let lastMoveTime = Date.now();

/**
 * Calculates the distance between two points
 * @param {number} dx - Difference in x coordinates
 * @param {number} dy - Difference in y coordinates
 * @returns {number} Distance between points
 */
function calculateDistance(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Creates transparent overlay windows for all connected displays
 * and starts polling mouse position
 */
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

    startMousePolling();
}

/**
 * Starts polling for mouse position and sends updates to renderer windows
 */
function startMousePolling() {
    setInterval(() => {
        if (!isEnabled) return;

        const point = screen.getCursorScreenPoint();

        // Check for movement to trigger color change
        const dx = point.x - lastGlobalPoint.x;
        const dy = point.y - lastGlobalPoint.y;
        const dist = calculateDistance(dx, dy);

        if (dist > 0) {
            const timeSinceLastMove = Date.now() - lastMoveTime;
            if (timeSinceLastMove > CONFIG.COLOR_CHANGE_THRESHOLD_MS) {
                globalColor = generateRandomColor();
            }
            lastMoveTime = Date.now();
            lastGlobalPoint = point;
        }

        sendMousePositionToWindows(point);
    }, CONFIG.POLL_INTERVAL_MS);
}

/**
 * Sends mouse position to all renderer windows
 * @param {{x: number, y: number}} point - Screen coordinates of the mouse
 */
function sendMousePositionToWindows(point) {
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
}

/**
 * Creates the system tray icon and menu
 */
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

/**
 * Updates the system tray context menu based on current state
 */
function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: isEnabled ? 'Disable' : 'Enable',
            click: toggleApp
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

/**
 * Toggles the application between enabled and disabled states
 */
function toggleApp() {
    isEnabled = !isEnabled;

    windows.forEach(({ win }) => {
        if (!win.isDestroyed()) {
            if (isEnabled) {
                win.show();
            } else {
                win.hide();
            }
        }
    });

    updateTrayMenu();
}

// Application initialization
app.whenReady().then(() => {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
        return;
    }

    app.on('second-instance', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'MouseTrail',
            message: 'MouseTrail is already running. Check your system tray.'
        });
    });

    createWindows();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindows();
        }
    });
});

// Prevent app from quitting when all windows are closed (background mode)
app.on('window-all-closed', () => {
    // Do nothing, keep running in background
});
