import * as THREE from 'three';
import { Character } from './character.js';
import { scene } from './scene.js';
import { platforms } from './environment.js';
import { createPopEffect } from './effects.js';
import { keys } from './input.js';

// Original player exports (maintained for backward compatibility)
export let playerBody;
export let balloons = [];
export let playerVelocity = new THREE.Vector3(0, 0, 0);
export let shadow;
export const GRAVITY = 0.012;               // Reduced to match physics.js BALLOON_GRAVITY
export const BALLOON_BUOYANCY = 0.006;      // Adjusted to match new gravity
export const VERTICAL_DRAG = 0.98;          // Vertical movement dampening
export const MAX_VELOCITY = 0.3;            // Keep the same
export const AIR_RESISTANCE = 0.98;         // Keep the same
export const FLAP_FORCE = 0.13;             // Keep the same
export const FLAP_COOLDOWN = 8;             // Keep the same
export const MOVEMENT_FORCE = 0.008;        // Keep the same
export let leftArm, rightArm; // Export for animation
export let leftLeg, rightLeg; // Export legs for animation
export let flapTime = 0;
export let isFlapping = false;
export let playerInvincibilityTime = 0;
export let walkCycle = 0; // For walking animation

// New multiplayer-supporting exports
export const allPlayers = []; // Array to hold all players (local and opponents)
export let localPlayerEntity = null; // Reference to the local player entity

// Player class extending Character
class Player extends Character {
  constructor(x, y, z, color, name) {
    super(x, y, z, color, name || "Player");
    this.isLocalPlayer = true;
  }
}

// Export functions to modify player state (maintained for compatibility)
export function setPlayerInvincibility(frames) {
    playerInvincibilityTime = frames;
    
    // Also update local player entity if it exists
    if (localPlayerEntity) {
        localPlayerEntity.userData.invincibleTime = frames;
    }
}

// Functions to properly handle flapping state
export function isPlayerFlapping() {
    return isFlapping;
}

export function setFlapping(value) {
    isFlapping = value;
    
    // Update local player entity if it exists
    if (localPlayerEntity) {
        localPlayerEntity.userData.isFlapping = value;
    }
}

export function setFlapTime(value) {
    flapTime = value;
    
    // Update local player entity if it exists
    if (localPlayerEntity) {
        localPlayerEntity.userData.flapTime = value;
    }
}

export function getFlapTime() {
    return flapTime;
}

// Initialize the player
export function initPlayer() {
    console.log("Starting player initialization");

    // Create player instance
    const player = new Player(0, 0.5, 0, 0xff0000);
    playerBody = player.entity;
    
    // Create shadow
    createPlayerShadow();
    
    // Add balloons
    player.addBalloons(3, [0xff0000, 0x0000ff, 0x00ff00]);
    balloons = player.balloons;

    // Start on a platform if available
    if (platforms.length > 0) {
        const startPlatform = platforms[0];
        playerBody.position.x = startPlatform.position.x;
        playerBody.position.y = startPlatform.position.y + 0.5;
        playerBody.position.z = startPlatform.position.z;
    }
    
    // Reset velocity to zero
    playerVelocity.set(0, 0, 0);
    
    // Set up the local player entity
    localPlayerEntity = playerBody;
    localPlayerEntity.userData = {
        ...playerBody.userData,
        isLocalPlayer: true,
        velocity: playerVelocity,
        balloons: balloons,
        leftArm: playerBody.userData.leftArm,
        rightArm: playerBody.userData.rightArm,
        leftLeg: playerBody.userData.leftLeg,
        rightLeg: playerBody.userData.rightLeg,
        flapTime: 0,
        isFlapping: false,
        walkCycle: 0,
        invincibleTime: 0,
        isOnSurface: false,
        currentPlatform: null,
        legMeshes: [playerBody.userData.leftLeg, playerBody.userData.rightLeg]
    };
    
    // Add to the players array
    allPlayers.push(playerBody);
    
    // Set exported references for backward compatibility
    leftArm = playerBody.userData.leftArm;
    rightArm = playerBody.userData.rightArm;
    leftLeg = playerBody.userData.leftLeg;
    rightLeg = playerBody.userData.rightLeg;
}

// Create player shadow
function createPlayerShadow() {
    // Create shadow mesh
    const shadowGeometry = new THREE.CircleGeometry(1.5, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2; // Lay flat on the ground
    shadow.position.y = 0.01; // Slightly above ground level (0) to avoid z-fighting
    scene.add(shadow);
    // Add this after creating the shadow
    shadow.visible = true;
    shadow.renderOrder = 1; // Make sure it renders above other objects
}


// Animate player walking (for platformer mode)
export function animateWalking(isMoving, speed = 1) {
    // Only animate if player is moving and limbs exist
    if (!isMoving) {
        // Reset to default pose when not moving
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        if (leftArm) leftArm.rotation.z = Math.PI / 4;
        if (rightArm) rightArm.rotation.z = -Math.PI / 4;
        return;
    }
    
    // Update walk cycle
    walkCycle += 0.15 * speed;
    
    // Animate legs if they exist
    if (leftLeg && rightLeg) {
        leftLeg.rotation.x = Math.sin(walkCycle) * 0.5;
        rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
    }
    
    // Animate arms if they exist (opposite to legs for natural walking motion)
    if (leftArm && rightArm) {
        leftArm.rotation.z = Math.PI / 4 + Math.sin(walkCycle + Math.PI) * 0.3;
        rightArm.rotation.z = -Math.PI / 4 + Math.sin(walkCycle) * 0.3;
    }
    
    // Add a slight body bob
    if (playerBody) {
        playerBody.position.y += Math.abs(Math.sin(walkCycle * 2)) * 0.02;
    }
}

// Set running state and animate accordingly
export function setRunningState(isRunning) {
    if (!playerBody) return;
    
    if (isRunning) {
        // Running animation - faster walk cycle
        walkCycle += 0.25;
        
        // More exaggerated leg movement
        if (leftLeg && rightLeg) {
            leftLeg.rotation.x = Math.sin(walkCycle) * 0.7;
            rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.7;
        }
        
        // Arms more active
        if (leftArm && rightArm) {
            leftArm.rotation.z = Math.PI / 4 + Math.sin(walkCycle + Math.PI) * 0.5;
            rightArm.rotation.z = -Math.PI / 4 + Math.sin(walkCycle) * 0.5;
        }
        
        // Lean forward slightly when running
        playerBody.rotation.x = 0.15;
        
        // Enhanced running animation
        const runIntensity = 1.5;
        playerBody.position.y += Math.abs(Math.sin(walkCycle * 3)) * 0.05 * runIntensity;
        playerBody.rotation.x = Math.sin(walkCycle * 3) * 0.1 * runIntensity;
        playerBody.rotation.z = Math.sin(walkCycle * 1.5) * 0.05 * runIntensity;
        
        // Visual feedback - character leans forward when running
        playerBody.position.z -= Math.abs(Math.sin(walkCycle * 1.5)) * 0.02 * runIntensity;
    } else {
        // Reset to normal walking pose
        playerBody.rotation.x = 0;
        playerBody.rotation.z = 0;
    }
}

// ==========================================
// NEW FUNCTIONS FOR MULTIPLAYER SUPPORT
// ==========================================

// Create an opponent player
export function createOpponent(x, y, z, color, platform, name = "Opponent") {
    // Create opponent instance
    const opponent = new Character(x, y, z, color, name);
    const opponentBody = opponent.entity;
    
    // Add random balloons (1-3)
    const balloonCount = 1 + Math.floor(Math.random() * 3);
    const balloonColors = [];
    for (let i = 0; i < balloonCount; i++) {
        balloonColors.push(new THREE.Color(Math.random(), Math.random(), Math.random()));
    }
    opponent.addBalloons(balloonCount, balloonColors);
    
    // Store opponent properties
    opponentBody.userData = {
        ...opponentBody.userData,
        isLocalPlayer: false,
        moveDirection: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(),
        moveSpeed: 0.02 + Math.random() * 0.03,
        platform: platform,
        walkCycle: 0,
        legMeshes: [opponentBody.userData.leftLeg, opponentBody.userData.rightLeg]
    };
    
    // Add to players array
    allPlayers.push(opponentBody);
    
    return opponentBody;
}

// Create opponents on platforms for testing
export function createOpponents() {
    // Create an opponent on the first platform
    if (platforms.length > 0) {
        createOpponent(
            platforms[0].position.x,
            platforms[0].position.y + 0.5, // 0.5 unit above platform to match new PLAYER_HEIGHT
            platforms[0].position.z,
            0xff0000, // Red
            platforms[0], // The platform this opponent is on
            "Opponent1"
        );
    }
    
    // Create an opponent on the third platform if it exists
    if (platforms.length > 2) {
        createOpponent(
            platforms[2].position.x,
            platforms[2].position.y + 0.5, // 0.5 unit above platform to match new PLAYER_HEIGHT
            platforms[2].position.z,
            0x00ff00, // Green
            platforms[2],
            "Opponent2"
        );
    }
    
    // Create an opponent on the fifth platform if it exists
    if (platforms.length > 4) {
        createOpponent(
            platforms[4].position.x,
            platforms[4].position.y + 0.5, // 0.5 unit above platform to match new PLAYER_HEIGHT
            platforms[4].position.z,
            0x0000ff, // Blue
            platforms[4],
            "Opponent3"
        );
    }
}

// Pop a balloon from any player
export function popBalloon(playerEntity, balloon) {
    // Use Character's popBalloon method
    const popped = playerEntity.userData.popBalloon(balloon, createPopEffect);
    
    if (popped && playerEntity === localPlayerEntity) {
        // Update original balloons array for backward compatibility
        const globalIndex = balloons.indexOf(balloon);
        if (globalIndex !== -1) {
            balloons.splice(globalIndex, 1);
        }
        
        // Update invincibility
        playerInvincibilityTime = playerEntity.userData.invincibleTime;
    }
    
    return popped;
}

// Update all players (call this in your animate loop)
export function updatePlayers() {
    for (let i = allPlayers.length - 1; i >= 0; i--) {
        const player = allPlayers[i];
        
        // Skip the local player (handled by player controls)
        if (player === localPlayerEntity) {
            // Just update invincibility time
            if (player.userData.invincibleTime > 0) {
                player.userData.invincibleTime--;
                
                // Flash effect during invincibility
                player.visible = Math.floor(Date.now() / 100) % 2 === 0;
            } else {
                player.visible = true;
            }
            continue;
        }
        
        // Decrease invincibility time
        if (player.userData.invincibleTime > 0) {
            player.userData.invincibleTime--;
            
            // Flash effect during invincibility
            player.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            player.visible = true;
        }
        
        // If player has balloons, move normally
        if (player.userData.balloons.length > 0) {
            // Update AI movement on platform
            updateAIMovement(player);
            
            // Animate balloons bobbing
            animatePlayerBalloons(player);
        } 
        // If player has no balloons, make them fall
        else {
            // Apply gravity
            player.userData.velocity.y -= 0.01;
            player.position.y += player.userData.velocity.y;
            
            // Add some spinning as they fall
            player.rotation.x += 0.02;
            player.rotation.z += 0.03;
            
            // If player falls below ground, remove them
            if (player.position.y < -10) {
                scene.remove(player);
                allPlayers.splice(i, 1);
                
                // Optionally, spawn a new opponent after some time
                setTimeout(() => {
                    if (platforms.length > 0) {
                        // Choose a random platform
                        const platformIndex = Math.floor(Math.random() * platforms.length);
                        const platform = platforms[platformIndex];
                        
                        // Create a new player on this platform
                        createOpponent(
                            platform.position.x,
                            platform.position.y + 0.5, // 0.5 unit above platform to match new PLAYER_HEIGHT
                            platform.position.z,
                            new THREE.Color(Math.random(), Math.random(), Math.random()),
                            platform,
                            "Opponent" + Math.floor(Math.random() * 100)
                        );
                    }
                }, 5000); // 5 seconds later
            }
        }
    }
}

// Update AI movement (for opponents)
function updateAIMovement(player) {
    const platform = player.userData.platform;
    if (!platform) return;
    
    // Get platform dimensions
    const platformWidth = platform.geometry.parameters.width;
    const platformDepth = platform.geometry.parameters.depth;
    const halfWidth = platformWidth / 2 - 1; // Stay 1 unit from edge
    const halfDepth = platformDepth / 2 - 1;
    
    // Update animation time
    player.userData.animationTime = (player.userData.animationTime || 0) + 0.03;
    
    // Make AI occasionally change direction
    if (Math.random() < 0.02) {
        player.userData.moveDirection = new THREE.Vector2(
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
    }
    
    // Calculate new velocity
    const moveDir = player.userData.moveDirection;
    player.userData.velocity.x = moveDir.x * player.userData.moveSpeed;
    player.userData.velocity.z = moveDir.y * player.userData.moveSpeed;
    
    // Apply movement
    player.position.x += player.userData.velocity.x;
    player.position.z += player.userData.velocity.z;
    
    // Keep player on platform
    const platformX = platform.position.x;
    const platformZ = platform.position.z;
    
    // If reaching platform edge, bounce
    if (player.position.x > platformX + halfWidth) {
        player.position.x = platformX + halfWidth;
        player.userData.moveDirection.x *= -1;
    } else if (player.position.x < platformX - halfWidth) {
        player.position.x = platformX - halfWidth;
        player.userData.moveDirection.x *= -1;
    }
    
    if (player.position.z > platformZ + halfDepth) {
        player.position.z = platformZ + halfDepth;
        player.userData.moveDirection.y *= -1;
    } else if (player.position.z < platformZ - halfDepth) {
        player.position.z = platformZ - halfDepth;
        player.userData.moveDirection.y *= -1;
    }
    
    // Make player face movement direction
    if (player.userData.velocity.x !== 0 || player.userData.velocity.z !== 0) {
        player.rotation.y = Math.atan2(player.userData.velocity.x, player.userData.velocity.z);
    }
    
    // Animate walking for AI
    if (player.userData.balloons.length === 0) {
        // Update walk cycle
        player.userData.walkCycle = (player.userData.walkCycle || 0) + 0.15;
        
        // Animate legs
        player.userData.leftLeg.rotation.x = Math.sin(player.userData.walkCycle) * 0.5;
        player.userData.rightLeg.rotation.x = Math.sin(player.userData.walkCycle + Math.PI) * 0.5;
        
        // Animate arms (opposite to legs for natural walking motion)
        player.userData.leftArm.rotation.z = Math.PI / 4 + Math.sin(player.userData.walkCycle + Math.PI) * 0.3;
        player.userData.rightArm.rotation.z = -Math.PI / 4 + Math.sin(player.userData.walkCycle) * 0.3;
    } else {
        // Occasional random jumping/flapping
        if (Math.random() < 0.01 && !player.userData.isFlapping) {
            player.userData.isFlapping = true;
            player.userData.flapTime = 0;
            player.position.y += 0.2; // Small hop
            
            // Animate arms flapping
            player.userData.leftArm.rotation.z = Math.PI / 2;
            player.userData.rightArm.rotation.z = -Math.PI / 2;
        }
        
        // Reset flapping animation
        if (player.userData.isFlapping) {
            player.userData.flapTime++;
            if (player.userData.flapTime > 10) {
                player.userData.isFlapping = false;
                player.userData.leftArm.rotation.z = Math.PI / 4;
                player.userData.rightArm.rotation.z = -Math.PI / 4;
            }
        }
    }
}

// Check for balloon collisions between players
export function checkBalloonCollisions() {
    // Loop through all players
    for (let i = 0; i < allPlayers.length; i++) {
        const attacker = allPlayers[i];
        
        // Skip players with no balloons (already falling)
        if (!attacker.userData.balloons || attacker.userData.balloons.length === 0) continue;
        
        // Get attacker's feet position (for collision detection)
        const attackerFeetY = attacker.position.y - 0.5; // Bottom of player's feet
        const attackerLegsY = attacker.position.y - 1.0; // Bottom of player's legs
        
        // Check against all other players
        for (let j = 0; j < allPlayers.length; j++) {
            // Don't check against self
            if (i === j) continue;
            
            const victim = allPlayers[j];
            
            // Skip victims with no balloons
            if (!victim.userData.balloons || victim.userData.balloons.length === 0) continue;
            
            // Skip if victim is invincible
            if (victim.userData.invincibleTime > 0) continue;
            
            // Check distance in XZ plane between players
            const dx = attacker.position.x - victim.position.x;
            const dz = attacker.position.z - victim.position.z;
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            
            // If close enough to potentially hit balloons (increased range slightly)
            if (horizontalDist < 2.8) {
                // Check each balloon of the victim
                for (let k = 0; k < victim.userData.balloons.length; k++) {
                    const targetBalloon = victim.userData.balloons[k];
                    
                    // Get balloon world position
                    const balloonWorldPos = new THREE.Vector3();
                    targetBalloon.getWorldPosition(balloonWorldPos);
                    
                    // Get balloon size (radius)
                    const balloonRadius = 0.6;
                    
                    // Calculate horizontal distance to this specific balloon
                    const balloonDx = attacker.position.x - balloonWorldPos.x;
                    const balloonDz = attacker.position.z - balloonWorldPos.z;
                    const balloonHorizDist = Math.sqrt(balloonDx * balloonDx + balloonDz * balloonDz);
                    
                    // Check if attacker feet/legs are at balloon height
                    const balloonBottomY = balloonWorldPos.y - balloonRadius;
                    const balloonTopY = balloonWorldPos.y + balloonRadius;
                    
                    // Check if we're in position to pop this balloon
                    const inVerticalRange = 
                        (attackerFeetY >= balloonBottomY - 0.5 && attackerFeetY <= balloonTopY + 0.5) ||
                        (attackerLegsY >= balloonBottomY - 0.5 && attackerLegsY <= balloonTopY + 0.5);
                    
                    const inHorizontalRange = balloonHorizDist < balloonRadius + 0.8;
                    
                    // Visual feedback for local player when in position to pop a balloon
                    if (attacker === localPlayerEntity && inVerticalRange && inHorizontalRange) {
                        // Change balloon color slightly to indicate it can be popped
                        if (!targetBalloon.userData) targetBalloon.userData = {};
                        
                        if (!targetBalloon.userData.originalColor && targetBalloon.material) {
                            // Store original color if not already stored
                            targetBalloon.userData.originalColor = targetBalloon.material.color.clone();
                            
                            // Highlight the balloon
                            targetBalloon.material.emissive = new THREE.Color(0xffff00);
                            targetBalloon.material.emissiveIntensity = 0.3;
                            
                            // Reset after a short delay
                            setTimeout(() => {
                                if (targetBalloon.material) {
                                    targetBalloon.material.emissive = new THREE.Color(0x000000);
                                    targetBalloon.material.emissiveIntensity = 0;
                                }
                                targetBalloon.userData.originalColor = null;
                            }, 100);
                        }
                        
                        // Show HUD indicator
                        try {
                            // Import dynamically to avoid circular dependency
                            import('./hud.js').then(HUD => {
                                HUD.showBalloonTargetIndicator();
                            });
                        } catch (e) {
                            console.warn("Could not show balloon target indicator:", e);
                        }
                    }
                    
                    // More precise collision detection with increased vertical range
                    if (inVerticalRange && inHorizontalRange) {
                        // Check if attacker is pressing the jump key (space) - for bouncing without popping
                        if (attacker === localPlayerEntity && keys.space) {
                            // Balloon jump! - More powerful than regular jump
                            attacker.userData.velocity.y = 0.3; // Strong upward boost
                            
                            // Update playerVelocity for the local player
                            if (attacker === localPlayerEntity) {
                                playerVelocity.y = 0.3;
                            }
                            
                            // Make the balloon bob down and then up
                            const originalY = targetBalloon.position.y;
                            targetBalloon.position.y -= 0.3; // Squish down
                            
                            // Restore position after a short delay
                            setTimeout(() => {
                                if (victim.userData.balloons.includes(targetBalloon)) {
                                    targetBalloon.position.y = originalY;
                                }
                            }, 150);
                            
                            // Only allow one balloon interaction per frame
                            return;
                        }
                        
                        // Determine if we should pop the balloon
                        let shouldPop = false;
                        
                        // If attacker is the local player, always pop
                        if (attacker === localPlayerEntity) {
                            shouldPop = true;
                        } 
                        // If attacker is an NPC, randomly decide to pop player balloons
                        else if (victim === localPlayerEntity && attacker !== localPlayerEntity) {
                            // NPCs have a chance to pop player balloons when in position
                            // Higher chance when NPC is above the player
                            const npcAbovePlayer = attacker.position.y > victim.position.y;
                            const popChance = npcAbovePlayer ? 0.1 : 0.03; // 10% chance when above, 3% otherwise
                            
                            // Random chance to pop
                            shouldPop = Math.random() < popChance;
                            
                            // Debug
                            if (shouldPop) {
                                console.log(`NPC ${attacker.userData.name} is popping player balloon!`);
                            }
                        }
                        
                        // Pop the balloon if conditions are met
                        if (shouldPop) {
                            if (popBalloon(victim, targetBalloon)) {
                                // Medium upward boost to attacker when popping
                                attacker.userData.velocity.y = Math.max(attacker.userData.velocity.y, 0.15);
                                
                                // If attacker is local player, apply boost to playerVelocity too
                                if (attacker === localPlayerEntity) {
                                    playerVelocity.y = Math.max(playerVelocity.y, 0.15);
                                }
                                
                                // Add a small horizontal push away from the victim
                                const pushDirection = new THREE.Vector2(dx, dz).normalize();
                                attacker.userData.velocity.x += pushDirection.x * 0.05;
                                attacker.userData.velocity.z += pushDirection.y * 0.05;
                                
                                if (attacker === localPlayerEntity) {
                                    playerVelocity.x += pushDirection.x * 0.05;
                                    playerVelocity.z += pushDirection.y * 0.05;
                                }
                                
                                // Only pop one balloon per frame
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
}

// Animate balloons bobbing
function animatePlayerBalloons(player) {
    const time = player.userData.animationTime || 0;
    
    // Animate each balloon with slight bobbing
    for (let i = 0; i < player.userData.balloons.length; i++) {
        const balloon = player.userData.balloons[i];
        
        // Balloon bobbing motion
        balloon.position.y = 3 + Math.sin(time + i) * 0.1;
        
        // Slight swaying
        balloon.position.x = (i - 1) * 0.6 + Math.sin(time * 0.5 + i * 2) * 0.1;
        balloon.position.z = Math.cos(time * 0.3 + i) * 0.1;
        
        // Balloon rotating slightly
        balloon.rotation.x = Math.sin(time * 0.5) * 0.1;
        balloon.rotation.z = Math.cos(time * 0.3) * 0.1;
    }
}
