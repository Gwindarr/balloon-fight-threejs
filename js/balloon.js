import * as THREE from 'three';
import { scene } from './scene.js';
import { playerBody, balloons } from './entity.js';
import { Player } from './entity.js';
import { createPopEffect } from './effects.js';

// Exports
export const releasedBalloons = [];
export const detachedBalloons = [];

// Function to pop a balloon
export function popBalloon() {
    if (balloons.length > 0) {
        try {
            const balloon = balloons.pop();
            
            // Get world position before removing from parent
            const worldPosition = new THREE.Vector3();
            balloon.getWorldPosition(worldPosition);
            
            // Remove balloon from player
            playerBody.remove(balloon);
            
            // Create pop effect at the world position
            createPopEffect(worldPosition);
            
            // Play pop sound
            // playSound("balloon_pop", 0.4);
            
            // Optional: Add temporary invincibility after losing a balloon
            if (playerBody && playerBody.userData) {
                playerBody.userData.invincibleTime = 60; // 60 frames of invincibility
            }
            
            console.log("Balloon popped! Remaining balloons:", balloons.length);
        } catch (error) {
            console.error("Error in popBalloon:", error);
        }
    } else {
        console.log("No balloons to pop!");
    }
}

// Function to release a balloon
export function releaseBalloon() {
    // Make sure player has at least one balloon
    if (balloons.length > 0) {
        // Get the last balloon in the array
        const releasedBalloon = balloons.pop();
        
        // Get balloon's current world position before removing
        const worldPosition = new THREE.Vector3();
        releasedBalloon.getWorldPosition(worldPosition);
        
        // Remove balloon from player
        playerBody.remove(releasedBalloon);
        
        // Add balloon to scene as a separate object
        scene.add(releasedBalloon);
        
        // Set balloon's position in world space
        releasedBalloon.position.copy(worldPosition);
        
        // Give the released balloon some velocity
        releasedBalloon.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05, // Small random X velocity
            0.15 + Math.random() * 0.05, // Increased upward velocity
            (Math.random() - 0.5) * 0.05 // Small random Z velocity
        );
        
        // Add balloon to a list of released balloons to update
        releasedBalloons.push(releasedBalloon);
        
        // Give player a small upward boost when releasing a balloon
        // This helps prevent sudden drops when releasing balloons
        if (playerBody.userData.velocity) {
            const currentVelocity = playerBody.userData.velocity.y;
            const minVelocity = 0.08 + (0.02 * balloons.length); // Scales with remaining balloons
            playerBody.userData.velocity.y = Math.max(currentVelocity, minVelocity);
        }
        
        // Play a balloon release sound
        // const releaseSound = new Audio("path/to/pop-sound.mp3"); // Add a sound file
        // releaseSound.volume = 0.3;
        // releaseSound.play();
        
        // Update physics behavior based on new balloon count
        console.log(`Released a balloon! ${balloons.length} balloons remaining.`);
    }
}

// Update released balloons
export function updateReleasedBalloons(delta = 1/60) {
    for (let i = releasedBalloons.length - 1; i >= 0; i--) {
        const balloon = releasedBalloons[i];
        if (!balloon || !balloon.userData || !balloon.userData.velocity) {
            releasedBalloons.splice(i, 1);
            continue;
        }
        
        // Update balloon position based on its velocity
        balloon.position.add(balloon.userData.velocity);
        
        // Make the balloon rise and wobble a bit
        balloon.userData.velocity.y += 0.001 * delta * 60;
        balloon.userData.velocity.x += (Math.random() - 0.5) * 0.001 * delta * 60;
        balloon.userData.velocity.z += (Math.random() - 0.5) * 0.001 * delta * 60;
        
        // Rotate the balloon slightly for visual effect
        balloon.rotation.y += 0.01 * delta * 60;
        
        // Remove balloons that go too high
        if (balloon.position.y > 200) {
            scene.remove(balloon);
            releasedBalloons.splice(i, 1);
        }
    }
}

// Update detached balloons
export function updateDetachedBalloons(delta = 1/60) {
    for (let i = detachedBalloons.length - 1; i >= 0; i--) {
        const balloon = detachedBalloons[i];
        if (!balloon || !balloon.userData || !balloon.userData.velocity) {
            detachedBalloons.splice(i, 1);
            continue;
        }
        
        balloon.position.add(balloon.userData.velocity);
        balloon.userData.velocity.y += 0.001 * delta * 60;
        if (balloon.position.y > 50) {
            scene.remove(balloon);
            detachedBalloons.splice(i, 1);
        }
    }
}
