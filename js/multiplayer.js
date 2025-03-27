import * as THREE from 'three';
import { scene } from './scene.js';
import { Character } from './character.js'; // Import the Character class

// Map to store other players' meshes
const players = new Map();

// WebSocket connection
let socket;
let playerId;

// Basic player model color
const DEFAULT_PLAYER_COLOR = 0x2194ce;

// Connect to the WebSocket server
export function initMultiplayer(localPlayer) {
    // Connect to WebSocket server
    socket = new WebSocket('ws://localhost:8000/ws/game');
    
    // Store the local player reference
    const player = localPlayer;
    
    socket.onopen = () => {
        console.log('Connected to game server');
        
        // Start sending position updates
        setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                sendPlayerUpdate(player);
            }
        }, 50); // 20 updates per second
    };
    
    socket.onclose = () => {
        console.log('Disconnected from game server');
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    socket.onmessage  = (event) => {
        const message = JSON.parse(event.data);
        // console.log("Received message:", message); // Removed spammy log
        handleServerMessage(message, player);
    };
    
    // Add a method to the player to handle interaction with boost mushrooms
    if (player.userData) {
        player.userData.triggerBoost = (boostStrength) => {
            // Apply boost locally
            player.userData.velocity.y = boostStrength;
            
            // Send event to server
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'environment_update',
                    target: 'boost_mushroom',
                    state: {
                        activated: true,
                        position: player.position.clone()
                    }
                }));
            }
        };
    }
    
    // Clean up when window closes
    window.addEventListener('beforeunload', () => {
        socket.close();
    });
}

// Send player position and state to the server
function sendPlayerUpdate(player) { // 'player' here is the Player class instance
    // Access the actual mesh/group via player.entity
    const playerMesh = player.entity;

    // Only send if we're connected and have a position
    if (!playerMesh || !playerMesh.position) return;

    const message = {
        type: 'player_update',
        state: {
            id: playerMesh.userData?.id || playerId, // Get ID from mesh's userData
            position: {
                x: playerMesh.position.x, // Use playerMesh.position
                y: playerMesh.position.y, // Use playerMesh.position
                z: playerMesh.position.z  // Use playerMesh.position
            },
            rotation: {
                y: playerMesh.rotation.y // Use playerMesh.rotation
            },
            // Assuming velocity and animation are stored in userData of the mesh
            velocity: playerMesh.userData?.velocity || { x: 0, y: 0, z: 0 },
            animation: playerMesh.userData?.currentAnimation || 'idle',
            // Add balloon colors to the state
            balloons: player.balloons.map(b => b.material.color.getHex())
        }
    };

    socket.send(JSON.stringify(message));
}

// Handle messages from the server
function handleServerMessage(message, localPlayer) {
    switch (message.type) {
        case 'player_id':
            // Store the player ID assigned by the server
            playerId = message.playerId;
            console.log("Received player ID from server:", playerId);
            
            // Set the player ID on the local player entity
            if (localPlayer && localPlayer.userData) {
                localPlayer.userData.id = playerId;
                console.log("Set player ID on local player:", playerId);
            }
            break;
            
        case 'world_state':
            // Set initial world state
            initializeWorldState(message, localPlayer);
            break;
            
        case 'player_joined':
            // Add a new player to the scene
            addPlayer(message.player);
            break;
            
        case 'player_left':
            // Remove a player from the scene
            removePlayer(message.playerId);
            break;
            
        case 'player_state':
            // Update another player's state
            updatePlayerState(message.playerId, message.state);
            break;
            
        case 'environment_update':
            // Update environment elements (e.g., moving platforms, mushrooms)
            handleEnvironmentUpdate(message.target, message.state);
            break;
            
        case 'chat':
            // Handle chat messages
            displayChatMessage(message.playerId, message.message);
            break;
    }
}

// Initialize the world state with existing players
function initializeWorldState(message, localPlayer) {
    // Store our player ID from server
    if (message.playerId) {
        playerId = message.playerId;
        console.log("Player ID from world state:", playerId);
        
        // Set the player ID on the local player entity
        if (localPlayer && localPlayer.userData) {
            localPlayer.userData.id = playerId;
            console.log("Set player ID on local player from world state:", playerId);
        }
    } else {
        // Fallback to existing ID
        playerId = localPlayer.userData.id;
        console.log("Using existing player ID:", playerId);
    }
    
    // Create other players
    for (const [id, playerState] of Object.entries(message.players)) {
        addPlayer(playerState);
    }
    
    // TODO: Initialize environment state if needed
    if (message.environment) {
        for (const [target, state] of Object.entries(message.environment)) {
            handleEnvironmentUpdate(target, state);
        }
    }
}

// Create the model for a remote player using the Character class
function createPlayerModel(id, playerState) {
    // console.log(`Creating Character model for remote player ${id}`); // Removed log

    // Determine initial position and color
    const initialX = playerState?.position?.x || 0;
    const initialY = playerState?.position?.y || 0.5; // Default slightly above ground
    const initialZ = playerState?.position?.z || 0;
    const color = playerState?.color || DEFAULT_PLAYER_COLOR; // Use state color or default

    // Create a new Character instance
    // The Character constructor adds the entity to the scene
    const character = new Character(initialX, initialY, initialZ, color, `Player ${id.slice(0, 4)}`);
    const playerMesh = character.entity; // Get the mesh/group from the Character instance

    // Add balloons based on received state
    if (playerState.balloons && Array.isArray(playerState.balloons)) {
        // console.log(`createPlayerModel: Adding ${playerState.balloons.length} balloons for player ${id}`); // Removed log
        // Ensure existing default balloons (if any) are removed before adding new ones
        character.balloons.forEach(b => character.entity.remove(b));
        character.balloons = [];
        character.addBalloons(playerState.balloons.length, playerState.balloons);
    } else {
        console.log(`createPlayerModel: No balloon data received for player ${id}, adding default.`);
        // Add default balloons if none provided in state (optional, depends on desired behavior)
        // character.addBalloons(3, [0xff0000, 0x0000ff, 0x00ff00]); // Example default
    }

    // Removed logs about adding mesh and verifying children

    // Update the userData on the mesh/group itself for multiplayer logic
    playerMesh.userData.id = id; // Ensure the correct ID is set
    playerMesh.userData.characterInstance = character; // Store reference to Character instance
    playerMesh.userData.isRemotePlayer = true;
    playerMesh.userData.lastUpdate = Date.now();
    playerMesh.userData.targetPosition = new THREE.Vector3(initialX, initialY, initialZ);
    playerMesh.userData.targetRotation = new THREE.Euler(0, playerState?.rotation?.y || 0, 0);
    // Keep velocity/animation from Character's default userData unless overridden by state
    playerMesh.userData.velocity = playerState?.velocity || playerMesh.userData.velocity || new THREE.Vector3(0,0,0);
    playerMesh.userData.currentAnimation = playerState?.animation || playerMesh.userData.currentAnimation || 'idle';

    // Set initial rotation if provided
    if (playerState.rotation) {
        playerMesh.rotation.y = playerState.rotation.y;
    }

    return playerMesh; // Return the mesh/group
}


// Add a new player to the scene
function addPlayer(playerState) {
    // console.log("Attempting to add player. Received state:", playerState); // Removed log
    // console.log("Local player ID:", playerId); // Removed log

    if (!playerState || !playerState.id) {
        // console.warn("addPlayer: Received invalid playerState or missing ID. Aborting.", playerState); // Removed log
        return;
    }
    if (playerState.id === playerId) {
        // console.log("addPlayer: Skipping add for local player ID:", playerId); // Removed log
        return;
    }
    if (players.has(playerState.id)) {
        // console.warn("addPlayer: Player already exists:", playerState.id, ". Aborting add."); // Removed log
        return; // Avoid adding duplicates
    }

    // console.log(`addPlayer: Proceeding to create model for remote player ${playerState.id}`); // Removed log
    // Create player model
    const playerMesh = createPlayerModel(playerState.id, playerState);

    // Add to players map
    players.set(playerState.id, playerMesh);

    console.log(`Player ${playerState.id} joined`); // Keep this one
}

// Remove a player from the scene
function removePlayer(id) {
    // console.log(`removePlayer: Received request to remove player ${id}.`); // Removed log
    if (!players.has(id)) {
        // console.warn(`removePlayer: Player ${id} not found in map. Aborting removal.`); // Removed log
        return;
    }

    const playerMesh = players.get(id);
    scene.remove(playerMesh); // Remove from Three.js scene
    players.delete(id); // Remove from our tracking map

    console.log(`Player ${id} left`); // Keep this one
}

// Update a player's state
function updatePlayerState(id, state) {
    // Removed debug log
    if (!players.has(id)) {
         // console.warn(`updatePlayerState: Player ${id} not found in map. Aborting update.`); // Keep commented out for now
         return;
    }

    const playerMesh = players.get(id);
    const characterInstance = playerMesh.userData.characterInstance; // Get Character instance

    // Store target position for interpolation
    if (state.position) {
        playerMesh.userData.targetPosition.set(
            state.position.x,
            state.position.y,
            state.position.z
        );
    } else {
        // console.warn(`updatePlayerState: Received state update for ${id} without position data.`); // Keep commented out
    }

    // Store target rotation for interpolation
    if (state.rotation) {
        playerMesh.userData.targetRotation.y = state.rotation.y;
    }
    
    // Update velocity
    if (state.velocity) {
        playerMesh.userData.velocity = state.velocity;
    }
    
    // Update animation state
    if (state.animation) {
        playerMesh.userData.currentAnimation = state.animation;
        // TODO: Trigger animation change if you have an animation system
        // Example: characterInstance.playAnimation(state.animation);
    }

    // Update balloon state
    if (state.balloons && Array.isArray(state.balloons) && characterInstance) {
        const currentBalloonCount = characterInstance.balloons.length;
        const receivedBalloonCount = state.balloons.length;

        if (currentBalloonCount !== receivedBalloonCount) {
            // console.log(`updatePlayerState: Balloon count changed for ${id}. Current: ${currentBalloonCount}, Received: ${receivedBalloonCount}`); // Removed log
            // Basic update: Remove all and re-add based on received state
            // (More sophisticated diffing could be done for performance)
            characterInstance.balloons.forEach(b => characterInstance.entity.remove(b));
            characterInstance.balloons = [];
            characterInstance.addBalloons(receivedBalloonCount, state.balloons);
        }
        // TODO: Could also update colors if they change without count changing
    }

    playerMesh.userData.lastUpdate = Date.now();
}

// Handle environment updates
function handleEnvironmentUpdate(target, state) {
    if (target === 'boost_mushroom' && state.activated) {
        // Find the mushroom close to this position
        if (window.boostMushrooms && window.boostMushrooms.length > 0) {
            const position = new THREE.Vector3(
                state.position.x,
                state.position.y,
                state.position.z
            );
            
            // Find the closest mushroom
            let closestMushroom = null;
            let closestDistance = Infinity;
            
            for (const mushroom of window.boostMushrooms) {
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
    
    // TODO: Handle other environment updates as needed
}

// Display chat messages (simplified)
function displayChatMessage(id, text) {
    console.log(`[${id}]: ${text}`);
    // TODO: Add visual chat display in the game UI
}

// Update function to interpolate other players' movements
export function updateMultiplayer(deltaTime) {
    // Removed console log spamming player IDs every frame

    if (players.size === 0) {
        // console.log("updateMultiplayer: No remote players to update."); // Optional: Log if map is empty
        return; // No players to update
    }

    for (const playerMesh of players.values()) {
        // Removed interpolation log spam

        // Interpolate position and rotation for smoother movement
        const lerpFactor = Math.min(deltaTime * 10, 1);
        
        playerMesh.position.lerp(playerMesh.userData.targetPosition, lerpFactor);
        
        // Rotation interpolation using quaternions for smoother rotation
        const currentQuaternion = new THREE.Quaternion().setFromEuler(playerMesh.rotation);
        const targetQuaternion = new THREE.Quaternion().setFromEuler(playerMesh.userData.targetRotation);
        currentQuaternion.slerp(targetQuaternion, lerpFactor);
        playerMesh.rotation.setFromQuaternion(currentQuaternion);

        // Removed client-side physics simulation for remote players.
        // Rely solely on interpolation towards server state.
    }
}

// Chat system
export function sendChatMessage(message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'chat',
            message: message
        }));
        return true;
    }
    return false;
}

// Export the player list
export function getConnectedPlayers() {
    return players;
}
