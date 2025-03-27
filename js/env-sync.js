import * as THREE from 'three';
import { scene } from './scene.js';
import { movingPlatforms, cloudPlatforms, boost_mushrooms } from './environment.js';

let socket;
let environmentSyncInterval;
let lastSyncTime = 0;
const SYNC_INTERVAL = 200; // milliseconds between environment sync
const SYNC_THRESHOLD = 0.1; // Only sync if position changed by this much
const ENV_AUTHORITY = 'server'; // server or host (first connected player)

// Reference to local player for authority checks
let localPlayer;

// Initialize environment synchronization
export function initEnvironmentSync(socketConnection, player) {
    socket = socketConnection;
    localPlayer = player;
    
    // Start periodic sync of important environment objects
    startEnvironmentSync();
    
    // Listen for environment update messages
    addEnvironmentUpdateListener();
}

// Start periodic synchronization of environment objects
function startEnvironmentSync() {
    // Clear any existing interval
    if (environmentSyncInterval) {
        clearInterval(environmentSyncInterval);
    }
    
    // Set up new interval
    environmentSyncInterval = setInterval(() => {
        syncMovingPlatforms();
        syncBoostMushrooms();
        syncCloudPlatforms();
    }, SYNC_INTERVAL);
}

// Add listener for environment update messages
function addEnvironmentUpdateListener() {
    // This listener should be added in multiplayer.js handleServerMessage
    // but we define the function here to separate concerns
    window.handleEnvironmentUpdate = (target, state) => {
        switch (target) {
            case 'platform_moving':
                updateMovingPlatform(state);
                break;
            case 'platform_cloud':
                updateCloudPlatform(state);
                break;
            case 'boost_mushroom':
                updateBoostMushroom(state);
                break;
        }
    };
}

// Sync moving platforms
function syncMovingPlatforms() {
    // Only sync if we're the authority (server or host)
    if (ENV_AUTHORITY === 'host' && !isHost()) return;
    
    const now = Date.now();
    if (now - lastSyncTime < SYNC_INTERVAL) return;
    lastSyncTime = now;
    
    if (!movingPlatforms || !socket) return;
    
    for (let i = 0; i < movingPlatforms.length; i++) {
        const platform = movingPlatforms[i];
        
        // Skip if position hasn't changed significantly
        if (platform.userData.lastSyncedPosition &&
            platform.position.distanceTo(platform.userData.lastSyncedPosition) < SYNC_THRESHOLD) {
            continue;
        }
        
        // Store last synced position
        if (!platform.userData.lastSyncedPosition) {
            platform.userData.lastSyncedPosition = new THREE.Vector3();
        }
        platform.userData.lastSyncedPosition.copy(platform.position);
        
        // Send platform state
        socket.send(JSON.stringify({
            type: 'environment_update',
            target: 'platform_moving',
            state: {
                index: i,
                position: {
                    x: platform.position.x,
                    y: platform.position.y,
                    z: platform.position.z
                },
                rotation: {
                    x: platform.rotation.x,
                    y: platform.rotation.y,
                    z: platform.rotation.z
                },
                // For platforms with specific movement properties
                userData: {
                    angle: platform.userData.angle,
                    time: platform.userData.time
                }
            }
        }));
    }
}

// Update a moving platform based on received data
function updateMovingPlatform(state) {
    // Only apply updates if we're not the authority
    if (ENV_AUTHORITY === 'host' && isHost()) return;
    
    if (!movingPlatforms || state.index >= movingPlatforms.length) return;
    
    const platform = movingPlatforms[state.index];
    
    // Store last position for physics calculations
    platform.userData.lastPosition.copy(platform.position);
    
    // Update platform position
    if (state.position) {
        platform.position.set(
            state.position.x,
            state.position.y,
            state.position.z
        );
    }
    
    // Update platform rotation
    if (state.rotation) {
        platform.rotation.set(
            state.rotation.x,
            state.rotation.y,
            state.rotation.z
        );
    }
    
    // Update platform movement properties
    if (state.userData) {
        if (state.userData.angle !== undefined) {
            platform.userData.angle = state.userData.angle;
        }
        if (state.userData.time !== undefined) {
            platform.userData.time = state.userData.time;
        }
    }
}

// Sync cloud platforms
function syncCloudPlatforms() {
    // Only sync if we're the authority
    if (ENV_AUTHORITY === 'host' && !isHost()) return;
    
    if (!cloudPlatforms || !socket) return;
    
    // We only need to sync cloud platforms that are fading or have been stepped on
    for (let i = 0; i < cloudPlatforms.length; i++) {
        const platform = cloudPlatforms[i];
        
        // Only sync platforms with state changes
        if (platform.userData.isFading || platform.userData.isStoodOn) {
            socket.send(JSON.stringify({
                type: 'environment_update',
                target: 'platform_cloud',
                state: {
                    index: i,
                    position: {
                        x: platform.position.x,
                        y: platform.position.y,
                        z: platform.position.z
                    },
                    isFading: platform.userData.isFading,
                    fadeTimer: platform.userData.fadeTimer,
                    isStoodOn: platform.userData.isStoodOn
                }
            }));
        }
    }
}

// Update a cloud platform based on received data
function updateCloudPlatform(state) {
    // Only apply updates if we're not the authority
    if (ENV_AUTHORITY === 'host' && isHost()) return;
    
    if (!cloudPlatforms || state.index >= cloudPlatforms.length) return;
    
    const platform = cloudPlatforms[state.index];
    
    // Update cloud platform properties
    if (state.isFading !== undefined && !platform.userData.isFading && state.isFading) {
        // Start fading this platform
        platform.userData.isFading = true;
        platform.userData.fadeTimer = state.fadeTimer || platform.userData.fadeTime;
    }
    
    if (state.isStoodOn !== undefined) {
        platform.userData.isStoodOn = state.isStoodOn;
    }
}

// Sync boost mushrooms (especially when activated)
function syncBoostMushrooms() {
    // No need for regular syncing as mushrooms are only synced when activated
    // This is handled by the player when they bounce on a mushroom
}

// Update a boost mushroom based on received data
function updateBoostMushroom(state) {
    if (!boost_mushrooms) return;
    
    // If the mushroom was activated, find the closest one to the position
    if (state.activated && state.position) {
        const position = new THREE.Vector3(
            state.position.x,
            state.position.y,
            state.position.z
        );
        
        // Find the closest mushroom
        let closestMushroom = null;
        let closestDistance = Infinity;
        
        for (const mushroom of boost_mushrooms) {
            const distance = mushroom.position.distanceTo(position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestMushroom = mushroom;
            }
        }
        
        // If we found a close mushroom, trigger its animation
        if (closestMushroom && closestDistance < 5) {
            import('./environment.js').then(({ triggerMushroomBounce }) => {
                triggerMushroomBounce(closestMushroom);
            });
        }
    }
}

// Check if the local player is the host (first connected player)
function isHost() {
    // Logic to determine if this client is the host
    // Could be based on a role assigned by the server or simply the first player
    return localPlayer && localPlayer.userData.isHost;
}

// Clean up when window closes
export function cleanupEnvironmentSync() {
    if (environmentSyncInterval) {
        clearInterval(environmentSyncInterval);
    }
}