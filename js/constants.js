/**
 * constants.js - Centralized physics and game constants
 */

// Physics states
export const PLATFORMER_STATE = 'platformer';
export const BALLOON_STATE = 'balloon';

// Physics constants
export const GRAVITY = 0.015;                      // Units per frame
export const BALLOON_BUOYANCY = 0.006;             // Per balloon
export const VERTICAL_DRAG = 0.98;                 // Vertical movement dampening
export const MAX_VELOCITY = 0.3;                   // Maximum movement speed
export const AIR_RESISTANCE = 0.98;                // Horizontal movement dampening
export const FLAP_FORCE = 0.13;                    // Force applied when flapping
export const FLAP_COOLDOWN = 8;                    // Frames between flaps
export const MOVEMENT_FORCE = 0.008;               // Base movement force

// Platformer state constants
export const PLATFORMER_GRAVITY = 0.06;            // Reduced from 0.12 for a more forgiving jump arc
export const PLATFORMER_JUMP_FORCE = 1.5;          // Increased from 0.8 for a higher jump
export const PLATFORMER_DOUBLE_JUMP_FORCE = 1.2;   // Increased from 0.6 for a better double jump
export const PLATFORMER_GLIDE_FACTOR = 0.5;
export const PLATFORMER_AIR_CONTROL = 0.9;         // Increased from 0.8 for better air control
export const PLATFORMER_GROUND_FRICTION = 0.92;
export const PLATFORMER_MIN_JUMP_FORCE = 0.9;      // Increased from 0.5 for better variable jump height
export const PLATFORMER_AIR_DRAG = 0.95;           // Increased from 0.85 for a less floaty fall
export const JUMP_BUFFER_FRAMES = 8;

// Balloon mode constants
export const BALLOON_GRAVITY = 0.012;              // Gravity when in balloon mode
export const BALLOON_JUMP_FORCE_BASE = 0.3;        // Base jump force
export const BALLOON_JUMP_FORCE_PER_BALLOON = 0.06;// Additional force per balloon

// Collision constants
export const BALLOON_RADIUS = 0.6;                 // Size of balloon hitbox
export const PLAYER_HEIGHT = 2.0;                  // Player character height
