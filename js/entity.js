// entity.js - Specialized character classes for Player and NPCs
import * as THREE from 'three';
import { scene } from './scene.js';
import { Character, allCharacters, GRAVITY, FLAP_FORCE, MOVEMENT_FORCE, AIR_RESISTANCE, BALLOON_BUOYANCY, VERTICAL_DRAG, MAX_VELOCITY } from './character.js';
import { platforms } from './environment.js';
import { keys } from './input.js';

// ==========================================
// PLAYER CLASS
// ==========================================

// Player-specific exports (maintained for backward compatibility)
export let playerBody;
export let balloons = [];
export let playerVelocity = new THREE.Vector3(0, 0, 0);
export let shadow;
export let leftArm, rightArm;
export let leftLeg, rightLeg;
export let flapTime = 0;
export let isFlapping = false;
export let playerInvincibilityTime = 0;
export let walkCycle = 0;

export class Player extends Character {
  constructor(x, y, z, color, name) {
    super(x, y, z, color, name || "Player");
    this.isLocalPlayer = true;
    this.userData.isLocalPlayer = true;
    this.createShadow();
  }

  createShadow() {
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
    this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2; // Lay flat on the ground
    this.shadow.position.y = 0.01; // Slightly above ground level (0) to avoid z-fighting
    scene.add(this.shadow);
    // Add this after creating the shadow
    this.shadow.visible = true;
    this.shadow.renderOrder = 1; // Make sure it renders above other objects
    
    // Store reference
    shadow = this.shadow;
  }
  
  // Override startFlapping to handle player-specific logic
  startFlapping() {
    super.startFlapping();
    isFlapping = true;
    flapTime = 0;
  }
  
  // Override stopFlapping to handle player-specific logic
  stopFlapping() {
    super.stopFlapping();
    isFlapping = false;
  }
  
  // Update player position and shadow
  updateShadow() {
    if (this.shadow) {
      // Position shadow beneath player
      this.shadow.position.x = this.entity.position.x;
      this.shadow.position.z = this.entity.position.z;
      
      // Calculate shadow size based on height (smaller when higher)
      const height = Math.max(0.5, this.entity.position.y);
      const scale = 1 / (height * 0.5);
      this.shadow.scale.set(scale, scale, scale);
      
      // Adjust opacity based on height
      this.shadow.material.opacity = Math.min(0.6, 1 / (height * 0.5));
    }
  }
  
  // Set player invincibility
  setInvincibility(frames) {
    this.userData.invincibleTime = frames;
    playerInvincibilityTime = frames;
  }
}

// Initialize the player
export function initPlayer() {
  console.log("Starting player initialization");

  // Create player instance
  const player = new Player(0, 0.5, 0, 0xff0000);
  playerBody = player.entity;
  
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
  
  // Set global references for backward compatibility
  leftArm = player.userData.leftArm;
  rightArm = player.userData.rightArm;
  leftLeg = player.userData.leftLeg;
  rightLeg = player.userData.rightLeg;
  
  // Add to characters array
  allCharacters.push(player);
  
  return player;
}

// ==========================================
// NPC CLASS
// ==========================================

export class NPC extends Character {
  constructor(x, y, z, color, platform, name) {
    super(x, y, z, color, name || `NPC-${allCharacters.length}`);
    
    // NPC-specific properties
    this.userData.platform = platform;
    this.userData.isLocalPlayer = false;
    this.userData.moveDirection = new THREE.Vector3(
      Math.random() - 0.5,      // x
      0,                        // y (no vertical direction initially)
      Math.random() - 0.5       // z
    ).normalize();
    this.userData.moveSpeed = 0.02 + Math.random() * 0.03;
    this.userData.isOnSurface = true;
    this.userData.currentPlatform = platform;
    
    // Random number of balloons (1-3)
    const balloonCount = 1 + Math.floor(Math.random() * 3);
    const balloonColors = [];
    for (let i = 0; i < balloonCount; i++) {
      balloonColors.push(new THREE.Color(Math.random(), Math.random(), Math.random()));
    }
    this.addBalloons(balloonCount, balloonColors);
  }
  
  // Update NPC-specific movement
  updateAIMovement() {
    const platform = this.userData.platform;
    if (!platform) return;
    
    // Get platform dimensions
    const platformWidth = platform.geometry.parameters.width;
    const platformDepth = platform.geometry.parameters.depth;
    const halfWidth = platformWidth / 2 - 1; // Stay 1 unit from edge
    const halfDepth = platformDepth / 2 - 1;
    
    // Update animation time
    this.userData.animationTime += 0.03;
    
    // Make NPCs occasionally change direction
    if (Math.random() < 0.02) {
      this.userData.moveDirection = new THREE.Vector3(
        Math.random() - 0.5,
        0,                    // Keep y at 0 for horizontal movement
        Math.random() - 0.5
      ).normalize();
    }
    
    // Calculate new velocity
    const moveDir = this.userData.moveDirection;
    this.userData.velocity.x = moveDir.x * this.userData.moveSpeed;
    this.userData.velocity.z = moveDir.z * this.userData.moveSpeed;
    
    // Apply movement
    this.entity.position.x += this.userData.velocity.x;
    this.entity.position.z += this.userData.velocity.z;
    
    // Keep NPC on platform
    const platformX = platform.position.x;
    const platformZ = platform.position.z;
    
    // If reaching platform edge, bounce
    if (this.entity.position.x > platformX + halfWidth) {
      this.entity.position.x = platformX + halfWidth;
      this.userData.moveDirection.x *= -1;
    } else if (this.entity.position.x < platformX - halfWidth) {
      this.entity.position.x = platformX - halfWidth;
      this.userData.moveDirection.x *= -1;
    }
    
    if (this.entity.position.z > platformZ + halfDepth) {
      this.entity.position.z = platformZ + halfDepth;
      this.userData.moveDirection.z *= -1;
    } else if (this.entity.position.z < platformZ - halfDepth) {
      this.entity.position.z = platformZ - halfDepth;
      this.userData.moveDirection.z *= -1;
    }
    
    // Make NPC face movement direction
    if (this.userData.velocity.x !== 0 || this.userData.velocity.z !== 0) {
      this.entity.rotation.y = Math.atan2(this.userData.velocity.x, this.userData.velocity.z);
    }
    
    // Occasional random jumping/flapping
    if (Math.random() < 0.01 && !this.userData.isFlapping) {
      this.startFlapping();
      this.entity.position.y += 0.2; // Small hop
    }
    
    // Reset flapping animation
    if (this.userData.isFlapping) {
      this.userData.flapTime++;
      if (this.userData.flapTime > 10) {
        this.stopFlapping();
      }
    }
  }
}

// NPCs collection
export const npcs = [];

// Create a set of NPCs on platforms
export function initNPCs() {
  // Create an NPC on the first platform
  if (platforms.length > 0) {
    createNPC(
      platforms[0].position.x,
      platforms[0].position.y + 1, // 1 unit above platform
      platforms[0].position.z,
      0xff0000, // Red
      platforms[0] // The platform this NPC is on
    );
  }
  
  // Create an NPC on the third platform if it exists
  if (platforms.length > 2) {
    createNPC(
      platforms[2].position.x,
      platforms[2].position.y + 1,
      platforms[2].position.z,
      0x00ff00, // Green
      platforms[2]
    );
  }
  
  // Create an NPC on the fifth platform if it exists
  if (platforms.length > 4) {
    createNPC(
      platforms[4].position.x,
      platforms[4].position.y + 1,
      platforms[4].position.z,
      0x0000ff, // Blue
      platforms[4]
    );
  }
}

// Create a single NPC
function createNPC(x, y, z, color, platform, name) {
  const npc = new NPC(x, y, z, color, platform, name);
  npcs.push(npc);
  allCharacters.push(npc);
  return npc;
}

// Update all NPCs
export function updateNPCs() {
  for (const npc of npcs) {
    if (npc.balloons.length > 0) {
      npc.updateAIMovement();
    }
  }
}

// ==========================================
// RESPAWN FUNCTIONS
// ==========================================

// Respawn an NPC after they fall
export function respawnNPC() {
  if (platforms.length > 0) {
    // Choose a random platform
    const platformIndex = Math.floor(Math.random() * platforms.length);
    const platform = platforms[platformIndex];
    
    // Create a new NPC on this platform
    return createNPC(
      platform.position.x,
      platform.position.y + 1, // 1 unit above platform
      platform.position.z,
      new THREE.Color(Math.random(), Math.random(), Math.random()),
      platform,
      `NPC-${Math.floor(Math.random() * 100)}`
    );
  }
  return null;
}