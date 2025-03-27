import * as THREE from 'three';
import { scene } from './scene.js';
import { playerBody, playerVelocity } from './entity.js';

export let portal;
let portalActive = true;
const PORTAL_URL = "http://portal.pieter.com";
export const PORTAL_RADIUS = 3;

export function createPortal(x, y, z) {
    const ringGeometry = new THREE.TorusGeometry(PORTAL_RADIUS, 0.3, 16, 32);
    const ringMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x9400D3,
        emissive: 0x9400D3,
        emissiveIntensity: 0.5
    });
    portal = new THREE.Mesh(ringGeometry, ringMaterial);
    portal.position.set(x, y, z);
    portal.rotation.x = Math.PI / 2;
    scene.add(portal);
    
    const portalEffectGeometry = new THREE.CircleGeometry(PORTAL_RADIUS - 0.3, 32);
    const portalEffectMaterial = new THREE.MeshBasicMaterial({
        color: 0xE6E6FA,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const portalEffect = new THREE.Mesh(portalEffectGeometry, portalEffectMaterial);
    portalEffect.position.set(0, 0, 0.05);
    portal.add(portalEffect);
    
    createPortalLabel(portal, "Vibeverse Portal");
    
    return portal;
}

function createPortalLabel(portalObj, text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 60px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const geometry = new THREE.PlaneGeometry(4, 1);
    const label = new THREE.Mesh(geometry, material);
    label.position.set(0, PORTAL_RADIUS + 1, 0);
    portalObj.add(label);
}

export function animatePortal() {
    if (portal) {
        portal.rotation.z += 0.005;
        const pulseScale = 1 + 0.05 * Math.sin(Date.now() * 0.002);
        portal.scale.set(pulseScale, pulseScale, 1);
    }
}

export function checkPortalCollision(playerPosition, keysPressed) {
    if (!portal || !portalActive) return false;
    
    const dx = playerPosition.x - portal.position.x;
    const dy = playerPosition.y - portal.position.y;
    const dz = playerPosition.z - portal.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
    if (distance < PORTAL_RADIUS) { // Increased to 3 units for easier access
        if (keysPressed.e) {
            console.log("Portal collision detected, teleporting...");
            return true;
        }
        return false;
    }
    return false;
}

export function teleportPlayer() {
    if (!portalActive) return;
    
    portalActive = false;
    console.log("Teleporting player...");
    
    const playerInfo = {
        username: "Player1",
        color: "red",
        speed: 5,
        ref: window.location.href,
        rotation_x: playerBody.rotation.x,
        rotation_y: playerBody.rotation.y,
        rotation_z: playerBody.rotation.z,
        speed_x: playerVelocity.x * 10,
        speed_y: playerVelocity.y * 10,
        speed_z: playerVelocity.z * 10
    };
    
    let url = PORTAL_URL + "?";
    for (const [key, value] of Object.entries(playerInfo)) {
        url += `${key}=${encodeURIComponent(value)}&`;
    }
    url = url.slice(0, -1);
    
    console.log(`Navigating to: ${url}`);
    
    try {
        // Attempt the redirect
        window.location.href = url;
    } catch (error) {
        console.error("Failed to teleport to portal URL:", error);
        // Fallback: Show an error message in the HUD
        import('./hud.js').then(HUD => {
            HUD.updateHUD(currentPhysicsState, "Failed to teleport: Invalid URL");
        });
    }
    
    // Reset portalActive after a delay (in case redirect fails or user returns)
    setTimeout(() => {
        portalActive = true;
        console.log("Portal reactivated");
    }, 5000); // 5 seconds
}