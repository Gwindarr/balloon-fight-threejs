import { scene, camera, renderer, yaw, pitch, isPointerLocked } from './scene.js';
import { playerBody, playerVelocity, shadow, balloons, GRAVITY, BALLOON_BUOYANCY, AIR_RESISTANCE, MAX_VELOCITY, leftArm, rightArm } from './player.js';
import { allPlayers, checkBalloonCollisions, updatePlayers } from './player.js';
import * as Player from './player.js';
import { keys, keysPressed } from './input.js';
import { updateMovingPlatforms } from './environment.js';
import { updateReleasedBalloons, updateDetachedBalloons } from './balloon.js';
import { updatePopEffects } from './effects.js';
import { animatePortal, checkPortalCollision, teleportPlayer } from './portal.js';
import { CollisionSystem } from './collisionSystem.js';

// Constants
const VERTICAL_DRAG = 0.98;
const FLAP_FORCE = 0.13;

// Physics state constants
const PLATFORMER_STATE = 'platformer';
const BALLOON_STATE = 'balloon';

// Platformer state constants
const PLATFORMER_GRAVITY = 0.08;        // Much higher gravity for true platformer feel
const PLATFORMER_JUMP_FORCE = 0.8;      // More reasonable jump force
const PLATFORMER_TERMINAL_VELOCITY = -1.0; // Even faster falls
const PLATFORMER_AIR_CONTROL = 0.3;     // Further reduced air control
const PLATFORMER_GROUND_FRICTION = 0.85; // Standard ground friction

// Balloon state constants
const BALLOON_GRAVITY = 0.015;          // Original gravity
const BALLOON_JUMP_FORCE_BASE = 0.35;   // Base jump force with balloons
const BALLOON_JUMP_FORCE_PER_BALLOON = 0.05; // Additional force per balloon
const BALLOON_AIR_CONTROL = 1.0;        // Full air control with balloons
const BALLOON_GROUND_FRICTION = 0.85;   // Same ground friction

// Current physics state
let currentPhysicsState = BALLOON_STATE;

// Platformer state variables
let coyoteTimeCounter = 0;
let wasOnSurface = false;
let jumpBufferCounter = 0;
const JUMP_BUFFER_FRAMES = 8; // Allow jump input to be buffered for 8 frames

// Animation loop
export function animate() {
    requestAnimationFrame(animate);
    
    // Update moving platforms first
    updateMovingPlatforms();

    // Then update characters on platforms
    updateCharactersOnPlatforms();

    // Determine physics state based on balloon count
    updatePhysicsState();

    // Update player physics and collisions
    updatePlayerPhysics();
    CollisionSystem.checkCollisions(playerBody);
    
    // Update game state
    updatePlayerShadow();
    updatePlayers();
    updateEffects();
    updateCameraPosition();
    checkBalloonCollisions();

    // Handle portal
    animatePortal();
    if (checkPortalCollision(playerBody.position)) {
        teleportPlayer();
    }
    
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
    console.log(`%cPhysics state transition: ${oldState} -> ${newState}`, 'color: red; font-weight: bold; font-size: 14px;');
    
    // Reset arm positions
    leftArm.rotation.z = Math.PI / 4;
    rightArm.rotation.z = -Math.PI / 4;
    
    // Reset flapping state
    playerBody.userData.isFlapping = false;
    playerBody.userData.flapTime = 0;
    
    // Specific transitions
    if (oldState === BALLOON_STATE && newState === PLATFORMER_STATE) {
        // Transitioning from balloon to platformer
        // Change player color to indicate platformer mode
        const body = playerBody.children.find(child => 
            child.geometry && child.geometry.type === 'CylinderGeometry' && 
            child.position.y === 1
        );
        
        if (body && body.material) {
            // Save original color
            if (!body.userData) body.userData = {};
            body.userData.originalColor = body.material.color.clone();
            
            // Change to platformer color (blue)
            body.material.color.set(0x0066ff);
        }
    } 
    else if (oldState === PLATFORMER_STATE && newState === BALLOON_STATE) {
        // Transitioning from platformer to balloon
        // Give a small upward boost when gaining balloons
        playerVelocity.y = Math.max(playerVelocity.y, 0.1);
        
        // Restore original player color
        const body = playerBody.children.find(child => 
            child.geometry && child.geometry.type === 'CylinderGeometry' && 
            child.position.y === 1
        );
        
        if (body && body.material && body.userData && body.userData.originalColor) {
            body.material.color.copy(body.userData.originalColor);
        }
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
    } else if (wasOnSurface) {
        // Increment coyote time when just left surface
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
        
        // Jump animation - arms at sides for platformer style
        leftArm.rotation.z = 0;
        rightArm.rotation.z = 0;
        
        // Add a slight forward lean
        playerBody.rotation.x = 0.2;
        
        setTimeout(() => {
            leftArm.rotation.z = Math.PI / 4;
            rightArm.rotation.z = -Math.PI / 4;
            playerBody.rotation.x = 0;
        }, 300);
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

// Update physics for balloon state (1-3 balloons)
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
    } 
    else if (balloons.length === 2) {
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
            } 
            else if (balloons.length === 2) {
                // Medium boost with 2 balloons - enough to gain height
                flapStrength = FLAP_FORCE * 1.5;
                
                // Add extra boost when in a descent
                if (playerVelocity.y < 0) {
                    // Extra boost when falling to better counteract gravity
                    flapStrength *= 1.3;
                }
            }
            else if (balloons.length === 1) {
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

// Update movement controls
function updateMovementControls() {
    if (isPointerLocked) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();
        
        // Base movement force
        let movementForce = 0.015;
        
        // Apply air control modifier based on state
        if (!playerBody.userData.isOnSurface) {
            if (currentPhysicsState === PLATFORMER_STATE) {
                movementForce *= PLATFORMER_AIR_CONTROL;
            } else {
                movementForce *= BALLOON_AIR_CONTROL;
            }
        }
        
        if (keys.w) playerVelocity.add(forward.multiplyScalar(movementForce));
        if (keys.s) playerVelocity.add(forward.multiplyScalar(-movementForce));
        if (keys.a) playerVelocity.add(right.multiplyScalar(-movementForce));
        if (keys.d) playerVelocity.add(right.multiplyScalar(movementForce));
    } else {
        // Similar logic for non-pointer locked mode
        let movementForce = 0.015;
        
        // Apply air control modifier based on state
        if (!playerBody.userData.isOnSurface) {
            if (currentPhysicsState === PLATFORMER_STATE) {
                movementForce *= PLATFORMER_AIR_CONTROL;
            } else {
                movementForce *= BALLOON_AIR_CONTROL;
            }
        }
        
        if (keys.w) playerVelocity.z -= movementForce;
        if (keys.s) playerVelocity.z += movementForce;
        if (keys.a) playerVelocity.x -= movementForce;
        if (keys.d) playerVelocity.x += movementForce;
    }
}

function updateCharactersOnPlatforms() {
    // Get all characters (both player and NPCs)
    const allCharacters = Player.allPlayers || [];
    
    for (const character of allCharacters) {
        // Skip if character is not on a platform
        if (!character.userData || !character.userData.currentPlatform) continue;
        
        const platform = character.userData.currentPlatform;
        
        // Skip non-moving platforms
        if (!platform.userData || !platform.userData.type || platform.userData.type === 'static') continue;
        
        if (platform.userData.type === 'rotating_horizontal') {
            // For horizontal rotating platforms, rotate character position around Y axis
            const center = platform.userData.center;
            const angle = platform.userData.rotationSpeed;
            
            // Get character position relative to platform center
            const relX = character.position.x - center.x;
            const relZ = character.position.z - center.z;
            
            // Rotate this position
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            const newRelX = relX * cosAngle - relZ * sinAngle;
            const newRelZ = relX * sinAngle + relZ * cosAngle;
            
            // Update character position
            character.position.x = center.x + newRelX;
            character.position.z = center.z + newRelZ;
            
            // Also rotate the character to face the new direction
            character.rotation.y += angle;
        }
        else if (platform.userData.type === 'rotating_vertical') {
            // For vertical rotating platforms, complex rotation around Z axis
            const center = platform.userData.center;
            const angle = platform.userData.rotationSpeed;
            
            // Get character position relative to platform center
            const relX = character.position.x - center.x;
            const relY = character.position.y - center.y;
            
            // Rotate this position
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            const newRelX = relX * cosAngle - relY * sinAngle;
            const newRelY = relX * sinAngle + relY * cosAngle;
            
            // Update character position
            character.position.x = center.x + newRelX;
            character.position.y = center.y + newRelY;
        }
        else if (platform.userData.type === 'orbital' || platform.userData.type === 'elevator') {
            // For platforms that move without rotation, just add the delta
            const deltaX = platform.position.x - platform.userData.lastPosition.x;
            const deltaY = platform.position.y - platform.userData.lastPosition.y;
            const deltaZ = platform.position.z - platform.userData.lastPosition.z;
            
            character.position.x += deltaX;
            character.position.y += deltaY;
            character.position.z += deltaZ;
        }
    }
}

// Update player shadow
function updatePlayerShadow() {
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
    
    // Get the number of platforms found
    const platformCount = platforms.length;
    
    for (const platform of platforms) {
        // Get platform dimensions and position
        const width = platform.geometry.parameters.width;
        const depth = platform.geometry.parameters.depth;
        const px = platform.position.x;
        const py = platform.position.y;
        const pz = platform.position.z;
        
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
    
    // Set the camera rotation order to match our control scheme
    camera.rotation.order = "YXZ";
}
