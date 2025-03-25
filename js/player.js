
import { scene } from './scene.js';
import { platforms } from './environment.js';
import { createPopEffect } from './effects.js';
import { keys } from './input.js';

// Original player exports (maintained for backward compatibility)
export let playerBody;
export let balloons = [];
export let playerVelocity = new THREE.Vector3(0, 0, 0);
export let shadow;
export const GRAVITY = 0.015;               
export const BALLOON_BUOYANCY = 0.0075;     // Increased to make 2 balloons nearly neutral
export const VERTICAL_DRAG = 0.98;          // Vertical movement dampening
export const MAX_VELOCITY = 0.3;            // Keep the same
export const AIR_RESISTANCE = 0.98;         // Keep the same
export const FLAP_FORCE = 0.13;             // Keep the same
export const FLAP_COOLDOWN = 8;             // Keep the same
export const MOVEMENT_FORCE = 0.008;        // Keep the same
export let leftArm, rightArm; // Export for animation
export let flapTime = 0;
export let isFlapping = false;
export let playerInvincibilityTime = 0;

// New multiplayer-supporting exports
export const allPlayers = []; // Array to hold all players (local and opponents)
export let localPlayerEntity = null; // Reference to the local player entity

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

    createPlayerBody();
    createPlayerShadow();
    createPlayerBalloons();

    // Option 1: Start on ground
    // playerBody.position.set(0, 1, 0); // y=1 puts feet at ground level
    
    // OR Option 2: Start on a platform (if available)
    if (platforms.length > 0) {
        const startPlatform = platforms[0]; // Or whichever platform you prefer
        playerBody.position.x = startPlatform.position.x;
        playerBody.position.y = startPlatform.position.y + 0.5; // 0.5 unit above platform to match new PLAYER_HEIGHT
        playerBody.position.z = startPlatform.position.z;
    }
    
    // Reset velocity to zero
    playerVelocity.set(0, 0, 0);
    
    // Set up the local player entity
    localPlayerEntity = playerBody;
    localPlayerEntity.userData = {
        isLocalPlayer: true,
        name: "Player",
        velocity: playerVelocity,
        balloons: balloons,
        leftArm: leftArm,
        rightArm: rightArm,
        flapTime: 0,
        isFlapping: false,
        invincibleTime: 0,
        isOnSurface: false,
        currentPlatform: null,
        legMeshes: playerBody.children.filter(child => 
            child.geometry && child.geometry.type === 'ConeGeometry'
        )
    };
    
    // Add to the players array
    allPlayers.push(playerBody);
}

// Create player body and parts
function createPlayerBody() {
    // Player character group
    playerBody = new THREE.Group();
    playerBody.position.y = 0.5; // Start at the correct height for feet to touch ground
    scene.add(playerBody);
    
    // Player's actual body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: 0xff0000
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    playerBody.add(body);
    
    // Player's head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({
        color: 0xffcc99
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    playerBody.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const armMaterial = new THREE.MeshLambertMaterial({
        color: 0xff0000
    });
    
    leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    playerBody.add(leftArm);
    
    rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.5, 0);
    rightArm.rotation.z = -Math.PI / 4;
    playerBody.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.ConeGeometry(0.25, 1, 4);
    const legMaterial = new THREE.MeshLambertMaterial({
        color: 0x0000ff
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, 0, 0);
    playerBody.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, 0, 0);
    playerBody.add(rightLeg);
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

// Create player balloons
function createPlayerBalloons() {
    const balloon1 = createBalloon(-1, 4, 0, 0xff0000); // Red
    const balloon2 = createBalloon(1, 4, 0, 0x0000ff); // Blue
    const balloon3 = createBalloon(0, 4.5, 0, 0x00ff00); // Green
}

// Create a balloon
function createBalloon(x, y, z, color) {
    const balloonGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const balloonMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
    balloon.position.set(x, y, z);
    
    // String (line)
    const stringGeometry = new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.5, 0)]
    );
    const stringMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff
    });
    const string = new THREE.Line(stringGeometry, stringMaterial);
    balloon.add(string);
    
    playerBody.add(balloon);
    balloons.push(balloon);
    return balloon;
}

// ==========================================
// NEW FUNCTIONS FOR MULTIPLAYER SUPPORT
// ==========================================

// Create an opponent player
export function createOpponent(x, y, z, color, platform, name = "Opponent") {
    // Create player group
    const opponentBody = new THREE.Group();
    opponentBody.position.set(x, y, z);
    scene.add(opponentBody);
    
    // Player's actual body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    opponentBody.add(body);
    
    // Player's head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({
        color: 0xffcc99
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    opponentBody.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const armMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    opponentBody.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.5, 0);
    rightArm.rotation.z = -Math.PI / 4;
    opponentBody.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.ConeGeometry(0.25, 1, 4);
    const legMaterial = new THREE.MeshLambertMaterial({
        color: 0x0000ff
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, 0, 0);
    opponentBody.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, 0, 0);
    opponentBody.add(rightLeg);
    
    // Create balloons for the opponent
    const opponentBalloons = [];
    const balloonCount = 1 + Math.floor(Math.random() * 3); // 1-3 balloons
    
    for (let i = 0; i < balloonCount; i++) {
        const balloonGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        // Random color for balloons
        const balloonColor = new THREE.Color(
            Math.random(), 
            Math.random(), 
            Math.random()
        );
        const balloonMaterial = new THREE.MeshLambertMaterial({ color: balloonColor });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
        
        // Position balloon above opponent with some randomness
        const xOffset = (Math.random() - 0.5) * 1.5;
        balloon.position.set(xOffset, 3 + Math.random(), 0);
        
        // String (line)
        const stringGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), 
            new THREE.Vector3(0, -1.5, 0)
        ]);
        const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const string = new THREE.Line(stringGeometry, stringMaterial);
        balloon.add(string);
        
        opponentBody.add(balloon);
        opponentBalloons.push(balloon);
    }
    
    // Store opponent properties
    opponentBody.userData = {
        isLocalPlayer: false,
        name: name,
        velocity: new THREE.Vector3(0, 0, 0),
        moveDirection: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(),
        moveSpeed: 0.02 + Math.random() * 0.03,
        platform: platform,
        balloons: opponentBalloons,
        animationTime: Math.random() * Math.PI * 2, // Random start phase
        flapTime: 0,
        isFlapping: false,
        leftArm: leftArm,
        rightArm: rightArm,
        invincibleTime: 0,
        isOnSurface: false,
        currentPlatform: null,
        legMeshes: [leftLeg, rightLeg]
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
    // If player is invincible, don't pop balloon
    if (playerEntity.userData.invincibleTime > 0) {
        return false;
    }
    
    // Get the player's balloons array
    const playerBalloons = playerEntity.userData.balloons;
    
    // If no balloons left, return
    if (!playerBalloons || playerBalloons.length === 0) {
        return false;
    }
    
    // If no specific balloon is provided, pop the last one
    if (!balloon) {
        balloon = playerBalloons[playerBalloons.length - 1];
    }
    
    // Get balloon position in world coordinates before removing
    const balloonWorldPos = new THREE.Vector3();
    balloon.getWorldPosition(balloonWorldPos);
    
    // Remove from player's balloon array
    const balloonIndex = playerBalloons.indexOf(balloon);
    if (balloonIndex !== -1) {
        playerBalloons.splice(balloonIndex, 1);
    }
    
    // Remove from scene
    playerEntity.remove(balloon);
    
    // Create pop effect at world position
    createPopEffect(balloonWorldPos);
    
    // Set brief invincibility
    playerEntity.userData.invincibleTime = 60; // 1 second at 60fps
    
    // If this is the local player, update the global variables too
    if (playerEntity === localPlayerEntity) {
        // Update original balloons array
        const globalIndex = balloons.indexOf(balloon);
        if (globalIndex !== -1) {
            balloons.splice(globalIndex, 1);
        }
        
        // Update invincibility
        playerInvincibilityTime = 60;
    }
    
    // Log the event
    console.log(`${playerEntity.userData.name} lost a balloon! ${playerBalloons.length} remaining.`);
    
    // If player lost all balloons, they'll fall
    if (playerBalloons.length === 0) {
        console.log(`${playerEntity.userData.name} lost all balloons and is falling!`);
    }
    
    return true; // Successfully popped
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

// Add this function to your player.js file if it doesn't exist
export function checkBalloonCollisions() {
    // Loop through all players
    for (let i = 0; i < allPlayers.length; i++) {
        const attacker = allPlayers[i];
        
        // Skip players with no balloons (already falling)
        if (!attacker.userData.balloons || attacker.userData.balloons.length === 0) continue;
        
        // Get attacker's leg position (for collision detection)
        const attackerLegsY = attacker.position.y - 1; // Bottom of player
        
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
            
            // If close enough to potentially hit balloons
            if (horizontalDist < 2.5) {
                // Get the victim's highest balloon (usually last in array)
                const targetBalloon = victim.userData.balloons[victim.userData.balloons.length - 1];
                
                // Get balloon world position
                const balloonWorldPos = new THREE.Vector3();
                targetBalloon.getWorldPosition(balloonWorldPos);
                
                // Get balloon size (radius)
                const balloonRadius = 0.6;
                
                // Check if attacker legs are at balloon height
                const balloonBottomY = balloonWorldPos.y - balloonRadius;
                const balloonTopY = balloonWorldPos.y + balloonRadius;
                
                if (
                    attackerLegsY >= balloonBottomY - 0.5 && 
                    attackerLegsY <= balloonTopY + 0.2 &&
                    horizontalDist < balloonRadius + 0.5 // Player leg radius
                ) {
                    // Check if attacker is pressing the jump key (space)
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
                    
                    // Pop the balloon (original functionality)
                    if (popBalloon(victim, targetBalloon)) {
                        // Small upward boost to attacker when popping
                        attacker.userData.velocity.y += 0.08;
                        
                        // If attacker is local player, apply boost to playerVelocity too
                        if (attacker === localPlayerEntity) {
                            playerVelocity.y += 0.08;
                        }
                        
                        // Only pop one balloon per frame
                        return;
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
