import * as THREE from 'three';
import { scene } from '../scene.js';

export let cloudPlatforms = []; // Array for cloud platforms

// Create cloud platforms (collidable)
export function createCloudPlatforms() {
    const createdPlatforms = [];
    // Create cloud platforms at various heights and positions
    for (let i = 0; i < 20; i++) {
        // Random position
        const x = (Math.random() - 0.5) * 150;
        const y = 20 + Math.random() * 80; // Between 20 and 100 units high
        const z = (Math.random() - 0.5) * 150;

        // Create cloud platform
        const cloudPlatform = createCloudPlatform(x, y, z);
        createdPlatforms.push(cloudPlatform);
    }
    cloudPlatforms = createdPlatforms; // Assign to exported array
    return createdPlatforms; // Return for combining
}

// Create a single cloud platform
function createCloudPlatform(x, y, z) {
    // Create a group for the cloud platform
    const cloudPlatform = new THREE.Group();
    cloudPlatform.position.set(x, y, z);

    // Create the collision box (invisible)
    const boxGeometry = new THREE.BoxGeometry(10, 1, 10);
    const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0 // Invisible
    });
    const collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
    collisionBox.position.y = 0;
    cloudPlatform.add(collisionBox);

    // Create cloud parts (visible)
    const cloudMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
    });

    // Create several spheres to form a cloud
    const cloudParts = [];
    for (let i = 0; i < 8; i++) {
        const radius = 2 + Math.random() * 2;
        const cloudPartGeometry = new THREE.SphereGeometry(radius, 8, 8);
        const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudMaterial);

        // Position each part to form a platform-like shape
        const angle = (i / 8) * Math.PI * 2;
        const distance = 3 + Math.random() * 2;
        cloudPart.position.set(
            Math.cos(angle) * distance,
            -0.5 + Math.random() * 1, // Slightly varied height
            Math.sin(angle) * distance
        );
        cloudPlatform.add(cloudPart);
        cloudParts.push(cloudPart);
    }

    // Add a few more in the center
    for (let i = 0; i < 3; i++) {
        const radius = 3 + Math.random() * 2;
        const cloudPartGeometry = new THREE.SphereGeometry(radius, 8, 8);
        const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudMaterial);
        cloudPart.position.set(
            (Math.random() - 0.5) * 3,
            -0.5 + Math.random() * 1,
            (Math.random() - 0.5) * 3
        );
        cloudPlatform.add(cloudPart);
        cloudParts.push(cloudPart);
    }

    // Add cloud platform properties
    cloudPlatform.userData = {
        type: 'platform_cloud',
        lastPosition: new THREE.Vector3().copy(cloudPlatform.position),
        fadeTimer: 0, // Timer for fading
        isFading: false, // Flag to indicate if cloud is fading
        cloudParts: cloudParts, // Reference to cloud parts for fading
        originalOpacity: 0.9, // Original opacity
        fadeTime: 60, // Frames to fade (1 second at 60fps)
        collisionBox: collisionBox, // Reference to collision box
        isStoodOn: false // Flag to track if player is currently on it
    };

    scene.add(cloudPlatform);
    return cloudPlatform;
}

// Update function for cloud platforms
export function updateCloudPlatforms() {
    if (cloudPlatforms && cloudPlatforms.length > 0) {
        for (let i = cloudPlatforms.length - 1; i >= 0; i--) {
            const cloud = cloudPlatforms[i];

            // Store current position for physics calculations
            if (!cloud.userData.lastPosition) {
                cloud.userData.lastPosition = new THREE.Vector3();
            }
            cloud.userData.lastPosition.copy(cloud.position);

            // Check if cloud is being stood on
            if (cloud.userData.isStoodOn && !cloud.userData.isFading) {
                // Start fading
                cloud.userData.isFading = true;
                cloud.userData.fadeTimer = cloud.userData.fadeTime;

                // Log for debugging
                // console.log("Cloud platform being stood on, starting to fade");
            }

            // Update fading
            if (cloud.userData.isFading) {
                cloud.userData.fadeTimer--;

                // Calculate new opacity
                const newOpacity = (cloud.userData.fadeTimer / cloud.userData.fadeTime) * cloud.userData.originalOpacity;

                // Apply to all cloud parts
                for (const part of cloud.userData.cloudParts) {
                    part.material.opacity = newOpacity;
                }

                // If timer is up, remove the cloud
                if (cloud.userData.fadeTimer <= 0) {
                    // Remove from scene
                    scene.remove(cloud);

                    // Remove from cloudPlatforms array
                    cloudPlatforms.splice(i, 1);

                    // Remove from environmentPlatforms (this needs to be handled in the main update loop)
                    const index = window.environmentPlatforms.indexOf(cloud);
                    if (index !== -1) {
                        window.environmentPlatforms.splice(index, 1);
                    }

                    // Log for debugging
                    // console.log("Cloud platform faded away and removed");

                    // Create a new cloud platform to replace it
                    const x = (Math.random() - 0.5) * 150;
                    const y = 20 + Math.random() * 80;
                    const z = (Math.random() - 0.5) * 150;

                    const newCloud = createCloudPlatform(x, y, z);
                    cloudPlatforms.push(newCloud);
                    window.environmentPlatforms.push(newCloud); // Add to global list

                    // Log for debugging
                    // console.log("New cloud platform created");
                }
            }
        }
    }
}

// Function to check if a player is standing on a cloud platform
export function checkCloudPlatformCollisions(player) {
    // Reset all cloud platforms' isStoodOn flag
    for (const cloud of cloudPlatforms) {
        cloud.userData.isStoodOn = false;
    }

    // Check if player is on a cloud platform
    if (player.userData.currentPlatform) {
        const platform = player.userData.currentPlatform;

        // Check if it's a cloud platform
        if (platform.userData.type === 'platform_cloud') {
            platform.userData.isStoodOn = true;
        }
    }
}
