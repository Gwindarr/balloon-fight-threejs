// entity.js - Specialized character classes for Player and NPCs
import * as THREE from 'three';
import { scene } from './scene.js';
import { platforms } from './environment.js';
import { Character, allCharacters } from './character.js';
import { GROUND_LEVEL, PLAYER_HEIGHT, PLAYER_RADIUS, WATER_LEVEL } from './constants.js';

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
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    scene.add(this.shadow);
    this.shadow.visible = true;
    this.shadow.renderOrder = 1;
    shadow = this.shadow;
  }

  startFlapping() {
    super.startFlapping();
    isFlapping = true;
    flapTime = 0;
  }

  stopFlapping() {
    super.stopFlapping();
    isFlapping = false;
  }

  updateShadow() {
    if (this.shadow) {
      this.shadow.position.x = this.entity.position.x;
      this.shadow.position.z = this.entity.position.z;
      const height = Math.max(0.5, this.entity.position.y);
      const scale = 1 / (height * 0.5);
      this.shadow.scale.set(scale, scale, scale);
      this.shadow.material.opacity = Math.min(0.6, 1 / (height * 0.5));
    }
  }

  setInvincibility(frames) {
    this.userData.invincibleTime = frames;
    playerInvincibilityTime = frames;
  }
}

export function initPlayer() {
  console.log("Starting player initialization");
  const player = new Player(0, 0.5, 0, 0xff0000);
  playerBody = player.entity;
  playerBody.userData.id = player.userData.id;
  player.addBalloons(3, [0xff0000, 0x0000ff, 0x00ff00]);
  balloons = player.balloons;
  if (platforms.length > 0) {
    const startPlatform = platforms[0];
    playerBody.position.x = startPlatform.position.x;
    playerBody.position.y = startPlatform.position.y + 0.5;
    playerBody.position.z = startPlatform.position.z;
  }
  playerVelocity.set(0, 0, 0);
  leftArm = player.userData.leftArm;
  rightArm = player.userData.rightArm;
  leftLeg = player.userData.leftLeg;
  rightLeg = player.userData.rightLeg;
  allCharacters.push(player);
  return player;
}

// ==========================================
// NPC CLASS
// ==========================================

export class NPC extends Character {
  constructor(x, y, z, color, platform, name) {
    super(x, y, z, color, name || `NPC-${allCharacters.length}`);
    this.userData.platform = platform;
    this.userData.isLocalPlayer = false;
    this.userData.moveDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    this.userData.moveSpeed = 0.02 + Math.random() * 0.03;
    this.userData.isOnSurface = true;
    this.userData.currentPlatform = platform;
    const balloonCount = 1 + Math.floor(Math.random() * 3);
    const balloonColors = [];
    for (let i = 0; i < balloonCount; i++) {
      balloonColors.push(new THREE.Color(Math.random(), Math.random(), Math.random()));
    }
    this.addBalloons(balloonCount, balloonColors);
  }

  updateAIMovement() {
    const platform = this.userData.platform;
    if (!platform) return;
    const platformWidth = platform.geometry.parameters.width;
    const platformDepth = platform.geometry.parameters.depth;
    const halfWidth = platformWidth / 2 - 1;
    const halfDepth = platformDepth / 2 - 1;
    this.userData.animationTime += 0.03;
    if (Math.random() < 0.02) {
      this.userData.moveDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    }
    const moveDir = this.userData.moveDirection;
    this.userData.velocity.x = moveDir.x * this.userData.moveSpeed;
    this.userData.velocity.z = moveDir.z * this.userData.moveSpeed;
    this.entity.position.x += this.userData.velocity.x;
    this.entity.position.z += this.userData.velocity.z;
    const platformX = platform.position.x;
    const platformZ = platform.position.z;
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
    if (this.userData.velocity.x !== 0 || this.userData.velocity.z !== 0) {
      this.entity.rotation.y = Math.atan2(this.userData.velocity.x, this.userData.velocity.z);
    }
    if (Math.random() < 0.01 && !this.userData.isFlapping) {
      this.startFlapping();
      this.entity.position.y += 0.2;
    }
    if (this.userData.isFlapping) {
      this.userData.flapTime++;
      if (this.userData.flapTime > 10) {
        this.stopFlapping();
      }
    }
  }
}

export const npcs = [];

export function initNPCs() {
  console.log("Initializing NPCs");
  if (platforms.length > 0) {
    const npc1 = createNPC(platforms[0].position.x, platforms[0].position.y + 1, platforms[0].position.z, 0xff0000, platforms[0], "NPC1");
    console.log("Created NPC 1:", npc1);
  }
  if (platforms.length > 2) {
    const npc2 = createNPC(platforms[2].position.x, platforms[2].position.y + 1, platforms[2].position.z, 0x00ff00, platforms[2], "NPC2");
    console.log("Created NPC 2:", npc2);
  }
  if (platforms.length > 4) {
    const npc3 = createNPC(platforms[4].position.x, platforms[4].position.y + 1, platforms[4].position.z, 0x0000ff, platforms[4], "NPC3");
    console.log("Created NPC 3:", npc3);
  }
  console.log("NPCs initialized, total characters:", allCharacters.length);
}

function createNPC(x, y, z, color, platform, name) {
  const npc = new NPC(x, y, z, color, platform, name);
  npcs.push(npc);
  allCharacters.push(npc);
  return npc;
}

export function updateNPCs() {
  for (const npc of npcs) {
    if (npc.balloons.length > 0) {
      npc.updateAIMovement();
    }
  }
}

export function respawnNPC() {
  if (platforms.length > 0) {
    const platformIndex = Math.floor(Math.random() * platforms.length);
    const platform = platforms[platformIndex];
    return createNPC(
      platform.position.x,
      platform.position.y + 1,
      platform.position.z,
      new THREE.Color(Math.random(), Math.random(), Math.random()),
      platform,
      `NPC-${Math.floor(Math.random() * 100)}`
    );
  }
  return null;
}
