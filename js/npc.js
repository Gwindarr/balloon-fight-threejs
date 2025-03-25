// npc.js - Create and manage NPCs

import { scene } from './scene.js';
import { platforms } from './environment.js';

// Exports
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
function createNPC(x, y, z, color, platform) {
    // Create NPC group
    const npc = new THREE.Group();
    npc.position.set(x, y, z);
    
    // NPC body (cylinder) - matching player body position
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1; // Matches player body positioning
    npc.add(body);
    
    // NPC head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5; // Matches player head position
    npc.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: color });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.5, 0);
    leftArm.rotation.z = Math.PI / 4;
    npc.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.5, 0);
    rightArm.rotation.z = -Math.PI / 4;
    npc.add(rightArm);

    // Legs - matching player leg geometry and positioning
    const legGeometry = new THREE.ConeGeometry(0.25, 1, 4);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, 0, 0);
    npc.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, 0, 0);
    npc.add(rightLeg);
    
    // Add NPC to scene
    scene.add(npc);
    
    // Balloons for the NPC (1-3 random balloons)
    const balloonCount = 1 + Math.floor(Math.random() * 3);
    const npcBalloons = [];
    
    for (let i = 0; i < balloonCount; i++) {
        const balloonGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const balloonColor = new THREE.Color(
            Math.random(), 
            Math.random(), 
            Math.random()
        );
        const balloonMaterial = new THREE.MeshLambertMaterial({ color: balloonColor });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
        
        // Position balloon above NPC with some randomness, but higher to match player
        const xOffset = (Math.random() - 0.5) * 1.5;
        balloon.position.set(xOffset, 4 + Math.random(), 0);
        
        // String (line)
        const stringGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), 
            new THREE.Vector3(0, -1.5, 0)
        ]);
        const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const string = new THREE.Line(stringGeometry, stringMaterial);
        balloon.add(string);
        
        npc.add(balloon);
        npcBalloons.push(balloon);
    }
    
    // Store NPC properties for movement
    npc.userData = {
        velocity: new THREE.Vector3(0, 0, 0),
        moveDirection: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(),
        moveSpeed: 0.02 + Math.random() * 0.03,
        platform: platform,
        balloons: npcBalloons,
        animationTime: Math.random() * Math.PI * 2, // Random start phase
        flapTime: 0,
        isFlapping: false,
        leftArm: leftArm,
        rightArm: rightArm
    };
    
    // Add to NPCs array
    npcs.push(npc);
    
    return npc;
}

// Update all NPCs
export function updateNPCs() {
    for (const npc of npcs) {
        // Update NPC movement on platform
        updateNPCMovement(npc);
        
        // Animate balloons bobbing
        animateNPCBalloons(npc);
    }
}

// Update NPC movement
function updateNPCMovement(npc) {
    const platform = npc.userData.platform;
    if (!platform) return;
    
    // Get platform dimensions
    const platformWidth = platform.geometry.parameters.width;
    const platformDepth = platform.geometry.parameters.depth;
    const halfWidth = platformWidth / 2 - 1; // Stay 1 unit from edge
    const halfDepth = platformDepth / 2 - 1;
    
    // Update animation time
    npc.userData.animationTime += 0.03;
    
    // Make NPCs occasionally change direction
    if (Math.random() < 0.02) {
        npc.userData.moveDirection = new THREE.Vector2(
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
    }
    
    // Calculate new velocity
    const moveDir = npc.userData.moveDirection;
    npc.userData.velocity.x = moveDir.x * npc.userData.moveSpeed;
    npc.userData.velocity.z = moveDir.y * npc.userData.moveSpeed;
    
    // Apply movement
    npc.position.x += npc.userData.velocity.x;
    npc.position.z += npc.userData.velocity.z;
    
    // Keep NPC on platform
    const platformX = platform.position.x;
    const platformZ = platform.position.z;
    
    // If reaching platform edge, bounce
    if (npc.position.x > platformX + halfWidth) {
        npc.position.x = platformX + halfWidth;
        npc.userData.moveDirection.x *= -1;
    } else if (npc.position.x < platformX - halfWidth) {
        npc.position.x = platformX - halfWidth;
        npc.userData.moveDirection.x *= -1;
    }
    
    if (npc.position.z > platformZ + halfDepth) {
        npc.position.z = platformZ + halfDepth;
        npc.userData.moveDirection.y *= -1;
    } else if (npc.position.z < platformZ - halfDepth) {
        npc.position.z = platformZ - halfDepth;
        npc.userData.moveDirection.y *= -1;
    }
    
    // Make NPC face movement direction
    if (npc.userData.velocity.x !== 0 || npc.userData.velocity.z !== 0) {
        npc.rotation.y = Math.atan2(npc.userData.velocity.x, npc.userData.velocity.z);
    }
    
    // Occasional random jumping/flapping
    if (Math.random() < 0.01 && !npc.userData.isFlapping) {
        npc.userData.isFlapping = true;
        npc.userData.flapTime = 0;
        npc.position.y += 0.2; // Small hop
        
        // Animate arms flapping
        npc.userData.leftArm.rotation.z = Math.PI / 2;
        npc.userData.rightArm.rotation.z = -Math.PI / 2;
    }
    
    // Reset flapping animation
    if (npc.userData.isFlapping) {
        npc.userData.flapTime++;
        if (npc.userData.flapTime > 10) {
            npc.userData.isFlapping = false;
            npc.userData.leftArm.rotation.z = Math.PI / 4;
            npc.userData.rightArm.rotation.z = -Math.PI / 4;
        }
    }
}

// Animate NPC balloons
function animateNPCBalloons(npc) {
    const time = npc.userData.animationTime;
    
    // Animate each balloon with slight bobbing
    for (let i = 0; i < npc.userData.balloons.length; i++) {
        const balloon = npc.userData.balloons[i];
        
        // Balloon bobbing motion - matching player balloon height
        balloon.position.y = 4 + Math.sin(time + i) * 0.1;
        
        // Slight swaying
        balloon.position.x = (i - 1) * 0.6 + Math.sin(time * 0.5 + i * 2) * 0.1;
        balloon.position.z = Math.cos(time * 0.3 + i) * 0.1;
        
        // Balloon rotating slightly
        balloon.rotation.x = Math.sin(time * 0.5) * 0.1;
        balloon.rotation.z = Math.cos(time * 0.3) * 0.1;
    }
}