// character.js - Base class for all characters (players and NPCs)
import * as THREE from 'three';
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
      leftLeg: null,
      rightLeg: null,
      isOnSurface: false,
      currentPlatform: null,
      moveSpeed: 0.05,
      moveDirection: new THREE.Vector2(0, 0)
    };
    
    // Store references to body parts for animations
    this.userData.leftArm = this.findChildByName(this.entity, "leftArm");
    this.userData.rightArm = this.findChildByName(this.entity, "rightArm");
    this.userData.leftLeg = this.findChildByName(this.entity, "leftLeg");
    this.userData.rightLeg = this.findChildByName(this.entity, "rightLeg");
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

    // Legs (cones)
    const legGeometry = new THREE.ConeGeometry(0.25, 1, 4);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, 0, 0);
    leftLeg.name = "leftLeg";
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, 0, 0);
    rightLeg.name = "rightLeg";
    character.add(rightLeg);
    
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
  popBalloon(balloon, createPopEffectFn) {
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
}
