import * as THREE from 'three'; 
import { initScene, camera, renderer } from './scene.js';
import { initEnvironment } from './environment.js';
import { initPlayer, playerBody, balloons } from './entity.js';
import { initInputHandlers } from './input.js';
import { animate } from './physics.js';
import { initNPCs } from './entity.js';
import { createPortal, animatePortal, checkPortalCollision } from './portal.js';
import { initHUD } from './hud.js';
import { initMultiplayer, updateMultiplayer, sendChatMessage } from './multiplayer.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize scene and environment
    initScene();
    initEnvironment();
    initNPCs();
    
    // Initialize player and input handlers
    const player = initPlayer();
    initInputHandlers();
    
    // Initialize multiplayer
    import('./multiplayer.js').then(({ initMultiplayer }) => {
        initMultiplayer(player);
    });
    
    // Initialize HUD
    initHUD();

    // --- Create Portals using Config Objects ---

    // Portal 1: Default Teleport (Vertical Torus)
    createPortal({
        position: { x: 50, y: 15, z: -30 },
        // rotation: { x: Math.PI / 2, y: 0, z: 0 }, // Default is vertical
        shape: 'torus',
        size: { radius: 3, thickness: 0.3 }, // Default torus size
        material: { color: 0x00FFFF, emissive: 0x00FFFF }, // Cyan color
        label: 'Vibeverse',
        activationRadius: 3,
        action: {
            type: 'teleportUrl' // Default action, URL is optional (uses DEFAULT_PORTAL_URL)
            // url: 'http://some.other.url' // Optional: override default URL
        }
    });

    /* --- Temporarily Commented Out Second Portal ---
    // Portal 2: Generate Zone (Horizontal Box)
    createPortal({
        position: { x: -40, y: 1, z: 40 }, // Lowered Y position
        rotation: { x: 0, y: Math.PI / 4, z: 0 }, // Flat on ground, slightly rotated
        shape: 'box',
        size: { width: 6, height: 0.2, depth: 6 }, // Flat square box
        material: { color: 0xFF00FF, emissive: 0xFF00FF, opacity: 0.6 }, // Magenta color
        label: 'Mystery Zone',
        activationRadius: 4, // Slightly larger activation
        action: {
            type: 'generateZone',
            theme: 'Purple Swamp',
            zonePosition: { x: 5000, y: 0, z: 5000 } // Position for the generated zone
            // seed: 12345 // Optional: specific seed
        }
    });
    */

    
    // Check if player entered through another portal
    checkForPortalEntry();
    
    // Start the animation loop
    animate();
    
    // Handle window resize
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});

// Function to check if player came from another game
function checkForPortalEntry() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('ref')) {
        // Player came from another game
        const username = urlParams.get('username') || 'Player';
        const color = urlParams.get('color') || 'red';
        const speed = parseFloat(urlParams.get('speed')) || 5;
        const referringGame = urlParams.get('ref');
        
        console.log(`Player ${username} entered from ${referringGame}`);
        
        // Create a return portal
        createPortal(-50, 15, -30, referringGame, "Return Portal");
    }
}
