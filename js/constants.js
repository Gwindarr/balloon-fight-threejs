/**
 * constants.js - Centralized physics and game constants
 */

// Physics states
export const PLATFORMER_STATE = 'platformer';
export const BALLOON_STATE = 'balloon';

// Physics constants
export const GRAVITY = 0.015;                      // Units per frame
export const BALLOON_BUOYANCY = 0.005;             // Per balloon (increased from 0.004)
export const VERTICAL_DRAG = 0.98;                 // Vertical movement dampening
export const MAX_VELOCITY = 0.3;                   // Maximum movement speed
export const AIR_RESISTANCE = 0.98;                // Horizontal movement dampening
export const FLAP_FORCE = 0.14;                    // Force applied when flapping (increased from 0.13)
export const FLAP_COOLDOWN = 8;                    // Frames between flaps
export const MOVEMENT_FORCE = 0.008;               // Base movement force

// Platformer state constants
export const PLATFORMER_GRAVITY = 0.075;           // Increased for more responsive falling
export const PLATFORMER_JUMP_FORCE = 1.7;          // Increased to feel more like Roblox-style jumps
export const PLATFORMER_DOUBLE_JUMP_FORCE = 1.2;   // Increased from 0.6 for a better double jump
export const PLATFORMER_GLIDE_FACTOR = 0.5;
export const PLATFORMER_AIR_CONTROL = 0.95;        // Further increased for Roblox-like air control
export const PLATFORMER_GROUND_FRICTION = 0.92;
export const PLATFORMER_MIN_JUMP_FORCE = 0.9;      // Increased from 0.5 for better variable jump height
export const PLATFORMER_AIR_DRAG = 0.95;           // Increased from 0.85 for a less floaty fall
export const JUMP_BUFFER_FRAMES = 8;

// Balloon mode constants
export const BALLOON_GRAVITY = 0.011;              // Gravity when in balloon mode (reduced from 0.012)
export const BALLOON_JUMP_FORCE_BASE = 0.32;       // Base jump force (increased from 0.3)
export const BALLOON_JUMP_FORCE_PER_BALLOON = 0.07;// Additional force per balloon (increased from 0.06)
export const BALLOON_GROUND_FRICTION = 0.92;       // Ground friction in balloon mode
export const BALLOON_AIR_CONTROL = 0.85;           // Air control in balloon mode (increased from 0.8)

// Collision constants
export const BALLOON_RADIUS = 0.6;                 // Size of balloon hitbox

// Removed Mushroom constants

// Collision system constants
export const GROUND_LEVEL = 0;
export const PLAYER_HEIGHT = 1.0;
export const PLAYER_RADIUS = 0.6;
export const BOUNCE_FACTOR = 0.3;
export const WATER_LEVEL = 0.1;
export const WATER_RESISTANCE = 0.92;
export const BOUNDARY_X = 200;
export const BOUNDARY_Z = 200;
export const PLATFORM_COLLISION_MARGIN = 0.25; // Significantly increased for very forgiving landings
export const PLATFORMER_COYOTE_TIME = 6;
