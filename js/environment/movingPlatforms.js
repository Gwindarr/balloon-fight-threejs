import * as THREE from 'three';
import { scene } from '../scene.js';

export let movingPlatforms = [];

// Create moving platforms
export function createMovingPlatforms() {
    const createdPlatforms = []; // Keep track of platforms created in this function

    // Horizontally rotating platform (spins like a record)
    const horizRotatingPlatform = createHorizontallyRotatingPlatform(20, 25, 30, 25, 1, 10);
    createdPlatforms.push(horizRotatingPlatform);

    // Vertically rotating platform (like a Ferris wheel)
    const vertRotatingPlatform = createVerticallyRotatingPlatform(-70, 40, -20, 20, 1, 8);
    createdPlatforms.push(vertRotatingPlatform);

    // Bonus: Orbital platform
    const orbitalPlatform = createOrbitalPlatform(0, 35, 0, 30, 15, 1, 8);
    createdPlatforms.push(orbitalPlatform);

    // Bonus: Elevator platform
    const elevatorPlatform = createElevatorPlatform(-20, 50, 60, 20, 1, 10, 20);
    createdPlatforms.push(elevatorPlatform);

    movingPlatforms = createdPlatforms; // Assign to the exported array
    return createdPlatforms; // Return for combining in the main init function
}

// Create a horizontally rotating platform
function createHorizontallyRotatingPlatform(x, y, z, width, height, depth) {
    const platformGeometry = new THREE.BoxGeometry(width, height, depth);
    const platformMaterial = new THREE.MeshLambertMaterial({
        color: 0x6A5ACD // Slate blue
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y, z);
    scene.add(platform);

    // Add a distinctive edge
    const edgeGeometry = new THREE.BoxGeometry(width, 0.3, depth);
    const edgeMaterial = new THREE.MeshLambertMaterial({
        color: 0x00FFFF // Cyan edge
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = height / 2 + 0.15; // Position on top of platform
    platform.add(edge);

    // Add rotating platform properties
    platform.userData = {
        type: 'platform_rotating_horizontal',
        rotationSpeed: 0.005, // radians per frame
        rotationAxis: new THREE.Vector3(0, 1, 0),
        center: new THREE.Vector3(x, y, z),
        radius: 0, // Rotates in place
        angle: 0,
        lastPosition: new THREE.Vector3(x, y, z)
    };

    return platform;
}

// Create a vertically rotating platform
function createVerticallyRotatingPlatform(x, y, z, width, height, depth) {
    const platformGeometry = new THREE.BoxGeometry(width, height, depth);
    const platformMaterial = new THREE.MeshLambertMaterial({
        color: 0xFF6347 // Tomato
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y, z);
    scene.add(platform);

    // Add a distinctive edge
    const edgeGeometry = new THREE.BoxGeometry(width, 0.3, depth);
    const edgeMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFD700 // Gold edge
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = height / 2 + 0.15; // Position on top of platform
    platform.add(edge);

    // Add rotating platform properties
    platform.userData = {
        type: 'platform_rotating_vertical',
        rotationSpeed: 0.003, // radians per frame
        rotationAxis: new THREE.Vector3(0, 0, 1),
        center: new THREE.Vector3(x, y, z),
        radius: 0, // Rotates in place
        angle: 0,
        lastPosition: new THREE.Vector3(x, y, z)
    };

    return platform;
}

// Create an orbital platform (moves in a circular path)
function createOrbitalPlatform(centerX, centerY, centerZ, radius, width, height, depth) {
    const platformGeometry = new THREE.BoxGeometry(width, height, depth);
    const platformMaterial = new THREE.MeshLambertMaterial({
        color: 0x32CD32 // Lime green
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);

    // Place initially at a point on the circle
    platform.position.set(centerX + radius, centerY, centerZ);
    scene.add(platform);

    // Add a distinctive edge
    const edgeGeometry = new THREE.BoxGeometry(width, 0.3, depth);
    const edgeMaterial = new THREE.MeshLambertMaterial({
        color: 0x9ACD32 // Yellow-green edge
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = height / 2 + 0.15; // Position on top of platform
    platform.add(edge);

    // Add orbital platform properties
    platform.userData = {
        type: 'platform_orbital',
        rotationSpeed: 0.01,
        center: new THREE.Vector3(centerX, centerY, centerZ),
        radius: radius,
        angle: 0,
        lastPosition: new THREE.Vector3().copy(platform.position)
    };

    return platform;
}

// Create an elevator platform (moves up and down)
function createElevatorPlatform(x, y, z, width, height, depth, amplitude) {
    const platformGeometry = new THREE.BoxGeometry(width, height, depth);
    const platformMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFA500 // Orange
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y, z);
    scene.add(platform);

    // Add a distinctive edge
    const edgeGeometry = new THREE.BoxGeometry(width, 0.3, depth);
    const edgeMaterial = new THREE.MeshLambertMaterial({
        color: 0xFF4500 // Orange-red edge
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = height / 2 + 0.15; // Position on top of platform
    platform.add(edge);

    // Add elevator platform properties
    platform.userData = {
        type: 'platform_elevator',
        time: 0,
        center: new THREE.Vector3(x, y, z),
        amplitude: amplitude || 10, // How far it moves up/down
        lastPosition: new THREE.Vector3().copy(platform.position)
    };

    return platform;
}

// Update function for moving platforms
export function updateMovingPlatforms() {
    if (movingPlatforms && movingPlatforms.length > 0) {
        for (const platform of movingPlatforms) {
            // Store current position for physics calculations
            if (!platform.userData.lastPosition) {
                platform.userData.lastPosition = new THREE.Vector3();
            }
            platform.userData.lastPosition.copy(platform.position);

            if (platform.userData.type === 'platform_rotating_horizontal') {
                // Rotate around Y-axis
                platform.rotation.y += platform.userData.rotationSpeed;
                platform.userData.angle += platform.userData.rotationSpeed;
            }
            else if (platform.userData.type === 'platform_rotating_vertical') {
                // Rotate around Z-axis
                platform.rotation.z += platform.userData.rotationSpeed;
                platform.userData.angle += platform.userData.rotationSpeed;
            }
            else if (platform.userData.type === 'platform_orbital') {
                // Move in circular orbit
                platform.userData.angle += platform.userData.rotationSpeed;
                platform.position.x = platform.userData.center.x + Math.cos(platform.userData.angle) * platform.userData.radius;
                platform.position.z = platform.userData.center.z + Math.sin(platform.userData.angle) * platform.userData.radius;
            }
            else if (platform.userData.type === 'platform_elevator') {
                // Move up and down
                platform.userData.time += 0.02;
                platform.position.y = platform.userData.center.y +
                                   Math.sin(platform.userData.time) * platform.userData.amplitude;
            }
        }
    }
}
