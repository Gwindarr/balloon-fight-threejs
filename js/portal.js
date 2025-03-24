// portal.js
import { scene } from './scene.js';

let portal;
let portalActive = true;
const PORTAL_URL = "http://portal.pieter.com";
const PORTAL_RADIUS = 3;

export function createPortal(x, y, z) {
    // Create portal ring
    const ringGeometry = new THREE.TorusGeometry(PORTAL_RADIUS, 0.3, 16, 32);
    const ringMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x9400D3, // Purple color
        emissive: 0x9400D3,
        emissiveIntensity: 0.5
    });
    portal = new THREE.Mesh(ringGeometry, ringMaterial);
    portal.position.set(x, y, z);
    portal.rotation.x = Math.PI / 2; // Make it stand upright
    scene.add(portal);
    
    // Create shimmering portal effect within the ring
    const portalEffectGeometry = new THREE.CircleGeometry(PORTAL_RADIUS - 0.3, 32);
    const portalEffectMaterial = new THREE.MeshBasicMaterial({
        color: 0xE6E6FA, // Lavender color
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const portalEffect = new THREE.Mesh(portalEffectGeometry, portalEffectMaterial);
    portalEffect.position.set(0, 0, 0.05); // Slightly in front of the ring
    portal.add(portalEffect);
    
    // Add floating text label
    createPortalLabel(portal, "Vibeverse Portal");
    
    return portal;
}

function createPortalLabel(portalObj, text) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = 'bold 60px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create label plane
    const geometry = new THREE.PlaneGeometry(4, 1);
    const label = new THREE.Mesh(geometry, material);
    label.position.set(0, PORTAL_RADIUS + 1, 0);
    portalObj.add(label);
}

export function animatePortal() {
    if (portal) {
        // Rotate the portal slowly
        portal.rotation.z += 0.005;
        
        // Add pulsing effect
        const pulseScale = 1 + 0.05 * Math.sin(Date.now() * 0.002);
        portal.scale.set(pulseScale, pulseScale, 1);
    }
}

export function checkPortalCollision(playerPosition) {
    if (!portal || !portalActive) return false;
    
    // Calculate distance to portal center (in XZ plane)
    const dx = playerPosition.x - portal.position.x;
    const dy = playerPosition.y - portal.position.y;
    const dz = playerPosition.z - portal.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Check if player is close enough and facing the portal
    if (distance < PORTAL_RADIUS * 0.7) {
        return true;
    }
    
    return false;
}

export function teleportPlayer() {
    // Disable portal temporarily to prevent multiple teleports
    portalActive = false;
    
    // Get player information
    const playerInfo = {
        username: "Player1", // Use actual player name if available
        color: "red", // Use player color
        speed: 5, // Base speed
        ref: window.location.href, // Current game URL for return portal
        
        // Optional parameters
        rotation_x: playerBody.rotation.x,
        rotation_y: playerBody.rotation.y,
        rotation_z: playerBody.rotation.z,
        
        // Velocity components
        speed_x: playerVelocity.x * 10, // Scale appropriately
        speed_y: playerVelocity.y * 10,
        speed_z: playerVelocity.z * 10
    };
    
    // Build URL with query parameters
    let url = PORTAL_URL + "?";
    for (const [key, value] of Object.entries(playerInfo)) {
        url += `${key}=${encodeURIComponent(value)}&`;
    }
    url = url.slice(0, -1); // Remove trailing &
    
    // Navigate to the new game
    window.location.href = url;
}