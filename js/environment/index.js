import * as THREE from 'three';
import { scene } from '../scene.js'; // Assuming scene is still needed globally or passed around

// Import creation functions and state from modules
import { createGround, ground, groundSize } from './ground.js';
import { createWater, updateWater, water } from './water.js';
import { createStaticPlatforms, platforms as staticPlatforms } from './platforms.js';
import { createMovingPlatforms, updateMovingPlatforms, movingPlatforms } from './movingPlatforms.js';
import { createCloudPlatforms, updateCloudPlatforms, checkCloudPlatformCollisions, cloudPlatforms } from './cloudPlatforms.js';
// Removed boost mushroom import
import { createScenery, updateScenery, heightMarkerClouds } from './scenery.js';
import { createHeightMarkers } from './heightMarkers.js';

// --- Exported State (Re-exporting from modules where necessary) ---
// Removed boostMushrooms and triggerMushroomBounce from export
export { ground, groundSize, water, movingPlatforms, cloudPlatforms, heightMarkerClouds, checkCloudPlatformCollisions };

// Combined list of all collidable platforms
export let allPlatforms = [];

// --- Initialization ---

export function initEnvironment() {
    createGround();
    createWater();

    // Create different types of platforms and combine them
    const createdStaticPlatforms = createStaticPlatforms();
    const createdMovingPlatforms = createMovingPlatforms();
    const createdCloudPlatforms = createCloudPlatforms();

    // Combine all platform types into a single array for collision detection, etc.
    allPlatforms = [
        ...createdStaticPlatforms,
        ...createdMovingPlatforms,
        ...createdCloudPlatforms
    ];

    // Make platforms accessible globally for collision system (consider refactoring this later)
    window.environmentPlatforms = allPlatforms;

    // Removed createBoostPads() call
    // Removed window.boostMushrooms assignment

    createScenery(); // Includes mountains, forests, ocean, non-collidable clouds
    createHeightMarkers();

    console.log("Environment initialized with separate modules.");
    console.log("Total collidable platforms:", allPlatforms.length);
    // Removed console log for boostMushrooms
}

// --- Update Loop ---

export function updateEnvironment(deltaTime, player) { // Pass deltaTime and player if needed by updates
    updateWater();
    updateMovingPlatforms(); // Update moving platforms positions/rotations
    updateCloudPlatforms(); // Update cloud fading logic
    // Removed updateBoostMushrooms() call
    updateScenery(); // Update ocean waves, rain, lightning, forest animations

    // Note: checkCloudPlatformCollisions might need to be called elsewhere,
    // possibly within the physics or player update loop, depending on dependencies.
    // If it depends on the player's state *after* physics updates, it shouldn't be here.
    // For now, keeping the structure similar to the original.
    if (player) {
         checkCloudPlatformCollisions(player);
    }
}
