import { initScene, camera, renderer } from './scene.js';
import { initEnvironment } from './environment.js';
import { initPlayer, playerBody, balloons } from './entity.js';
import { initInputHandlers } from './input.js';
import { animate } from './physics.js';
import { initNPCs } from './entity.js';
import { createPortal, animatePortal, checkPortalCollision, teleportPlayer } from './portal.js';
import { initHUD } from './hud.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize scene and environment
    initScene();
    initEnvironment();
    initNPCs();
    
    // Initialize player and input handlers
    initPlayer();
    initInputHandlers();
    
    // Initialize HUD
    initHUD();
    
    // Create portal after the scene and environment are initialized
    createPortal(50, 15, -30);
    
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