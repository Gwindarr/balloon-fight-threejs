// hud.js
import { playerBody, playerVelocity } from './entity.js';

// HUD elements
let hudContainer;
let altimeterElement;
let velocityElement;
let stateElement;
let combatIndicatorElement;

// Combat indicator state
let showCombatIndicator = false;
let combatIndicatorTimer = 0;

// Initialize the HUD
export function initHUD() {
    // Create HUD container
    hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    hudContainer.style.position = 'absolute';
    hudContainer.style.top = '10px';
    hudContainer.style.right = '10px';
    hudContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    hudContainer.style.color = 'white';
    hudContainer.style.padding = '10px';
    hudContainer.style.borderRadius = '5px';
    hudContainer.style.fontFamily = 'monospace';
    hudContainer.style.fontSize = '14px';
    hudContainer.style.zIndex = '1000';
    hudContainer.style.userSelect = 'none';
    hudContainer.style.width = '180px';
    
    // Create altimeter element
    altimeterElement = document.createElement('div');
    altimeterElement.id = 'altimeter';
    altimeterElement.innerHTML = 'Height: 0.00';
    hudContainer.appendChild(altimeterElement);
    
    // Create velocity element
    velocityElement = document.createElement('div');
    velocityElement.id = 'velocity';
    velocityElement.innerHTML = 'Velocity: 0.00';
    hudContainer.appendChild(velocityElement);
    
    // Create state element
    stateElement = document.createElement('div');
    stateElement.id = 'state';
    stateElement.innerHTML = 'State: Unknown';
    hudContainer.appendChild(stateElement);
    
    // Create combat indicator element
    combatIndicatorElement = document.createElement('div');
    combatIndicatorElement.id = 'combat-indicator';
    combatIndicatorElement.innerHTML = '';
    combatIndicatorElement.style.marginTop = '5px';
    combatIndicatorElement.style.display = 'none';
    hudContainer.appendChild(combatIndicatorElement);
    
    // Add HUD to document
    document.body.appendChild(hudContainer);
    
    // Add toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle HUD';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '10px';
    toggleButton.style.left = '10px';
    toggleButton.style.zIndex = '1000';
    toggleButton.addEventListener('click', toggleHUD);
    document.body.appendChild(toggleButton);
    
    console.log('HUD initialized');
}

// Update the HUD with player data
export function updateHUD(physicsState, message = "") { // Add message parameter
    if (!hudContainer) return;
    
    // Update altimeter (height)
    const height = playerBody.position.y.toFixed(2);
    altimeterElement.innerHTML = `Height: ${height}`;
    
    // Update velocity (vertical speed)
    const velocity = playerVelocity.y.toFixed(2);
    const velocityColor = getVelocityColor(playerVelocity.y);
    velocityElement.innerHTML = `Velocity: <span style="color: ${velocityColor}">${velocity}</span>`;
    
    // Update state
    stateElement.innerHTML = `State: ${physicsState || "Unknown"}`;
    
    // Add visual indicator for velocity
    const indicator = '▼';
    if (playerVelocity.y < -0.5) {
        velocityElement.innerHTML += ` ${indicator.repeat(Math.min(5, Math.floor(Math.abs(playerVelocity.y) * 2)))}`;
    } else if (playerVelocity.y > 0.5) {
        velocityElement.innerHTML += ` ${'▲'.repeat(Math.min(5, Math.floor(playerVelocity.y * 2)))}`;
    }
    
    // Update message (e.g., portal prompt)
    if (message) {
        combatIndicatorElement.style.display = 'block';
        combatIndicatorElement.innerHTML = message;
        combatIndicatorElement.style.color = '#9400D3'; // Match portal color
    } else if (!showCombatIndicator) {
        combatIndicatorElement.style.display = 'none';
        combatIndicatorElement.innerHTML = '';
    }
    
    // Update combat indicator
    updateCombatIndicator();
}

// Get color based on velocity
function getVelocityColor(velocity) {
    if (velocity < -0.5) {
        return '#ff4444'; // Red for fast descent
    } else if (velocity < -0.1) {
        return '#ffaa44'; // Orange for moderate descent
    } else if (velocity > 0.1) {
        return '#44ff44'; // Green for ascent
    } else {
        return '#ffffff'; // White for near-zero velocity
    }
}

// Toggle HUD visibility
function toggleHUD() {
    if (hudContainer.style.display === 'none') {
        hudContainer.style.display = 'block';
    } else {
        hudContainer.style.display = 'none';
    }
}

// Show combat indicator when player is in position to pop a balloon
export function showBalloonTargetIndicator() {
    if (!combatIndicatorElement) return;
    
    showCombatIndicator = true;
    combatIndicatorTimer = 5; // Show for 5 frames
    
    combatIndicatorElement.style.display = 'block';
    combatIndicatorElement.innerHTML = '🎈 Target Locked!';
    combatIndicatorElement.style.color = '#ffff00'; // Yellow
}

// Update combat indicator
function updateCombatIndicator() {
    if (!combatIndicatorElement) return;
    
    if (showCombatIndicator) {
        combatIndicatorTimer--;
        
        if (combatIndicatorTimer <= 0) {
            showCombatIndicator = false;
            combatIndicatorElement.style.display = 'none';
        }
    }
}