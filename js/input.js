import { renderer, isPointerLocked, getTouchDistance, onMouseMove, setPointerLock } from './scene.js';
import { releaseBalloon, popBalloon } from './balloon.js';

// Keys state
export const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false
};

export const keysPressed = {
    q: false,
    e: false
};

export let cameraDistance = 10;
export let initialTouchDistance = 0;

// Initialize all input handlers
export function initInputHandlers() {
    setupKeyboardHandlers();
    setupMouseHandlers();
    setupTouchHandlers();
    setupPointerLock();
}

// Setup keyboard input handlers
function setupKeyboardHandlers() {
    // Key down event
    window.addEventListener("keydown", (event) => {
        switch (event.key.toLowerCase()) {
            case "w":
                keys.w = true;
                break;
            case "a":
                keys.a = true;
                break;
            case "s":
                keys.s = true;
                break;
            case "d":
                keys.d = true;
                break;
            case " ":
                keys.space = true;
                break;
            case "shift":
                keys.shift = true;
                break;
            case "r": // Release a balloon (player control)
                releaseBalloon();
                break;
            case "p": // Pop a balloon (for testing)
                popBalloon();
                break;
            case "q":
                keysPressed.q = true;
                break;
            case "e":
                keysPressed.e = true;
                break;
        }
    });
    
    // Key up event
    window.addEventListener("keyup", (event) => {
        switch (event.key.toLowerCase()) {
            case "w":
                keys.w = false;
                break;
            case "a":
                keys.a = false;
                break;
            case "s":
                keys.s = false;
                break;
            case "d":
                keys.d = false;
                break;
            case " ":
                keys.space = false;
                break;
            case "shift":
                keys.shift = false;
                break;
            case "q":
                keysPressed.q = false;
                break;
            case "e":
                keysPressed.e = false;
                break;
        }
    });
}

// Setup mouse scroll handlers for zoom
function setupMouseHandlers() {
    window.addEventListener(
        "wheel",
        (event) => {
            // Prevent default browser zooming
            event.preventDefault();
            
            // Adjust camera distance based on scroll direction
            cameraDistance += event.deltaY * 0.05;
            
            // Limit how close and far the camera can be
            cameraDistance = Math.max(5, Math.min(50, cameraDistance));
        },
        { passive: false }
    );
}

// Setup touch handlers for mobile devices
function setupTouchHandlers() {
    window.addEventListener("touchstart", (event) => {
        if (event.touches.length === 2) {
            // Two fingers are touching the screen
            initialTouchDistance = getTouchDistance(event.touches);
        }
    });
    
    window.addEventListener("touchmove", (event) => {
        if (event.touches.length === 2) {
            // Two fingers are moving on the screen
            const currentDistance = getTouchDistance(event.touches);
            const deltaDistance = initialTouchDistance - currentDistance;
            
            // Adjust camera distance based on pinch movement
            cameraDistance += deltaDistance * 0.05;
            cameraDistance = Math.max(5, Math.min(50, cameraDistance));
            
            // Update initial distance for next move
            initialTouchDistance = currentDistance;
            
            // Prevent default behavior like page zooming
            event.preventDefault();
        }
    });
}

// Setup pointer lock for camera control
function setupPointerLock() {
    renderer.domElement.addEventListener("click", () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener("pointerlockchange", () => {
        const locked = document.pointerLockElement === renderer.domElement;
        setPointerLock(locked);
        const infoElement = document.getElementById("info");
        if (locked) {
            infoElement.textContent = "3D Balloon Fight Physics Demo - Press ESC to release mouse";
            document.addEventListener("mousemove", onMouseMove);
        } else {
            infoElement.textContent = "3D Balloon Fight Physics Demo - Click to control camera";
            document.removeEventListener("mousemove", onMouseMove);
        }
    });
    
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isPointerLocked) {
            document.exitPointerLock();
        }
    });
}
