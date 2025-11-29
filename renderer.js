const { ipcRenderer } = require('electron');

// Configuration constants
const CONFIG = {
    /** Maximum age of a trail particle before it's removed */
    MAX_AGE: 15,
    /** Base radius of trail particles in pixels */
    BASE_RADIUS: 10,
    /** Smoothing factor for mouse position interpolation (0-1, lower = smoother) */
    SMOOTHING_FACTOR: 0.12,
    /** Distance between interpolated trail points */
    STEP_SIZE: 2,
    /** Minimum movement distance to create new trail points */
    MIN_MOVEMENT_THRESHOLD: 1,
    /** Shadow blur multiplier for glow effect */
    SHADOW_BLUR_MULTIPLIER: 10,
    /** Default color for trail particles */
    DEFAULT_COLOR: 'cyan',
    /** Initial position for offscreen elements */
    OFFSCREEN_POSITION: -1000
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;

/** Target mouse position from IPC (actual cursor location) */
let targetMouse = { x: CONFIG.OFFSCREEN_POSITION, y: CONFIG.OFFSCREEN_POSITION };

/** Current smoothed mouse position for rendering */
let currentMouse = { x: CONFIG.OFFSCREEN_POSITION, y: CONFIG.OFFSCREEN_POSITION };

/** Last rendered mouse position for trail interpolation */
let lastRenderedMouse = { x: CONFIG.OFFSCREEN_POSITION, y: CONFIG.OFFSCREEN_POSITION };

/** Array of active trail particles */
let trails = [];

/** Current trail color */
let currentColor = CONFIG.DEFAULT_COLOR;

/** Whether the renderer has been initialized with first mouse position */
let initialized = false;

/**
 * Resizes the canvas to match window dimensions
 */
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

/**
 * Handles incoming mouse position updates from the main process
 */
ipcRenderer.on('mouse-move', (event, point) => {
    targetMouse.x = point.x;
    targetMouse.y = point.y;
    if (point.color) {
        currentColor = point.color;
    }

    if (!initialized) {
        currentMouse.x = targetMouse.x;
        currentMouse.y = targetMouse.y;
        lastRenderedMouse.x = currentMouse.x;
        lastRenderedMouse.y = currentMouse.y;
        initialized = true;
    }
});

/**
 * Linear interpolation between two values
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @param {number} amount - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(start, end, amount) {
    return (1 - amount) * start + amount * end;
}

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
 * Updates the smoothed mouse position using linear interpolation
 */
function updateMousePosition() {
    currentMouse.x = lerp(currentMouse.x, targetMouse.x, CONFIG.SMOOTHING_FACTOR);
    currentMouse.y = lerp(currentMouse.y, targetMouse.y, CONFIG.SMOOTHING_FACTOR);
}

/**
 * Adds interpolated trail points between last and current mouse position
 */
function addTrailPoints() {
    const dx = currentMouse.x - lastRenderedMouse.x;
    const dy = currentMouse.y - lastRenderedMouse.y;
    const dist = calculateDistance(dx, dy);

    if (dist > CONFIG.MIN_MOVEMENT_THRESHOLD) {
        const steps = Math.ceil(dist / CONFIG.STEP_SIZE);

        for (let i = 0; i < steps; i++) {
            const t = (i + 1) / steps;
            trails.push({
                x: lastRenderedMouse.x + dx * t,
                y: lastRenderedMouse.y + dy * t,
                age: 0,
                color: currentColor
            });
        }
    }

    lastRenderedMouse.x = currentMouse.x;
    lastRenderedMouse.y = currentMouse.y;
}

/**
 * Updates trail ages and removes expired particles
 * Uses filter for efficient batch removal
 */
function updateTrails() {
    // Increment age for all particles
    for (const particle of trails) {
        particle.age++;
    }
    // Filter out expired particles in a single pass
    trails = trails.filter(particle => particle.age <= CONFIG.MAX_AGE);
}

/**
 * Renders a single trail particle
 * @param {{x: number, y: number, age: number, color: string}} particle - Trail particle to render
 */
function renderParticle(particle) {
    const life = 1 - (particle.age / CONFIG.MAX_AGE);
    const radius = CONFIG.BASE_RADIUS * life;

    if (radius <= 0) return;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);

    ctx.fillStyle = particle.color;
    ctx.globalAlpha = life;

    ctx.shadowBlur = CONFIG.SHADOW_BLUR_MULTIPLIER * life;
    ctx.shadowColor = particle.color;

    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
}

/**
 * Main animation loop - clears canvas, updates positions, and renders trails
 */
function animate() {
    ctx.clearRect(0, 0, width, height);

    if (!initialized) {
        requestAnimationFrame(animate);
        return;
    }

    updateMousePosition();
    addTrailPoints();
    updateTrails();

    // Render all trail particles
    for (const particle of trails) {
        renderParticle(particle);
    }

    requestAnimationFrame(animate);
}

animate();
