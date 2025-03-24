// Scene setup module

// Exports
export let scene;
export let camera;
export let renderer;
export let yaw = 0;
export let pitch = 0;
export const mouseSensitivity = 0.002;
export let isPointerLocked = false;
export let cameraDistance = 10;

// Need to make isPointerLocked writable from other modules
export function setPointerLock(value) {
    isPointerLocked = value;
}

export function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    
    // Set up camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, 10); // Start slightly above and behind player
    scene.add(camera);
    
    // Set up renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
}

// Helper function to calculate distance between two touch points
export function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Handle mouse movement for camera control
export function onMouseMove(event) {
    if (isPointerLocked) {
        yaw -= event.movementX * mouseSensitivity;
        pitch -= event.movementY * mouseSensitivity;
        
        // Clamp pitch to prevent flipping (e.g., -90° to 90° in radians)
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
}