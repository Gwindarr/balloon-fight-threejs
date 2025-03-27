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
export let isMobileDevice = false;
let joystick = null;

// Initialize all input handlers
export function initInputHandlers() {
    // Check if it's a mobile device
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
        document.getElementById('mobile-controls').style.display = 'block';
        document.getElementById('controls').style.display = 'none';
        setupMobileControls();
    }
    
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

// Setup nipplejs mobile controls
function setupMobileControls() {
    // Create joystick
    const joystickZone = document.getElementById('joystick-zone');
    // Use the global nipplejs object instead of importing it
    joystick = window.nipplejs.create({
        zone: joystickZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 120,
        lockX: false,
        lockY: false
    });
    
    // Joystick move event
    joystick.on('move', (evt, data) => {
        // Reset movement keys
        keys.w = false;
        keys.a = false;
        keys.s = false;
        keys.d = false;
        
        // Convert joystick angle to directional keys
        const angle = data.angle.radian;
        const force = Math.min(1, data.force);
        
        // Only trigger movement if force is above threshold
        if (force > 0.2) {
            // Determine direction based on angle
            if (angle >= 0 && angle < Math.PI/4 || angle >= 7*Math.PI/4 && angle < 2*Math.PI) {
                // Right
                keys.d = true;
            } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
                // Up
                keys.w = true;
            } else if (angle >= 3*Math.PI/4 && angle < 5*Math.PI/4) {
                // Left
                keys.a = true;
            } else if (angle >= 5*Math.PI/4 && angle < 7*Math.PI/4) {
                // Down
                keys.s = true;
            }
            
            // Diagonal directions
            if (angle >= Math.PI/8 && angle < 3*Math.PI/8) {
                // Up-Right
                keys.w = true;
                keys.d = true;
            } else if (angle >= 3*Math.PI/8 && angle < 5*Math.PI/8) {
                // Up-Left
                keys.w = true;
                keys.a = true;
            } else if (angle >= 5*Math.PI/8 && angle < 7*Math.PI/8) {
                // Down-Left
                keys.s = true;
                keys.a = true;
            } else if (angle >= 7*Math.PI/8 && angle < 9*Math.PI/8) {
                // Down-Right
                keys.s = true;
                keys.d = true;
            }
        }
    });
    
    // Joystick end event
    joystick.on('end', () => {
        // Stop all movement when joystick is released
        keys.w = false;
        keys.a = false;
        keys.s = false;
        keys.d = false;
    });
    
    // Jump button event
    const jumpButton = document.getElementById('jump-button');
    
    // Use both touchstart and mousedown for better responsiveness
    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.space = true;
    });
    
    jumpButton.addEventListener('touchend', () => {
        keys.space = false;
    });
    
    // Action button event (release balloon)
    const actionButton = document.getElementById('action-button');
    
    actionButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        releaseBalloon();
    });
}

// Setup pointer lock for camera control
function setupPointerLock() {
    // Skip pointer lock setup on mobile devices
    if (isMobileDevice) {
        return;
    }
    
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
