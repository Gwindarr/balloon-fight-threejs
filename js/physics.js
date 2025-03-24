import { scene, camera, renderer, yaw, pitch, isPointerLocked } from './scene.js';
import { playerBody, playerVelocity, shadow, balloons, GRAVITY, BALLOON_BUOYANCY, AIR_RESISTANCE, MAX_VELOCITY, leftArm, rightArm } from './player.js';
import { allPlayers, checkBalloonCollisions, updatePlayers } from './player.js';
import * as PlayerModule from './player.js';
import * as Player from './player.js';
import { keys, keysPressed, cameraDistance } from './input.js';
import { platforms } from './environment.js';
import { updateReleasedBalloons, updateDetachedBalloons, popBalloon } from './balloon.js';
import { createPopEffect, updatePopEffects } from './effects.js';
import { updateNPCs, npcs } from './npc.js';
import { animatePortal, checkPortalCollision, teleportPlayer } from './portal.js';

// Constants for physics calculations
const BOUNDARY_X = 200;
const BOUNDARY_Z = 200;
const BOUNCE_FACTOR = 0.3; // Bounce back with 30% of velocity
const VERTICAL_DRAG = 0.98;

let isOnSurface = false; 

let isFlapping = false;
let flapTime = 0;
const FLAP_FORCE = 0.13;

// Wind variables
let windForce = new THREE.Vector2(0, 0);
let windTimer = 0;
const WIND_STRENGTH = 0.00;
const WIND_CHANGE_RATE = 0.01;

// Animation loop
export function animate() {
    requestAnimationFrame(animate);
    
    updatePlayerPhysics();
    updateCollisions();
    updatePlayerShadow();
    updatePlayers();
    updateEffects();
    updateCameraPosition();
    checkBalloonCollisions();

    // Animate portal
    animatePortal();
    
    // Check for portal collision
    if (checkPortalCollision(playerBody.position)) {
        teleportPlayer();
    }
    
    renderer.render(scene, camera);
}

function updateWind() {
    // Wind disabled for now
    return;
    // Gradually change wind over time
    windTimer += WIND_CHANGE_RATE;
    windForce.x = Math.sin(windTimer) * WIND_STRENGTH;
    windForce.y = Math.cos(windTimer * 0.7) * WIND_STRENGTH;
    
    // Apply wind to player (more effect with more balloons)
    if (balloons.length > 0) {
        playerVelocity.x += windForce.x * balloons.length * 0.5;
        playerVelocity.z += windForce.y * balloons.length * 0.5;
    }
}

// Update player physics
function updatePlayerPhysics() {
    // Calculate buoyancy based on number of balloons
    const buoyancy = BALLOON_BUOYANCY * balloons.length;
    
    // Apply gravity and buoyancy - ensure net downward force
    playerVelocity.y -= GRAVITY;
    playerVelocity.y += buoyancy;
    
    // Apply vertical drag to prevent excessive speeds
    if (Math.abs(playerVelocity.y) > 0.1) {
        playerVelocity.y *= VERTICAL_DRAG;
    }

    // Update wind effect
    updateWind();
    
    // Ensure player always falls slightly when not flapping
    if (!isFlapping && playerVelocity.y > 0.01) {
        playerVelocity.y *= 0.9; // Dampen upward velocity
    }
    
    // Jump/Flap logic
    if (keys.space) {
        if (isOnSurface) {
            // Jump when on surface (ground or platform)
            const jumpForce = 0.2; // Higher than flap force
            playerVelocity.y = jumpForce;
            
            // Extra boost with balloons
            if (balloons.length > 0) {
                playerVelocity.y += 0.05 * balloons.length;
            }
            
            // Jump animation
            leftArm.rotation.z = Math.PI / 2;
            rightArm.rotation.z = -Math.PI / 2;
            
            // Set a timeout to reset arms if not flapping
            setTimeout(() => {
                if (!isFlapping) {
                    leftArm.rotation.z = Math.PI / 4;
                    rightArm.rotation.z = -Math.PI / 4;
                }
            }, 300);
            
            isOnSurface = false; // No longer on surface
        }
        else if (!isFlapping) {
            // Regular mid-air flapping
            playerVelocity.y += FLAP_FORCE;
            isFlapping = true;
            flapTime = 0;
            
            // Animate arms flapping
            leftArm.rotation.z = Math.PI / 2;
            rightArm.rotation.z = -Math.PI / 2;
        }
    }
    
    // Make flapping reset faster to allow rapid flapping like in original game
    if (isFlapping) {
        flapTime += 2;
        if (flapTime > 10) { // Shorter flap animation
            isFlapping = false;
            leftArm.rotation.z = Math.PI / 4;
            rightArm.rotation.z = -Math.PI / 4;
        }
    }
    
    // Movement controls aligned with camera direction when pointer locked
    if (isPointerLocked) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
            camera.quaternion
        );
        forward.y = 0; // Keep movement horizontal
        forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
            camera.quaternion
        );
        right.y = 0;
        right.normalize();
        
        if (keys.w)
            playerVelocity.add(forward.multiplyScalar(0.015)); // MOVEMENT_FORCE
        if (keys.s)
            playerVelocity.add(forward.multiplyScalar(-0.015)); // MOVEMENT_FORCE
        if (keys.a)
            playerVelocity.add(right.multiplyScalar(-0.015)); // MOVEMENT_FORCE
        if (keys.d)
            playerVelocity.add(right.multiplyScalar(0.015)); // MOVEMENT_FORCE
    } else {
        // Fallback movement when not locked
        if (keys.w) playerVelocity.z -= 0.015; // MOVEMENT_FORCE
        if (keys.s) playerVelocity.z += 0.015; // MOVEMENT_FORCE
        if (keys.a) playerVelocity.x -= 0.015; // MOVEMENT_FORCE
        if (keys.d) playerVelocity.x += 0.015; // MOVEMENT_FORCE
    }
    
    // Apply air resistance
    playerVelocity.multiplyScalar(AIR_RESISTANCE);
    
    // Limit maximum velocity
    if (playerVelocity.length() > MAX_VELOCITY) {
        playerVelocity.normalize().multiplyScalar(MAX_VELOCITY);
    }
    
    // Update player position
    playerBody.position.add(playerVelocity);
}

// Check collisions and apply physics response
function updateCollisions() {
    // Ground collision with proper offset
    if (playerBody.position.y < 1) { // 1 is half height of player
        playerBody.position.y = 1;
        playerVelocity.y = 0;
    }
    
    // Platform collision handling
    handleCollisions();
    
    // Update water collision with proper physics
    if (playerBody.position.z > 0 && playerBody.position.y < 1.2) {
        // Water "pushes" player up slightly
        playerBody.position.y = Math.max(playerBody.position.y, 1.2);
        
        // Apply water resistance - stronger than air
        playerVelocity.multiplyScalar(0.92);
        
        // Apply small upward force (buoyancy)
        playerVelocity.y += 0.005;
    }
    
    // World boundaries with proper bounce
    if (playerBody.position.x < -BOUNDARY_X) {
        playerBody.position.x = -BOUNDARY_X;
        playerVelocity.x = -playerVelocity.x * BOUNCE_FACTOR; // Bounce
    } else if (playerBody.position.x > BOUNDARY_X) {
        playerBody.position.x = BOUNDARY_X;
        playerVelocity.x = -playerVelocity.x * BOUNCE_FACTOR; // Bounce
    }
    
    if (playerBody.position.z < -BOUNDARY_Z) {
        playerBody.position.z = -BOUNDARY_Z;
        playerVelocity.z = -playerVelocity.z * BOUNCE_FACTOR; // Bounce
    } else if (playerBody.position.z > BOUNDARY_Z) {
        playerBody.position.z = BOUNDARY_Z;
        playerVelocity.z = -playerVelocity.z * BOUNCE_FACTOR; // Bounce
    }
    
    // Check for player-to-player collisions
}

function handleCollisions() {
    // Reset surface detection at start of collision checks
    isOnSurface = false;
    
    // Ground collision
    if (playerBody.position.y < 1) {
        playerBody.position.y = 1;
        playerVelocity.y = 0;
        isOnSurface = true;
    }
    
    // Water collision
    if (playerBody.position.z > 0 && playerBody.position.y < 1.2) {
        playerBody.position.y = Math.max(playerBody.position.y, 1.2);
        playerVelocity.multiplyScalar(0.92);
        playerVelocity.y += 0.005;
    }
    
    // World boundaries
    if (playerBody.position.x < -BOUNDARY_X) {
        playerBody.position.x = -BOUNDARY_X;
        playerVelocity.x = -playerVelocity.x * BOUNCE_FACTOR;
    } else if (playerBody.position.x > BOUNDARY_X) {
        playerBody.position.x = BOUNDARY_X;
        playerVelocity.x = -playerVelocity.x * BOUNCE_FACTOR;
    }
    
    if (playerBody.position.z < -BOUNDARY_Z) {
        playerBody.position.z = -BOUNDARY_Z;
        playerVelocity.z = -playerVelocity.z * BOUNCE_FACTOR;
    } else if (playerBody.position.z > BOUNDARY_Z) {
        playerBody.position.z = BOUNDARY_Z;
        playerVelocity.z = -playerVelocity.z * BOUNCE_FACTOR;
    }
    
    // Handle platform collisions
    handlePlatformCollisions();
    
    // Handle player-to-player collisions
    handlePlayerCollisions();
}

// Break up the function into more manageable pieces:
function handlePlatformCollisions() {
    const playerRadius = 0.6;
    const playerBottom = playerBody.position.y - 1;
    const playerTop = playerBody.position.y + 1;
    
    for (const platform of platforms) {
        const bbox = new THREE.Box3().setFromObject(platform);
        
        const playerMinX = playerBody.position.x - playerRadius;
        const playerMaxX = playerBody.position.x + playerRadius;
        const playerMinZ = playerBody.position.z - playerRadius;
        const playerMaxZ = playerBody.position.z + playerRadius;
        
        if (
            playerMaxX >= bbox.min.x && playerMinX <= bbox.max.x &&
            playerMaxZ >= bbox.min.z && playerMinZ <= bbox.max.z &&
            playerTop >= bbox.min.y && playerBottom <= bbox.max.y
        ) {
            // Landing on top
            if (
                playerBottom <= bbox.max.y + 0.3 &&
                playerBottom >= bbox.max.y - 0.1 &&
                playerVelocity.y <= 0
            ) {
                playerBody.position.y = bbox.max.y + 1;
                playerVelocity.y = 0;
                isOnSurface = true; // Set this here once only
                continue;
            }
            
            // Hitting bottom
            if (
                playerTop >= bbox.min.y - 0.3 &&
                playerTop <= bbox.min.y + 0.1 &&
                playerVelocity.y > 0
            ) {
                playerBody.position.y = bbox.min.y - 1;
                playerVelocity.y = 0;
                continue;
            }
            
            // Side collision
            const penRight = bbox.max.x - playerMinX;
            const penLeft = playerMaxX - bbox.min.x;
            const penFront = bbox.max.z - playerMinZ;
            const penBack = playerMaxZ - bbox.min.z;
            
            const minPen = Math.min(penRight, penLeft, penFront, penBack);
            
            if (minPen === penRight) {
                playerBody.position.x = bbox.max.x + playerRadius;
                playerVelocity.x = 0;
            } else if (minPen === penLeft) {
                playerBody.position.x = bbox.min.x - playerRadius;
                playerVelocity.x = 0;
            } else if (minPen === penFront) {
                playerBody.position.z = bbox.max.z + playerRadius;
                playerVelocity.z = 0;
            } else if (minPen === penBack) {
                playerBody.position.z = bbox.min.z - playerRadius;
                playerVelocity.z = 0;
            }
        }
    }
}

function handlePlayerCollisions() {
    const otherPlayers = Player.allPlayers || npcs || [];
    
    for (const otherPlayer of otherPlayers) {
        if (otherPlayer === playerBody) continue;
        
        if (otherPlayer.userData && (!otherPlayer.userData.balloons || otherPlayer.userData.balloons.length === 0)) continue;
        
        const dx = playerBody.position.x - otherPlayer.position.x;
        const dz = playerBody.position.z - otherPlayer.position.z;
        const distSquared = dx * dx + dz * dz;
        
        const minDistance = 1.5;
        if (distSquared < minDistance * minDistance) {
            const dist = Math.sqrt(distSquared);
            const pushDist = (minDistance - dist) / 2;
            
            const pushX = dx / dist * pushDist;
            const pushZ = dz / dist * pushDist;
            
            playerBody.position.x += pushX;
            playerBody.position.z += pushZ;
            
            const bounceMultiplier = 0.5;
            playerVelocity.x += pushX * bounceMultiplier;
            playerVelocity.z += pushZ * bounceMultiplier;
            
            playerVelocity.y += 0.03;
        }
    }
}


// Update player shadow
function updatePlayerShadow() {
    // Default shadow to ground level
    shadow.position.x = playerBody.position.x;
    shadow.position.z = playerBody.position.z;
    shadow.position.y = 0.01; // Just above ground
    
    // Find the highest platform below the player
    let highestPlatformY = -Infinity;
    
    for (const platform of platforms) {
        const px = platform.position.x;
        const py = platform.position.y;
        const pz = platform.position.z;
        const width = platform.geometry.parameters.width;
        const depth = platform.geometry.parameters.depth;
        
        // Check if player is directly above this platform
        if (
            playerBody.position.x >= px - width/2 &&
            playerBody.position.x <= px + width/2 &&
            playerBody.position.z >= pz - depth/2 &&
            playerBody.position.z <= pz + depth/2
        ) {
            // If this platform is below player but higher than any found so far
            if (py < playerBody.position.y && py > highestPlatformY) {
                highestPlatformY = py;
            }
        }
    }
    
    // If we found a platform below the player, place shadow on top of it
    if (highestPlatformY > -Infinity) {
        // Place shadow just above the platform's surface
        shadow.position.y = highestPlatformY + 0.51; // 0.51 to be visibly above platform
        
        // Log to help with debugging
        console.log("Shadow on platform at y =", shadow.position.y);
    }
    
    // Dynamic shadow size and opacity
    const heightAboveGround = playerBody.position.y - shadow.position.y;
    const scale = Math.max(0.5, 1 - heightAboveGround * 0.02);
    shadow.scale.set(scale, scale, 1);
    shadow.material.opacity = Math.max(0.1, 0.5 - heightAboveGround * 0.01);
}

// Update all effects
function updateEffects() {
    updatePopEffects();
    updateReleasedBalloons();
    updateDetachedBalloons();
}

// Update camera position to follow player
function updateCameraPosition() {
    // Calculate desired camera position based on the player and current yaw/pitch
    const offset = new THREE.Vector3(0, 3, 10);
    
    // Create a quaternion from the yaw and pitch
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    
    // Apply the quaternion to the offset
    offset.applyQuaternion(quaternion);
    
    // Position camera relative to player
    camera.position.copy(playerBody.position).add(offset);
    
    // Look at player (slightly above the player's position)
    const lookAtPos = new THREE.Vector3(
        playerBody.position.x,
        playerBody.position.y + 2, // Look at the player's head, not feet
        playerBody.position.z
    );
    camera.lookAt(lookAtPos);
    
    // Set the camera rotation order to match our control scheme
    camera.rotation.order = "YXZ";
}