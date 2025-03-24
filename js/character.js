// character.js - Base class for all characters (players and NPCs)
import { scene } from './scene.js';

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
    };
    
    // Store references to arms for animations
    this.userData.leftArm = this.findChildByName(this.entity, "leftArm");
    this.userData.rightArm = this.findChildByName(this.entity, "rightArm");
  }
  
  // Create character mesh with all parts
  createCharacterMesh(x, y, z, color) {
    const character = new THREE.Group();
    character.position.set(x, y, z);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0;
    body.name = "body";
    character.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.name = "head";
    character.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: color });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 0.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.name = "leftArm";
    character.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 0.5, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.name = "rightArm";
    character.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 8);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -1, 0);
    leftLeg.name = "leftLeg";
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -1, 0);
    rightLeg.name = "rightLeg";
    character.add(rightLeg);
    
    scene.add(character);
    return character;
  }
  
  // Create balloons for the character
  addBalloons(count, colors) {
    // Default balloon if no specific colors
    if (!colors) {
      colors = [0xff0000, 0x0000ff, 0x00ff00];
    }
    
    for (let i = 0; i < count; i++) {
      let color;
      if (i < colors.length) {
        color = colors[i];
      } else {
        // Random color if no specific color defined
        color = new THREE.Color(
            Math.random(), 
            Math.random(), 
            Math.random()
        );
      }
      
      this.createBalloon(
        (i - 1) * 0.6, // X offset
        3 + Math.random() * 0.5, // Y position
        0, // Z offset
        color
      );
    }
  }
  
  // Create a single balloon
  createBalloon(x, y, z, color) {
    const balloonGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const balloonMaterial = new THREE.MeshLambertMaterial({ color: color });
    const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
    balloon.position.set(x, y, z);
    
    // String (line)
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), 
      new THREE.Vector3(0, -1.5, 0)
    ]);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const string = new THREE.Line(stringGeometry, stringMaterial);
    balloon.add(string);
    
    this.entity.add(balloon);
    this.balloons.push(balloon);
    
    if (this.userData) {
      this.userData.balloons = this.balloons;
    }
    
    return balloon;
  }
  
  // Animation functions
  startFlapping() {
    if (!this.userData.isFlapping) {
      this.userData.isFlapping = true;
      this.userData.flapTime = 0;
      
      // Animate arms flapping
      if (this.userData.leftArm && this.userData.rightArm) {
        this.userData.leftArm.rotation.z = Math.PI / 2;
        this.userData.rightArm.rotation.z = -Math.PI / 2;
      }
    }
  }
  
  stopFlapping() {
    if (this.userData.isFlapping) {
      this.userData.isFlapping = false;
      
      // Reset arm positions
      if (this.userData.leftArm && this.userData.rightArm) {
        this.userData.leftArm.rotation.z = Math.PI / 4;
        this.userData.rightArm.rotation.z = -Math.PI / 4;
      }
    }
  }
  
  // Animate balloons
  animateBalloons() {
    const time = this.userData.animationTime;
    
    // Increment animation time
    this.userData.animationTime += 0.03;
    
    // Animate each balloon with slight bobbing
    for (let i = 0; i < this.balloons.length; i++) {
      const balloon = this.balloons[i];
      
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
  
  // Helper to find a child mesh by name
  findChildByName(parent, name) {
    for (const child of parent.children) {
      if (child.name === name) {
        return child;
      }
    }
    return null;
  }
  
  // Pop a balloon
  popBalloon(balloon, createPopEffectFn) {
    // If invincible, don't pop balloon
    if (this.userData.invincibleTime > 0) {
      return false;
    }
    
    // If no balloons left, return
    if (!this.balloons || this.balloons.length === 0) {
      return false;
    }
    
    // If no specific balloon is provided, pop the last one
    if (!balloon) {
      balloon = this.balloons[this.balloons.length - 1];
    }
    
    // Get balloon position in world coordinates before removing
    const balloonWorldPos = new THREE.Vector3();
    balloon.getWorldPosition(balloonWorldPos);
    
    // Remove from balloon array
    const balloonIndex = this.balloons.indexOf(balloon);
    if (balloonIndex !== -1) {
      this.balloons.splice(balloonIndex, 1);
    }
    
    // Remove from scene
    this.entity.remove(balloon);
    
    // Create pop effect at world position
    if (createPopEffectFn) {
      createPopEffectFn(balloonWorldPos);
    }
    
    // Set brief invincibility
    this.userData.invincibleTime = 60; // 1 second at 60fps
    
    // Log the event
    console.log(`${this.userData.name} lost a balloon! ${this.balloons.length} remaining.`);
    
    // If character lost all balloons, they'll fall
    if (this.balloons.length === 0) {
      console.log(`${this.userData.name} lost all balloons and is falling!`);
    }
    
    return true; // Successfully popped
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
}