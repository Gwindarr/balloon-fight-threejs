import * as THREE from 'three';
import { scene } from './scene.js';
import { playerBody, playerVelocity } from './entity.js';

export const portals = [];
let portalActive = true; // Prevents re-triggering during activation/teleport
const DEFAULT_PORTAL_URL = "http://portal.pieter.com";
const DEFAULT_ACTIVATION_RADIUS = 3;

// --- Portal Creation ---

/**
 * Creates a portal based on a configuration object.
 * @param {object} config - Portal configuration.
 * @param {object} config.position - {x, y, z}
 * @param {object} [config.rotation] - {x, y, z} (radians, optional)
 * @param {string} [config.shape='torus'] - 'torus', 'box', 'plane'
 * @param {object} config.size - Shape-specific: { radius, thickness } for torus; { width, height, depth } for box; { width, height } for plane
 * @param {object} [config.material] - Optional material properties: { color, emissive, emissiveIntensity, shininess, opacity, transparent }
 * @param {string} [config.label='Portal'] - Text label above the portal.
 * @param {number} [config.activationRadius=3] - Distance within which the portal can be activated.
 * @param {object} config.action - Action to perform: { type: 'teleportUrl', url?: string } or { type: 'generateZone', theme?: string, zonePosition?: {x,y,z}, seed?: number }
 */
export function createPortal(config) {
    // --- Validate Config ---
    if (!config || !config.position || !config.size || !config.action) {
        console.error("Invalid portal config:", config);
        return null;
    }

    // --- Defaults ---
    const shape = config.shape || 'torus';
    const rotation = config.rotation || { x: Math.PI / 2, y: 0, z: 0 }; // Default vertical
    const label = config.label || 'Portal';
    const activationRadius = config.activationRadius || DEFAULT_ACTIVATION_RADIUS;
    const matConfig = config.material || {};
    const color = matConfig.color || 0x9400D3; // Default purple
    const emissive = matConfig.emissive || color;
    const emissiveIntensity = matConfig.emissiveIntensity !== undefined ? matConfig.emissiveIntensity : 0.5;
    const shininess = matConfig.shininess !== undefined ? matConfig.shininess : 30;
    const opacity = matConfig.opacity !== undefined ? matConfig.opacity : 0.7;
    const transparent = matConfig.transparent !== undefined ? matConfig.transparent : true;

    // --- Geometry ---
    let geometry;
    try {
        if (shape === 'torus') {
            geometry = new THREE.TorusGeometry(config.size.radius || 3, config.size.thickness || 0.3, 16, 48);
        } else if (shape === 'box') {
            geometry = new THREE.BoxGeometry(config.size.width || 5, config.size.height || 5, config.size.depth || 0.5);
        } else if (shape === 'plane') {
             geometry = new THREE.PlaneGeometry(config.size.width || 5, config.size.height || 5);
        } else {
            console.warn(`Unsupported portal shape: ${shape}. Defaulting to torus.`);
            geometry = new THREE.TorusGeometry(3, 0.3, 16, 48);
        }
    } catch (e) {
         console.error(`Error creating geometry for portal "${label}" with shape "${shape}" and size:`, config.size, e);
         return null;
    }


    // --- Material ---
    const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: emissive,
        emissiveIntensity: emissiveIntensity,
        shininess: shininess,
        opacity: opacity,
        transparent: transparent,
        side: THREE.DoubleSide // Render both sides, useful for planes/boxes
    });

    // --- Mesh & Positioning ---
    const portalMesh = new THREE.Mesh(geometry, material);
    console.log(`Creating portal "${label}" at (${config.position.x}, ${config.position.y}, ${config.position.z})`);
    portalMesh.position.set(config.position.x, config.position.y, config.position.z);
    portalMesh.rotation.set(rotation.x, rotation.y, rotation.z);

    // --- Addons (Effect, Label, Text) ---
    // Add visual effect plane inside the ring (adjust geometry based on shape?)
    // For now, keep simple circle effect, assuming most portals are ring-like or have a central area
    if (shape === 'torus' || shape === 'box' || shape === 'plane') { // Add effect for common shapes
        const effectRadius = (shape === 'torus' ? config.size.radius || 3 : Math.min(config.size.width || 5, config.size.height || 5) / 2) * 0.9;
        const portalEffectGeometry = new THREE.CircleGeometry(effectRadius, 32);
        const portalEffectMaterial = new THREE.MeshBasicMaterial({
            color: 0xE6E6FA, // Lavender
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const portalEffect = new THREE.Mesh(portalEffectGeometry, portalEffectMaterial);
        // Position effect slightly in front based on portal orientation (tricky)
        // Simple offset for now, might need adjustment based on rotation
        portalEffect.position.set(0, 0, shape === 'box' ? (config.size.depth || 0.5) / 2 + 0.01 : 0.05);
        portalMesh.add(portalEffect);
    }

    createPortalLabel(portalMesh, label, activationRadius); // Pass radius for positioning
    addFloatingText(portalMesh, "Press E to enter", activationRadius + 1.5); // Position relative to radius

    // --- Store Config & Add ---
    portalMesh.userData.action = config.action; // Store the action config
    portalMesh.userData.label = label;
    portalMesh.userData.activationRadius = activationRadius;
    portals.push(portalMesh);
    scene.add(portalMesh);
    console.log(`Added portal "${label}" to scene. Action Type: ${config.action?.type || 'default teleport'}`);
    return portalMesh;
}

// --- Helper Functions (Labels, Text, Animation) ---

function createPortalLabel(portalObj, text, portalRadius) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 128;
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 60px Arial'; context.fillStyle = 'white';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(4, 1); // Fixed size label
    const label = new THREE.Mesh(geometry, material);
    // Position label above the portal based on radius/size
    label.position.set(0, portalRadius + 1, 0);
    portalObj.add(label);
}

function addFloatingText(parent, text, yOffset) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 64;
    context.fillStyle = 'white'; context.font = 'bold 28px Arial';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 10);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1); // Fixed size sprite
    sprite.position.set(0, yOffset, 0); // Position text using offset
    parent.add(sprite);
}

export function animatePortal() {
    for (const p of portals) {
        // Simple rotation animation (might want shape-specific later)
        if (p.geometry instanceof THREE.TorusGeometry) {
            p.rotation.z += 0.005; // Rotate around local Z (world Y)
        } else {
             p.rotation.y += 0.005; // Rotate box/plane around world Y
        }
        // Pulse effect (optional)
        // const pulseScale = 1 + 0.05 * Math.sin(Date.now() * 0.002);
        // p.scale.set(pulseScale, pulseScale, pulseScale);
    }
}

// --- Portal Activation Logic ---

// Make async to handle dynamic import for zone generation
export async function checkPortalCollision(playerPosition, keysPressed) {
    if (!portalActive) return false; // Don't check if a teleport is in progress

    for (const p of portals) {
        const activationRadius = p.userData.activationRadius || DEFAULT_ACTIVATION_RADIUS;
        const dx = playerPosition.x - p.position.x;
        const dy = playerPosition.y - p.position.y; // Consider vertical distance too
        const dz = playerPosition.z - p.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Check distance first
        if (distance < activationRadius) {
             // Check key press ONLY if distance is met
             if (keysPressed.e) {
                console.log(`Activating portal "${p.userData.label}" at (${p.position.x.toFixed(1)}, ${p.position.y.toFixed(1)}, ${p.position.z.toFixed(1)}).`);
                const action = p.userData.action;

                // Consume the key press immediately & deactivate portals
                keysPressed.e = false;
                portalActive = false;

                try {
                    if (action && action.type === 'generateZone') {
                        await handleGenerateZoneAction(action);
                    } else if (action && action.type === 'teleportUrl') {
                        handleTeleportAction(action.url); // Pass specific URL
                    } else {
                        // Default action if no config or unknown type
                        handleTeleportAction();
                    }
                } catch (error) {
                     console.error("Error during portal activation:", error);
                     // Ensure portals reactivate even if action failed
                     portalActive = true; // Reactivate immediately on error
                     // Optionally skip the timeout below or clear it if set elsewhere
                }

                // Reactivate portals after a delay (allows teleport/zone load)
                // Check if portalActive was reset by error handling before setting timeout
                if (!portalActive) {
                    setTimeout(() => {
                        portalActive = true;
                        console.log("Portals reactivated after delay.");
                    }, 2000); // 2 second delay
                }

                return true; // Indicate a portal was activated
             }
        }
    }
    return false; // No portal activated this frame
}

async function handleGenerateZoneAction(actionConfig) {
    console.log("Executing generateZone action.");
    try {
        // Dynamically import the zone generator
        const { generateZone } = await import('../zones/procs.js');
        const seed = actionConfig.seed || Math.floor(Math.random() * 99999);
        const theme = actionConfig.theme || "Default";
        // Use position from config or default, ensuring it's a Vector3
        const position = actionConfig.zonePosition ? new THREE.Vector3(actionConfig.zonePosition.x, actionConfig.zonePosition.y, actionConfig.zonePosition.z) : new THREE.Vector3(5000, 0, 5000);

        console.log(`Generating zone with theme: ${theme}, seed: ${seed}`);
        const zone = generateZone(theme, seed, position);
        scene.add(zone); // Add generated zone to the main scene (scene is imported)
        console.log("Zone added to scene.");

        // Teleport player
        if (playerBody) {
            playerBody.position.set(position.x, position.y + 20, position.z); // Position player above zone ground
            if (playerVelocity) playerVelocity.set(0, 0, 0); // Reset velocity
            console.log(`Player teleported to zone at (${position.x}, ${position.y + 20}, ${position.z})`);
        } else {
             console.error("playerBody not found for teleportation!");
        }

    } catch (error) {
        console.error("Error during zone generation or teleport:", error);
        throw error; // Re-throw to be caught by checkPortalCollision
    }
}

function handleTeleportAction(targetUrl = DEFAULT_PORTAL_URL) {
    console.log(`Executing teleport action to ${targetUrl || 'default URL'}`);
    teleportPlayer(targetUrl);
}


// Handles redirecting the browser
function teleportPlayer(targetUrl = DEFAULT_PORTAL_URL) {
    // portalActive is already false here
    console.log("Preparing player info for teleport...");

    const playerInfo = {
        username: "Player1", // Consider making dynamic if needed
        color: "red", // Consider making dynamic
        speed: 5, // Consider making dynamic
        ref: window.location.href, // Where the player came from
        // Pass current state if playerBody exists
        rotation_x: playerBody ? playerBody.rotation.x : 0,
        rotation_y: playerBody ? playerBody.rotation.y : 0,
        rotation_z: playerBody ? playerBody.rotation.z : 0,
        speed_x: playerVelocity ? playerVelocity.x * 10 : 0, // Scale speed
        speed_y: playerVelocity ? playerVelocity.y * 10 : 0,
        speed_z: playerVelocity ? playerVelocity.z * 10 : 0
    };

    let url = targetUrl + "?";
    for (const [key, value] of Object.entries(playerInfo)) {
        url += `${key}=${encodeURIComponent(value)}&`;
    }
    url = url.slice(0, -1); // Remove trailing '&'

    console.log(`Navigating to: ${url}`);

    try {
        // Attempt the redirect
        window.location.href = url;
    } catch (error) {
        console.error("Failed to navigate to portal URL:", error);
        // Reactivate portals immediately if navigation fails
         portalActive = true;
    }
    // Note: setTimeout for reactivation is now in checkPortalCollision
}
