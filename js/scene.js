// Scene setup module
import * as THREE from 'three';

// Exports
export let scene;
export let camera;
export let renderer;
export let yaw = 0;
export let pitch = 0;
export const mouseSensitivity = 0.005;
export let isPointerLocked = false;
export let cameraDistance = 10;

// Need to make isPointerLocked writable from other modules
export function setPointerLock(value) {
    isPointerLocked = value;
}

export function initScene() {
    // Create scene
    scene = new THREE.Scene();

    // Create a skybox with a gradient
    const skyShader = {
        uniforms: {
            topColor: { value: new THREE.Color(0x87CEEB) }, // Light sky blue at top
            bottomColor: { value: new THREE.Color(0xE6F0FA) }, // Pale blue at bottom
            offset: { value: 0 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                float t = max(pow(max(h, 0.0), exponent), 0.0);
                gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
            }
        `
    };

    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: skyShader.uniforms,
        vertexShader: skyShader.vertexShader,
        fragmentShader: skyShader.fragmentShader,
        side: THREE.BackSide
    });

    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);

    // Add fog for depth (already present, just confirming)
    scene.fog = new THREE.Fog(0x87CEEB, 50, 500);

    // Set up camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, 10);
    scene.add(camera);
    
    // Set up renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    document.body.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 150, 100); // Higher and more angled
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -300;
    directionalLight.shadow.camera.right = 300;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
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
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
}