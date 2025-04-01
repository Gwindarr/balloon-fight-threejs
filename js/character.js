// character.js - Base class for all characters (players and NPCs)
import * as THREE from 'three';
import { scene } from './scene.js';
import { createPopEffect } from './effects.js';
import {
  GRAVITY,
  BALLOON_BUOYANCY,
  VERTICAL_DRAG,
  MAX_VELOCITY,
  AIR_RESISTANCE,
  FLAP_FORCE,
  FLAP_COOLDOWN,
  MOVEMENT_FORCE
} from './constants.js';

// Array to hold all character instances
export const allCharacters = [];

// Character class to be extended by Player and NPC
export class Character {
  constructor(x, y, z, color, name) {
    this.entity = this.createCharacterMesh(x, y, z, color);
    this.balloons = [];
    this.userData = {
      name: name || "Character",
      velocity: new THREE.Vector3(0, 0, 0),
      isFlapping: false,
      flapTime: 0,
      invincibleTime: 0,
      balloons: this.balloons,
      animationTime: Math.random() * Math.PI * 2,
      leftArm: null,
      rightArm: null,
      leftLeg: null,
      rightLeg: null,
      isOnSurface: false,
      currentPlatform: null,
      moveSpeed: 0.05,
      moveDirection: new THREE.Vector3(0, 0, 0),
      walkCycle: 0
    };

    // Also store userData on the entity itself for proper reference during collision
    this.entity.userData = this.userData;

    // Store references to body parts for animations
    this.userData.leftArm = this.findChildByName(this.entity, "leftArm");
    this.userData.rightArm = this.findChildByName(this.entity, "rightArm");
    this.userData.leftLeg = this.findChildByName(this.entity, "leftLeg");
    this.userData.rightLeg = this.findChildByName(this.entity, "rightLeg");
  }

  // Store references to foot collision objects
  get leftFoot() {
    return this.findChildByName(this.entity, "leftFoot");
  }

  get rightFoot() {
    return this.findChildByName(this.entity, "rightFoot");
  }

  // Create character mesh with all parts
  createCharacterMesh(x, y, z, color) {
    const character = new THREE.Group();
    character.position.set(x, y, z);

    // Body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1; // Center at y=1 for better physics
    body.name = "body";
    character.add(body);

    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5; // Above body
    head.name = "head";
    character.add(head);

    // Add eyes to indicate front direction
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 2.55, 0.45);
    character.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 2.55, 0.45);
    character.add(rightEye);

    // Initialize character rotation
    character.rotation.set(0, 0, 0);

    // Arms (cylinders)
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: color });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.name = "leftArm";
    character.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.5, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.name = "rightArm";
    character.add(rightArm);

    // Legs (cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.1, 0);
    leftLeg.name = "leftLeg";
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.1, 0);
    rightLeg.name = "rightLeg";
    character.add(rightLeg);

    // Feet (box geometry)
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const footMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    const leftFootMesh = new THREE.Mesh(footGeometry, footMaterial);
    leftFootMesh.position.set(-0.3, -0.55, 0.1);
    leftFootMesh.name = "leftFootMesh";
    character.add(leftFootMesh);

    const rightFootMesh = new THREE.Mesh(footGeometry, footMaterial);
    rightFootMesh.position.set(0.3, -0.55, 0.1);
    rightFootMesh.name = "rightFootMesh";
    character.add(rightFootMesh);

    // Create feet collision triangles for precise balloon collision detection

    // Left foot - upside down triangle
    const leftFootVertices = new Float32Array([
        -0.4, -0.5, 0.2,   // top left
        -0.2, -0.5, 0.2,   // top right
        -0.3, -1.0, 0.3,   // bottom center (slightly forward to match leg direction)
    ]);

    // Right foot - upside down triangle
    const rightFootVertices = new Float32Array([
        0.2, -0.5, 0.2,    // top left
        0.4, -0.5, 0.2,    // top right
        0.3, -1.0, 0.3,    // bottom center (slightly forward to match leg direction)
    ]);

    const leftFootGeometry = new THREE.BufferGeometry();
    leftFootGeometry.setAttribute('position', new THREE.BufferAttribute(leftFootVertices, 3));
    leftFootGeometry.computeVertexNormals();

    const rightFootGeometry = new THREE.BufferGeometry();
    rightFootGeometry.setAttribute('position', new THREE.BufferAttribute(rightFootVertices, 3));
    rightFootGeometry.computeVertexNormals();

    // Create invisible meshes for feet collision detection
    const footCollisionMaterial = new THREE.MeshBasicMaterial({
      visible: false
    });

    const leftFoot = new THREE.Mesh(leftFootGeometry, footCollisionMaterial);
    leftFoot.name = "leftFoot";
    character.add(leftFoot);

    const rightFoot = new THREE.Mesh(rightFootGeometry, footCollisionMaterial);
    rightFoot.name = "rightFoot";
    character.add(rightFoot);

    scene.add(character);
    return character;
  }

  // Add balloons to character
  addBalloons(count, colors) {
    if (!colors) colors = [0xff0000, 0x0000ff, 0x00ff00];

    for (let i = 0; i < count; i++) {
      const color = i < colors.length ? colors[i] :
        new THREE.Color(Math.random(), Math.random(), Math.random());

      this.createBalloon(
        (i - 1) * 0.6, // X offset
        4 + Math.random() * 0.5, // Y position (higher than before)
        0, // Z offset
        color
      );
    }
  }

  // Create and attach a balloon
  createBalloon(x, y, z, color) {
    const balloonGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const balloonMaterial = new THREE.MeshLambertMaterial({ color });
    const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
    balloon.position.set(x, y, z);

    // Add string
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -1.5, 0)
    ]);
    const string = new THREE.Line(
      stringGeometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    balloon.add(string);

    this.entity.add(balloon);
    this.balloons.push(balloon);
    this.userData.balloons = this.balloons;

    return balloon;
  }

  // Animation functions
  startFlapping() {
    if (this.userData.isFlapping) return;

    this.userData.isFlapping = true;
    this.userData.flapTime = 0;

    if (this.userData.leftArm) this.userData.leftArm.rotation.z = Math.PI / 2;
    if (this.userData.rightArm) this.userData.rightArm.rotation.z = -Math.PI / 2;
  }

  stopFlapping() {
    if (!this.userData.isFlapping) return;

    this.userData.isFlapping = false;
    if (this.userData.leftArm) this.userData.leftArm.rotation.z = Math.PI / 4;
    if (this.userData.rightArm) this.userData.rightArm.rotation.z = -Math.PI / 4;
  }

  // Animate balloons with bobbing motion
  animateBalloons() {
    this.userData.animationTime += 0.03;
    const time = this.userData.animationTime;

    this.balloons.forEach((balloon, i) => {
      balloon.position.y = 4 + Math.sin(time + i) * 0.1;
      balloon.position.x = (i - 1) * 0.6 + Math.sin(time * 0.5 + i * 2) * 0.1;
      balloon.position.z = Math.cos(time * 0.3 + i) * 0.1;
      balloon.rotation.x = Math.sin(time * 0.5) * 0.1;
      balloon.rotation.z = Math.cos(time * 0.3) * 0.1;
    });
  }

  // Helper to find child mesh by name
  findChildByName(parent, name) {
    return parent.children.find(child => child.name === name) || null;
  }

  // Pop a balloon from character
  popBalloon(balloon, createPopEffectFn = createPopEffect) {
    if (this.userData.invincibleTime > 0 || !this.balloons?.length) {
      return false;
    }

    balloon = balloon || this.balloons[this.balloons.length - 1];
    const balloonWorldPos = new THREE.Vector3();
    balloon.getWorldPosition(balloonWorldPos);

    // Remove balloon
    const index = this.balloons.indexOf(balloon);
    if (index !== -1) {
      this.balloons.splice(index, 1);
    }

    this.entity.remove(balloon);

    if (createPopEffectFn) {
      createPopEffectFn(balloonWorldPos);
    }

    this.userData.invincibleTime = 60; // 1 second at 60fps
    console.log(`${this.userData.name} lost a balloon! ${this.balloons.length} remaining.`);

    if (this.balloons.length === 0) {
      console.log(`${this.userData.name} lost all balloons and is falling!`);
    }

    return true;
  }

  // Update character invincibility state
  updateInvincibility() {
    if (this.userData.invincibleTime > 0) {
      this.userData.invincibleTime--;

      // Flash effect during invincibility
      this.entity.visible = Math.floor(Date.now() / 100) % 2 === 0;
    } else {
      this.entity.visible = true;
    }
  }

  // Animate walking
  animateWalking(isMoving, speed = 1) {
    // Skip falling animation if jumping
    if (this.userData.isJumping) {
      // Keep arms in neutral position during jump
      if (this.userData.leftArm) this.userData.leftArm.rotation.z = Math.PI / 4;
      if (this.userData.rightArm) this.userData.rightArm.rotation.z = -Math.PI / 4;
      return;
    }

    // Only animate if player is moving and limbs exist
    if (!isMoving) {
      // Reset to default pose when not moving
      if (this.userData.leftLeg) this.userData.leftLeg.rotation.x = 0;
      if (this.userData.rightLeg) this.userData.rightLeg.rotation.x = 0;
      if (this.userData.leftArm) this.userData.leftArm.rotation.z = Math.PI / 4;
      if (this.userData.rightArm) this.userData.rightArm.rotation.z = -Math.PI / 4;

      // Reset foot positions
      const leftFootMesh = this.findChildByName(this.entity, "leftFootMesh");
      const rightFootMesh = this.findChildByName(this.entity, "rightFootMesh");

      if (leftFootMesh) leftFootMesh.position.set(-0.3, -0.55, 0.1);
      if (rightFootMesh) rightFootMesh.position.set(0.3, -0.55, 0.1);

      return;
    }

    // Update walk cycle
    this.userData.walkCycle += 0.15 * speed;

    // Animate legs if they exist
    if (this.userData.leftLeg && this.userData.rightLeg) {
      this.userData.leftLeg.rotation.x = Math.sin(this.userData.walkCycle) * 0.5;
      this.userData.rightLeg.rotation.x = Math.sin(this.userData.walkCycle + Math.PI) * 0.5;
    }

    // Animate arms if they exist (opposite to legs for natural walking motion)
    if (this.userData.leftArm && this.userData.rightArm) {
      this.userData.leftArm.rotation.z = Math.PI / 4 + Math.sin(this.userData.walkCycle + Math.PI) * 0.3;
      this.userData.rightArm.rotation.z = -Math.PI / 4 + Math.sin(this.userData.walkCycle) * 0.3;
    }

    // Add a slight body bob
    if (this.entity) {
      this.entity.position.y += Math.abs(Math.sin(this.userData.walkCycle * 2)) * 0.02;
    }
  }

  // Set running state with enhanced animation
  setRunningState(isRunning) {
    if (!this.entity) return;

    if (isRunning) {
      // Running animation - faster walk cycle
      this.userData.walkCycle += 0.25;

      // More exaggerated leg movement
      if (this.userData.leftLeg && this.userData.rightLeg) {
        this.userData.leftLeg.rotation.x = Math.sin(this.userData.walkCycle) * 0.7;
        this.userData.rightLeg.rotation.x = Math.sin(this.userData.walkCycle + Math.PI) * 0.7;
      }

      // Arms more active
      if (this.userData.leftArm && this.userData.rightArm) {
        this.userData.leftArm.rotation.z = Math.PI / 4 + Math.sin(this.userData.walkCycle + Math.PI) * 0.5;
        this.userData.rightArm.rotation.z = -Math.PI / 4 + Math.sin(this.userData.walkCycle) * 0.5;
      }

      // Lean forward slightly when running
      this.entity.rotation.x = 0.15;

      // Enhanced running animation
      const runIntensity = 1.5;
      this.entity.position.y += Math.abs(Math.sin(this.userData.walkCycle * 3)) * 0.05 * runIntensity;
      this.entity.rotation.x = Math.sin(this.userData.walkCycle * 3) * 0.1 * runIntensity;
      this.entity.rotation.z = Math.sin(this.userData.walkCycle * 1.5) * 0.05 * runIntensity;

      // Visual feedback - character leans forward when running
      this.entity.position.z -= Math.abs(Math.sin(this.userData.walkCycle * 1.5)) * 0.02 * runIntensity;
    } else {
      // Reset to normal walking pose
      this.entity.rotation.x = 0;
      this.entity.rotation.z = 0;
    }
  }
}

// Check for balloon collisions between characters
export function checkBalloonCollisions() {
  // Loop through all characters
  for (let i = 0; i < allCharacters.length; i++) {
    const attackerChar = allCharacters[i];
    const attacker = attackerChar.entity;

    // Skip characters with no balloons (already falling)
    if (!attacker.userData.balloons || attacker.userData.balloons.length === 0) {
      continue;
    }

    // Get attacker's feet for collision detection
    const leftFoot = attackerChar.leftFoot;
    const rightFoot = attackerChar.rightFoot;

    if (!leftFoot || !rightFoot) {
      continue; // Skip if feet not found
    }

    // Get world positions of feet tips
    const leftFootTip = new THREE.Vector3();
    const rightFootTip = new THREE.Vector3();

    try {
      // Simple alternative: just use the bottom of the legs as collision points
      const leftLeg = attackerChar.userData.leftLeg;
      const rightLeg = attackerChar.userData.rightLeg;

      if (!leftLeg || !rightLeg) {
        continue;
      }

      // Get world position of legs
      leftLeg.getWorldPosition(leftFootTip);
      rightLeg.getWorldPosition(rightFootTip);

      // Adjust Y position down to get to the bottom of the legs
      leftFootTip.y -= 0.5;
      rightFootTip.y -= 0.5;
    } catch (error) {
      continue;
    }

    // Check against all other characters
    for (let j = 0; j < allCharacters.length; j++) {
      // Don't check against self
      if (i === j) continue;

      const victimChar = allCharacters[j];
      const victim = victimChar.entity;

      // Skip victims with no balloons
      if (!victim.userData.balloons || victim.userData.balloons.length === 0) {
        continue;
      }

      // Skip if victim is invincible
      if (victim.userData.invincibleTime > 0) {
        continue;
      }

      // Check distance in XZ plane between characters
      const dx = attacker.position.x - victim.position.x;
      const dz = attacker.position.z - victim.position.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      // If close enough to potentially hit balloons
      if (horizontalDist < 3.0) {
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

          // Calculate distance from each foot to the balloon
          const leftFootDist = leftFootTip.distanceTo(balloonWorldPos);
          const rightFootDist = rightFootTip.distanceTo(balloonWorldPos);

          // Use the closest foot for collision detection
          const closestFootDist = Math.min(leftFootDist, rightFootDist);

          // Precise collision detection using foot triangle and balloon sphere
          const collisionThreshold = balloonRadius + 1.0; // Increased collision radius for easier testing
          const inCollisionRange = closestFootDist < collisionThreshold;

          // Check if we're in position to pop this balloon
          const inHorizontalRange = balloonHorizDist < balloonRadius + 0.8;

          // Visual feedback for local player when in position to pop a balloon
          if (attacker.userData.isLocalPlayer && inCollisionRange && inHorizontalRange) {
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

          // Use precise collision detection with foot triangles
          if (inCollisionRange && inHorizontalRange) {
            // Check if attacker is pressing the jump key (space) - for bouncing without popping
            if (attacker.userData.isLocalPlayer && window.keys && window.keys.space) {
              // Balloon jump! - More powerful than regular jump
              attacker.userData.velocity.y = 0.3; // Strong upward boost

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

            // If attacker is local or remote player, always pop
            if (attacker.userData.isLocalPlayer || attacker.userData.isRemotePlayer) {
              shouldPop = true;
              
              // Send network event through multiplayer system
              if (window.multiplayerSocket && window.multiplayerSocket.readyState === WebSocket.OPEN) {
                window.multiplayerSocket.send(JSON.stringify({
                  type: 'balloon_pop',
                  attackerId: attacker.userData.id,
                  victimId: victim.userData.id,
                  balloonIndex: k
                }));
              }
            }
            // If attacker is an NPC, randomly decide to pop player balloons
            else if (victim.userData.isLocalPlayer && !attacker.userData.isLocalPlayer) {
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
              const charAttacker = allCharacters[i]; // Gets Character class instance
              const charVictim = allCharacters[j];   // Gets Character class instance
              // Call popBalloon on the victim's Character instance
              // The network message is already sent earlier if shouldPop is true for a player
              if (charVictim.popBalloon(targetBalloon)) {
                // Removed redundant network message send block

                // Medium upward boost to attacker when popping
                attacker.userData.velocity.y = Math.max(attacker.userData.velocity.y, 0.15);

                // Add a small horizontal push away from the victim
                const pushDirection = new THREE.Vector3(dx, 0, dz).normalize();
                attacker.userData.velocity.x += pushDirection.x * 0.05;
                attacker.userData.velocity.z += pushDirection.z * 0.05;

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

export function updateCharacters() {
  for (let i = allCharacters.length - 1; i >= 0; i--) {
    const character = allCharacters[i];
    const entity = character.entity;

    // Update invincibility
    character.updateInvincibility();

    // Animate balloons if they exist - buoyancy is applied in physics.js
    if (character.balloons.length > 0) {
      character.animateBalloons();
    }
  }
}
