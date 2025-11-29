const { ipcRenderer } = require('electron');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;

// "Target" is where the actual mouse is (from IPC)
let targetMouse = { x: -1000, y: -1000 };

// "Current" is where the light is (smoothed)
let currentMouse = { x: -1000, y: -1000 };

let lastRenderedMouse = { x: -1000, y: -1000 };

let trails = [];
const MAX_AGE = 15;
const BASE_RADIUS = 10;
let currentColor = 'cyan';
let initialized = false;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

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

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    if (!initialized) {
        requestAnimationFrame(animate);
        return;
    }

    // Increased smoothing: Lower factor = more lag/smoothness
    // Was 0.2, then 0.08, then 0.25. Now 0.12 for balance.
    currentMouse.x = lerp(currentMouse.x, targetMouse.x, 0.12);
    currentMouse.y = lerp(currentMouse.y, targetMouse.y, 0.12);

    const dx = currentMouse.x - lastRenderedMouse.x;
    const dy = currentMouse.y - lastRenderedMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
        // Denser interpolation: Smaller step size = smoother lines
        // Was 5, now 2
        const stepSize = 2;
        const steps = Math.ceil(dist / stepSize);

        for (let i = 0; i < steps; i++) {
            const t = (i + 1) / steps;
            const x = lastRenderedMouse.x + dx * t;
            const y = lastRenderedMouse.y + dy * t;

            trails.push({
                x: x,
                y: y,
                age: 0,
                color: currentColor
            });
        }

        lastRenderedMouse.x = currentMouse.x;
        lastRenderedMouse.y = currentMouse.y;
    } else {
        lastRenderedMouse.x = currentMouse.x;
        lastRenderedMouse.y = currentMouse.y;
    }

    // Draw trails
    for (let i = 0; i < trails.length; i++) {
        const p = trails[i];
        p.age++;

        if (p.age > MAX_AGE) {
            trails.splice(i, 1);
            i--;
            continue;
        }

        const life = 1 - (p.age / MAX_AGE);
        const radius = BASE_RADIUS * life;

        if (radius <= 0) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = life;

        ctx.shadowBlur = 10 * life;
        ctx.shadowColor = p.color;

        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    }

    requestAnimationFrame(animate);
}

animate();
