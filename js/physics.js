import * as THREE from 'three';
import { scene, camera, renderer, yaw, pitch, isPointerLocked } from './scene.js';
import { playerBody, playerVelocity, shadow, balloons, leftArm, rightArm } from './entity.js';
import { allCharacters, checkBalloonCollisions, updateCharacters, GRAVITY, BALLOON_BUOYANCY, AIR_RESISTANCE, MAX_VELOCITY, FLAP_FORCE } from './character.js';
import { keys, keysPressed } from './input.js';
import { updateEnvironment } from './environment.js';
import { updateReleasedBalloons, updateDetachedBalloons } from './balloon.js';
import { updatePopEffects } from './effects.js';
import { animatePortal, checkPortalCollision, teleportPlayer, portal, PORTAL_RADIUS } from './portal.js';
import { CollisionSystem } from './collisionSystem.js';
import { updateHUD } from './hud.js';
import { updateNPCs } from './entity.js';
import { updateMultiplayer } from './multiplayer.js';


// Constants
const VERTICAL_DRAG = 0.98;

// Physics state constants
const PLATFORMER_STATE = 'platformer';
const BALLOON_STATE = 'balloon';

// Platformer state constants
const PLATFORMER_GRAVITY = 0.03;
const PLATFORMER_JUMP_FORCE = 0.8;
const PLATFORMER_DOUBLE_JUMP_FORCE = 0.6;
const PLATFORMER_GLIDE_FACTOR = 0.5;
const PLATFORMER_AIR_CONTROL = 0.8;
const PLATFORMER_GROUND_FRICTION = 0.92;
const PLATFORMER_TERMINAL_VELOCITY = -0.4; // Re-added to fix the error
const PLATFORMER_MIN_JUMP_FORCE = 0.5; // Re-added to ensure variable jump height works

// Balloon state constants
const BALLOON_GRAVITY = 0.012;
const BALLOON_JUMP_FORCE_BASE = 0.3;
const BALLOON_JUMP_FORCE_PER_BALLOON = 0.06;
const BALLOON_AIR_CONTROL = 1.2;
const BALLOON_GROUND_FRICTION = 0.85;

let lastTime = 0;

// Current physics state
let currentPhysicsState = BALLOON_STATE;

// Platformer state variables
let coyoteTimeCounter = 0;
let wasOnSurface = false;
let jumpBufferCounter = 0;
const JUMP_BUFFER_FRAMES = 8; // Allow jump input to be buffered for 8 frames

// Flap and kick animation variables
let flapAnimationProgress = 0;
let isAnimatingFlap = false;
let flapCooldownTimer = 0; // Added to fix the error
let kickAnimationProgress = 0;
let isAnimatingKick = false;
let kickCooldownTimer = 0; // Added to fix potential future error

// Animation loop
export function animate() {
    requestAnimationFrame(animate);

    // Calculate deltaTime
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    updateEnvironment();
    updateCharactersOnPlatforms();
    updatePhysicsState();
    updatePlayerPhysics();
    CollisionSystem.checkCollisions(playerBody);
    updatePlayerShadow();
    updateCharacters();
    updateNPCs();
    updateEffects();
    updateCameraPosition();
    checkBalloonCollisions();
    updateMultiplayer(deltaTime);
    
    animatePortal();
    let hudMessage = "";
    if (checkPortalCollision(playerBody.position, keysPressed)) {
        teleportPlayer();
    } else if (portal && playerBody.position.distanceTo(portal.position) < PORTAL_RADIUS * 1.5) { // Match the HUD range to the collision range
        hudMessage = "Press E to enter portal";
    }
    updateHUD(currentPhysicsState, hudMessage);
    renderer.render(scene, camera);
}

// Update the physics state based on balloon count
function updatePhysicsState() {
    const newState = balloons.length === 0 ? PLATFORMER_STATE : BALLOON_STATE;
    
    // If state changed, handle transition
    if (newState !== currentPhysicsState) {
        handleStateTransition(currentPhysicsState, newState);
        currentPhysicsState = newState;
    }
}

// Handle transition between physics states
function handleStateTransition(oldState, newState) {
    
    // Reset arm positions if arms exist
    if (leftArm && rightArm) {
        leftArm.rotation.z = Math.PI / 4;
        rightArm.rotation.z = -Math.PI / 4;
    }
    
    // Reset flapping state
    playerBody.userData.isFlapping = false;
    playerBody.userData.flapTime = 0;
    
    // Specific transitions
    if (oldState === BALLOON_STATE && newState === PLATFORMER_STATE) {
        // Transitioning from balloon to platformer
        // No color change needed
    } 
    else if (oldState === PLATFORMER_STATE && newState === BALLOON_STATE) {
        // Transitioning from platformer to balloon
        // Give a small upward boost when gaining balloons
        playerVelocity.y = Math.max(playerVelocity.y, 0.1);
    }
}

// Update player physics
function updatePlayerPhysics() {
    // Track if space was just pressed this frame (for jumping/flapping)
    const spaceJustPressed = keys.space && !keysPressed.space;
    keysPressed.space = keys.space;
    
    // Use the appropriate physics update based on current state
    if (currentPhysicsState === PLATFORMER_STATE) {
        updatePlatformerPhysics(spaceJustPressed);
    } else {
        updateBalloonPhysics(spaceJustPressed);
    }
    
    // Common physics updates (for both states)
    
    // Surface friction (common for both states)
    if (playerBody.userData.isOnSurface) {
        const frictionFactor = currentPhysicsState === PLATFORMER_STATE ? 
            PLATFORMER_GROUND_FRICTION : BALLOON_GROUND_FRICTION;
            
        playerVelocity.x *= frictionFactor;
        playerVelocity.z *= frictionFactor;
        
        // Stopping threshold
        if (Math.abs(playerVelocity.x) < 0.01) playerVelocity.x = 0;
        if (Math.abs(playerVelocity.z) < 0.01) playerVelocity.z = 0;
    }
    
    // Movement controls with different air control based on state
    updateMovementControls();
    
    // Limit maximum velocity - but don't limit vertical velocity in platformer mode
    if (currentPhysicsState === PLATFORMER_STATE) {
        // For platformer state, only limit horizontal velocity
        const horizontalVelocity = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z);
        if (horizontalVelocity.length() > MAX_VELOCITY) {
            horizontalVelocity.normalize().multiplyScalar(MAX_VELOCITY);
            playerVelocity.x = horizontalVelocity.x;
            playerVelocity.z = horizontalVelocity.z;
        }
    } else {
        // For balloon state, limit all velocity components
        if (playerVelocity.length() > MAX_VELOCITY) {
            playerVelocity.normalize().multiplyScalar(MAX_VELOCITY);
        }
    }
    
    // Update player position
    playerBody.position.add(playerVelocity);
}

// Update physics for platformer state (0 balloons)
function updatePlatformerPhysics(spaceJustPressed) {
    // Apply platformer gravity
    playerVelocity.y -= PLATFORMER_GRAVITY;
    
    // Check if player is moving horizontally for walking animation
    const isMoving = Math.abs(playerVelocity.x) > 0.01 || Math.abs(playerVelocity.z) > 0.01;
    const movementSpeed = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z) * 10;
    
    // Animate walking when on surface
    if (playerBody.userData.isOnSurface) {
        // Find the player character in allCharacters
        const playerCharacter = allCharacters.find(char => char.entity === playerBody);
        if (playerCharacter) {
            playerCharacter.animateWalking(isMoving, movementSpeed);
        }
    } else {
        // Reset animation when in air
        const playerCharacter = allCharacters.find(char => char.entity === playerBody);
        if (playerCharacter) {
            playerCharacter.animateWalking(false);
        }
    }
    
    // Update coyote time counter
    if (playerBody.userData.isOnSurface) {
        // Reset coyote time when on surface
        coyoteTimeCounter = 0;
        wasOnSurface = true;
        
        // Check for buffered jump
        if (jumpBufferCounter > 0 && jumpBufferCounter <= JUMP_BUFFER_FRAMES) {
            // Execute the buffered jump
            executeJump();
            jumpBufferCounter = 0;
        }
    } else if (wasOnSurface && playerBody.position.y > WATER_LEVEL) {
        // Only increment coyote time when above water level
        coyoteTimeCounter++;
        
        // Reset wasOnSurface after coyote time expires
        if (coyoteTimeCounter > CollisionSystem.CONSTANTS.PLATFORMER_COYOTE_TIME) {
            wasOnSurface = false;
        }
    }
    
    // Update jump buffer counter
    if (spaceJustPressed) {
        jumpBufferCounter = 1; // Start the buffer
    } else if (jumpBufferCounter > 0) {
        jumpBufferCounter++; // Increment buffer counter
        if (jumpBufferCounter > JUMP_BUFFER_FRAMES) {
            jumpBufferCounter = 0; // Reset if buffer expires
        }
    }
    
    // Handle jumping - allow during coyote time
    const canJump = playerBody.userData.isOnSurface || 
                   (wasOnSurface && coyoteTimeCounter <= CollisionSystem.CONSTANTS.PLATFORMER_COYOTE_TIME);
                   
    if (canJump && spaceJustPressed) {
        executeJump();
    }
    
    // Function to execute the jump
    function executeJump() {
        // Strong platformer jump
        playerVelocity.y = PLATFORMER_JUMP_FORCE;
        
        // Reset coyote time when jumping
        wasOnSurface = false;
        coyoteTimeCounter = 0;
        jumpBufferCounter = 0;
        
        // Jump animation - arms at sides for platformer style (if arms exist)
        if (leftArm && rightArm) {
            leftArm.rotation.z = 0;
            rightArm.rotation.z = 0;
        }
        
        // Only add forward lean when falling (velocity.y < 0)
        if (playerBody && playerBody.userData && playerVelocity.y < 0) {
            // Clear any existing timeout to prevent leaks
            if (playerBody.userData.leanTimeout) {
                clearTimeout(playerBody.userData.leanTimeout);
            }

            // Set lean using rotation if available, otherwise userData
            if (playerBody.rotation) {
                playerBody.rotation.x = 0.2;
            } else {
                playerBody.userData.jumpLean = 0.2;
            }
            
            // Set timeout to reset lean
            playerBody.userData.leanTimeout = setTimeout(() => {
                if (leftArm && rightArm) {
                    leftArm.rotation.z = Math.PI / 4;
                    rightArm.rotation.z = -Math.PI / 4;
                }
                if (playerBody) {
                    if (playerBody.rotation) {
                        playerBody.rotation.x = 0;
                    } else if (playerBody.userData) {
                        playerBody.userData.jumpLean = 0;
                    }
                }
            }, 300);
        }
        
        // Variable jump height - check for early release
        const jumpCheckInterval = setInterval(() => {
            if (!keys.space && playerVelocity.y > PLATFORMER_MIN_JUMP_FORCE) {
                // Reduce jump force if jump button released early
                playerVelocity.y = PLATFORMER_MIN_JUMP_FORCE;
                clearInterval(jumpCheckInterval);
            } else if (playerVelocity.y <= 0) {
                // Jump finished
                clearInterval(jumpCheckInterval);
            }
        }, 16); // Check every frame (~60fps)
    }
    
    // Add a small "hang time" at the peak of the jump
    if (Math.abs(playerVelocity.y) < 0.05) {
        playerVelocity.y *= 0.3; // More hang time for better feel
    }
    
    // Terminal velocity
    if (playerVelocity.y < PLATFORMER_TERMINAL_VELOCITY) {
        playerVelocity.y = PLATFORMER_TERMINAL_VELOCITY;
    }
    
    // Apply platformer air resistance
    const resistanceFactor = 0.97;
    playerVelocity.multiplyScalar(playerBody.userData.isOnSurface ? resistanceFactor * 0.98 : resistanceFactor);
}

function updateBalloonPhysics(spaceJustPressed) {
    // Apply base gravity
    playerVelocity.y -= BALLOON_GRAVITY;
    
    // Apply buoyancy based on balloon count
    const buoyancy = BALLOON_BUOYANCY * balloons.length;
    playerVelocity.y += buoyancy;
    
    // Add specific behavior based on balloon count
    if (balloons.length === 3) {
        // 3 balloons: Should provide net upward force
        // Add a slight downward force to prevent too rapid ascent
        playerVelocity.y -= 0.004;
    } else if (balloons.length === 2) {
        // 2 balloons: Should float but need flapping to gain height
        // Add a very tiny downward force for slight descent
        playerVelocity.y -= 0.001;
    }
    
    // JUMPING (from surface)
    if (playerBody.userData.isOnSurface && spaceJustPressed) {
        // With balloons = enhanced initial jump
        playerVelocity.y = BALLOON_JUMP_FORCE_BASE + (BALLOON_JUMP_FORCE_PER_BALLOON * balloons.length);
        
        // Balloon jump animation - arms up
        leftArm.rotation.z = Math.PI / 2;
        rightArm.rotation.z = -Math.PI / 2;
        setTimeout(() => {
            leftArm.rotation.z = Math.PI / 4;
            rightArm.rotation.z = -Math.PI / 4;
        }, 300);
    }
    
    // FLAPPING (in mid-air with balloons)
    if (!playerBody.userData.isOnSurface && spaceJustPressed) {
        // Allow flapping more frequently
        if (!playerBody.userData.isFlapping || playerBody.userData.flapTime > 5) {
            // Different flap behavior based on balloon count
            let flapStrength;
            
            if (balloons.length === 3) {
                // Strong upward boost with 3 balloons
                flapStrength = FLAP_FORCE * 1.4;
                
                // A bit more upward velocity for 3 balloons
                if (playerVelocity.y < 0) {
                    // Extra boost when falling to quickly recover
                    flapStrength *= 1.2;
                }
            } else if (balloons.length === 2) {
                // Medium boost with 2 balloons - enough to gain height
                flapStrength = FLAP_FORCE * 1.5;
                
                // Add extra boost when in a descent
                if (playerVelocity.y < 0) {
                    // Extra boost when falling to better counteract gravity
                    flapStrength *= 1.3;
                }
            } else if (balloons.length === 1) {
                // Weaker boost with 1 balloon - can still gain some height with effort
                flapStrength = FLAP_FORCE * 1.2;
                
                // Even stronger boost when falling to give a fighting chance
                if (playerVelocity.y < 0) {
                    flapStrength *= 1.4;
                }
            }
            
            playerVelocity.y += flapStrength;
            
            // Reset flap state
            playerBody.userData.isFlapping = true;
            playerBody.userData.flapTime = 0;
            
            // Flapping animation
            leftArm.rotation.z = Math.PI / 2;
            rightArm.rotation.z = -Math.PI / 2;
        }
    }
    
    // Reset flapping state after animation
    if (playerBody.userData.isFlapping) {
        playerBody.userData.flapTime++;
        if (playerBody.userData.flapTime > 6) { // Shorter cooldown
            playerBody.userData.isFlapping = false;
            leftArm.rotation.z = Math.PI / 4;
            rightArm.rotation.z = -Math.PI / 4;
        }
    }
    
    // Different physics based on balloon count
    if (balloons.length === 3) {
        // 3 balloons = very floaty, slow rise even without flapping
        const dragFactor = 0.994; // High drag factor to create floaty feeling
        playerVelocity.y *= dragFactor;
        
        // Slight dampening when rising to prevent excessive height gain
        if (!playerBody.userData.isFlapping && playerVelocity.y > 0.03) {
            playerVelocity.y *= 0.97;
        }
    } else if (balloons.length === 2) {
        // 2 balloons = almost neutral, flapping needed to gain height
        const dragFactor = 0.992; // Increased drag to prevent sinking
        playerVelocity.y *= dragFactor;
        
        // Add a very small upward force to counteract any remaining descent tendency
        if (playerVelocity.y < 0 && playerVelocity.y > -0.01) {
            playerVelocity.y *= 0.8; // Reduce downward velocity
        }
        
        // Still have some dampening for upward movement
        if (!playerBody.userData.isFlapping && playerVelocity.y > 0.01) {
            playerVelocity.y *= 0.96;
        }
    } else if (balloons.length === 1) {
        // 1 balloon = slow descent, more flapping needed
        const dragFactor = 0.988; // Increased drag to slow the descent
        playerVelocity.y *= dragFactor;
        
        // Limit maximum downward speed with 1 balloon
        if (playerVelocity.y < -0.03) {
            playerVelocity.y = -0.03;
        }
        
        // Still have dampening for upward movement
        if (!playerBody.userData.isFlapping && playerVelocity.y > 0.01) {
            playerVelocity.y *= 0.94;
        }
    }
    
    // Apply balloon air resistance
    playerVelocity.multiplyScalar(playerBody.userData.isOnSurface ? AIR_RESISTANCE * 0.98 : AIR_RESISTANCE);
}

// Constants for improved movement
const BASE_MOVEMENT_FORCE = 0.05; // Increased by 15% from 0.02
const RUN_MOVEMENT_FORCE = 0.07; // 50% more than base for running
const MOVEMENT_ACCELERATION = 0.65; // Slightly increased for faster acceleration
const RUN_ACCELERATION = 0.75; // Faster acceleration when running
const MOVEMENT_DECELERATION = 0.8; // Keep the same
const MAX_HORIZONTAL_VELOCITY = 0.8; // Increased by 15% from 0.4
const MAX_RUN_VELOCITY = 1.0; // 30% faster than walking
const FLAP_HORIZONTAL_BOOST = 0.15; // Increased horizontal boost when flapping

// Update movement controls
function updateMovementControls() {
    // Calculate desired movement direction
    let moveX = 0;
    let moveZ = 0;
    
    if (isPointerLocked) {
        // Camera-relative movement
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();
        
        // Calculate desired direction
        if (keys.w) {
            moveX += forward.x;
            moveZ += forward.z;
        }
        if (keys.s) {
            moveX -= forward.x;
            moveZ -= forward.z;
        }
        if (keys.a) {
            moveX -= right.x;
            moveZ -= right.z;
        }
        if (keys.d) {
            moveX += right.x;
            moveZ += right.z;
        }
    } else {
        // Non-camera-relative movement (simple WASD)
        if (keys.w) moveZ -= 1;
        if (keys.s) moveZ += 1;
        if (keys.a) moveX -= 1;
        if (keys.d) moveX += 1;
    }
    
    // Normalize movement vector if moving diagonally
    if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX /= length;
        moveZ /= length;
    }
    
    // Base movement force with state-specific modifiers
    let movementForce = keys.shift ? RUN_MOVEMENT_FORCE : BASE_MOVEMENT_FORCE;
    let acceleration = keys.shift ? RUN_ACCELERATION : MOVEMENT_ACCELERATION;
    let maxVelocity = keys.shift ? MAX_RUN_VELOCITY : MAX_HORIZONTAL_VELOCITY;
    
    // Rotate player body to face movement direction
    if (moveX !== 0 || moveZ !== 0) {
        const angle = Math.atan2(moveX, moveZ);
        playerBody.rotation.y = angle;
    }

    // Momentum buildup when running
    if (keys.shift) {
        const runTime = performance.now() - (playerBody.userData.runStartTime || performance.now());
        playerBody.userData.runStartTime = playerBody.userData.runStartTime || performance.now();
        
        // Gradually increase speed up to 1.5x over 2 seconds
        const speedBoost = Math.min(1.5, 1.0 + runTime / 2000);
        movementForce *= speedBoost;
        maxVelocity *= speedBoost;

        // Camera shake effect at max speed
        if (speedBoost >= 1.4) {
            camera.position.x += (Math.random() - 0.5) * 0.03;
            camera.position.y += (Math.random() - 0.5) * 0.03;
        }
    } else {
        playerBody.userData.runStartTime = null;
    }
    
    // Apply air control modifier based on state
    if (!playerBody.userData.isOnSurface) {
        if (currentPhysicsState === PLATFORMER_STATE) {
            movementForce *= PLATFORMER_AIR_CONTROL;
        } else {
            movementForce *= BALLOON_AIR_CONTROL;
            
            // Add horizontal boost when flapping in balloon mode
            if (playerBody.userData.isFlapping && playerBody.userData.flapTime <= 2) {
                // Apply horizontal boost in the direction of movement
                if (moveX !== 0 || moveZ !== 0) {
                    playerVelocity.x += moveX * FLAP_HORIZONTAL_BOOST;
                    playerVelocity.z += moveZ * FLAP_HORIZONTAL_BOOST;
                }
            }
        }
    }
    
    // Apply acceleration-based movement
    if (moveX !== 0 || moveZ !== 0) {
        // Player is actively moving - accelerate towards desired direction
        const targetVelocityX = moveX * movementForce * 1.5; // 1.5x multiplier for higher top speed
        const targetVelocityZ = moveZ * movementForce * 1.5;
        
        // Accelerate towards target velocity
        playerVelocity.x += (targetVelocityX - playerVelocity.x) * acceleration;
        playerVelocity.z += (targetVelocityZ - playerVelocity.z) * acceleration;
    } else {
        // No movement input - decelerate
        playerVelocity.x *= MOVEMENT_DECELERATION;
        playerVelocity.z *= MOVEMENT_DECELERATION;
    }
    
    // Apply horizontal speed limit
    const horizontalVelocity = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z);
    if (horizontalVelocity.length() > maxVelocity) {
        horizontalVelocity.normalize().multiplyScalar(maxVelocity);
        playerVelocity.x = horizontalVelocity.x;
        playerVelocity.z = horizontalVelocity.z;
    }
    
    // Running animation state
    if (playerBody.userData.isOnSurface) {
        // Find the player character in allCharacters
        const playerCharacter = allCharacters.find(char => char.entity === playerBody);
        if (playerCharacter) {
            playerCharacter.setRunningState(keys.shift && (Math.abs(playerVelocity.x) > 0.1 || Math.abs(playerVelocity.z) > 0.1));
        }
    }
}

function updateCharactersOnPlatforms() {
    // Get all character entities
    const characterEntities = allCharacters.map(character => character.entity);
    
    for (const character of characterEntities) {
        // Skip if character is not on a platform
        if (!character.userData || !character.userData.currentPlatform) continue;
        
        const platform = character.userData.currentPlatform;
        
        // Skip non-moving platforms
        if (!platform.userData || !platform.userData.type || platform.userData.type === 'static') continue;
        
        // Store the character's relative position on the platform if not already stored
        if (!character.userData.platformRelativePosition) {
            character.userData.platformRelativePosition = new THREE.Vector3();
            
            // Calculate relative position to platform center
            if (platform.userData.center) {
                character.userData.platformRelativePosition.x = character.position.x - platform.userData.center.x;
                character.userData.platformRelativePosition.y = character.position.y - platform.userData.center.y;
                character.userData.platformRelativePosition.z = character.position.z - platform.userData.center.z;
            } else {
                // If no center is defined, use platform position
                character.userData.platformRelativePosition.x = character.position.x - platform.position.x;
                character.userData.platformRelativePosition.y = character.position.y - platform.position.y;
                character.userData.platformRelativePosition.z = character.position.z - platform.position.z;
            }
        }
        
        // For all platform types, use the delta movement approach
        // This is more stable than recalculating positions with trig functions
        if (platform.userData.lastPosition) {
            const deltaX = platform.position.x - platform.userData.lastPosition.x;
            const deltaY = platform.position.y - platform.userData.lastPosition.y;
            const deltaZ = platform.position.z - platform.userData.lastPosition.z;
            
            // Apply platform movement to character
            character.position.x += deltaX;
            character.position.y += deltaY;
            character.position.z += deltaZ;
            
            // For rotating platforms, also rotate the character
            if (platform.userData.type === 'rotating_horizontal') {
                // Rotate character to match platform rotation
                character.rotation.y += platform.userData.rotationSpeed;
            }
        }
    }
}

// Update player shadow
function updatePlayerShadow() {
    if (!shadow) return;
    
    // Position shadow under player
    shadow.position.x = playerBody.position.x;
    shadow.position.z = playerBody.position.z;
    
    // Default to ground level
    let shadowY = 0.01; // Slightly above ground level (0)
    let onPlatform = false;
    
    // Check for platforms under player
    const playerX = playerBody.position.x;
    const playerZ = playerBody.position.z;
    
    // Get platforms from the scene - try both methods to ensure we find all platforms
    let platforms = Array.from(scene.children).filter(
        obj => obj.userData && obj.userData.type && obj.userData.type.includes('platform')
    );
    
    // Also try to get platforms from the environment if available
    if (window.environmentPlatforms && window.environmentPlatforms.length > 0) {
        platforms = [...platforms, ...window.environmentPlatforms];
    }
    
    for (const platform of platforms) {
        // Skip if platform is invalid or missing geometry
        if (!platform || !platform.geometry || !platform.geometry.parameters) {
            continue;
        }

        // Get platform dimensions and position with fallback values
        const width = platform.geometry.parameters?.width || 1;
        const depth = platform.geometry.parameters?.depth || 1;
        const px = platform.position.x || 0;
        const py = platform.position.y || 0;
        const pz = platform.position.z || 0;
        
        // Check if player is above this platform with a larger margin
        if (
            playerX >= px - width/2 - 0.1 && playerX <= px + width/2 + 0.1 &&
            playerZ >= pz - depth/2 - 0.1 && playerZ <= pz + depth/2 + 0.1
        ) {
            // If this platform is higher than our current shadow position
            if (py > shadowY) {
                // Set shadow to top of this platform
                shadowY = py + 0.55; // Platform height is 1, so y + 0.5 is the top
                onPlatform = true;
                
                // Shadow is now on a platform
            }
        }
    }
    
    // Set final shadow position
    shadow.position.y = shadowY;
    
    // Calculate shadow scale based on height
    const heightDifference = playerBody.position.y - shadowY;
    const scale = Math.max(0.5, 1 - heightDifference * 0.02);
    shadow.scale.set(scale, scale, 1);
    
    // Calculate shadow opacity based on height
    let opacity = Math.max(0.1, 0.5 - heightDifference * 0.01);
    
    // Make shadow more visible in platformer mode
    if (currentPhysicsState === PLATFORMER_STATE) {
        opacity = Math.max(0.3, opacity);
    }
    
    // Make shadow more visible when on a platform
    if (onPlatform) {
        opacity = Math.max(0.4, opacity);
    }
    
    shadow.material.opacity = opacity;
    
    // Make sure shadow is visible
    shadow.material.transparent = true;
    shadow.visible = true;
    
    // Set shadow color based on whether it's on a platform
    if (onPlatform) {
        shadow.material.color.set(0x333333); // Darker shadow on platforms
        
        // Ensure shadow is visible on platforms by adjusting its position and rendering properties
        shadow.position.y = shadowY + 0.02; // Position slightly above platform surface
        shadow.renderOrder = 2; // Higher render order to ensure it renders on top
        shadow.material.depthTest = false; // Disable depth testing so it always renders on top
    } else {
        shadow.material.color.set(0x000000); // Normal shadow on ground
        shadow.renderOrder = 1;
        shadow.material.depthTest = true; // Re-enable depth testing for ground shadows
    }
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
}
