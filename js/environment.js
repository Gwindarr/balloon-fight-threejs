import { scene } from './scene.js';

// Exports
export const groundSize = 500;
export let ground;
export let water;
export let platforms = [];
export let movingPlatforms = [];
export let heightMarkerClouds = [];

export function initEnvironment() {
    createGround();
    createWater();
    createPlatforms();
    createMovingPlatforms();
    createMountains();
    createClouds();
    createHeightMarkers();
    
    // Make platforms accessible globally for collision system
    window.environmentPlatforms = platforms;
}

// Create ground
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x228b22 // Forest green
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0; // At y=0 so player stands on it
    ground.userData = {
        type: 'ground'
    };
    scene.add(ground);
    
    // Add grid on ground for better visibility
    const gridHelper = new THREE.GridHelper(groundSize, 50, 0x000000, 0x555555);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    scene.add(gridHelper);
    
    // Add boundary markers at the corners
    createBoundaryMarker(200, 200, 0xff0000); // Red corner
    createBoundaryMarker(-200, 200, 0xff0000); // Red corner
    createBoundaryMarker(200, -200, 0xff0000); // Red corner
    createBoundaryMarker(-200, -200, 0xff0000); // Red corner
}

// Create boundary marker
function createBoundaryMarker(x, z, color) {
    const markerGeometry = new THREE.BoxGeometry(2, 10, 2);
    const markerMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, 3, z);
    scene.add(marker);
}

// Create water surface
function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(groundSize, groundSize / 2);
    const waterMaterial = new THREE.MeshLambertMaterial({
        color: 0x4444ff,
        transparent: true,
        opacity: 0.7
    });
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.z = groundSize / 4;
    water.position.y = 0.1; // Slightly above ground
    water.userData = {
        type: 'water'
    };
    scene.add(water);
}

// Create platforms
function createPlatforms() {
    platforms = [
        // Original platforms - slightly modified positions
        createFloatingPlatform(30, 15, -20, 20, 10),
        createFloatingPlatform(-25, 30, -10, 25, 12),
        createFloatingPlatform(0, 45, -30, 30, 15),
        createFloatingPlatform(-40, 60, 10, 25, 12),
        createFloatingPlatform(50, 75, 0, 20, 10),
        
        // Additional platforms
        createFloatingPlatform(-60, 20, -40, 22, 12),
        createFloatingPlatform(60, 35, -60, 24, 14),
        createFloatingPlatform(20, 55, 40, 26, 13),
        createFloatingPlatform(-30, 70, 50, 22, 11),
        createFloatingPlatform(0, 90, -80, 28, 15)
    ];
}

// Create moving platforms
function createMovingPlatforms() {
    // Horizontally rotating platform (spins like a record)
    const horizRotatingPlatform = createHorizontallyRotatingPlatform(20, 25, 30, 25, 1, 10);
    platforms.push(horizRotatingPlatform);
    movingPlatforms.push(horizRotatingPlatform);
    
    // Vertically rotating platform (like a Ferris wheel)
    const vertRotatingPlatform = createVerticallyRotatingPlatform(-70, 40, -20, 20, 1, 8);
    platforms.push(vertRotatingPlatform);
    movingPlatforms.push(vertRotatingPlatform);
    
    // Bonus: Orbital platform
    const orbitalPlatform = createOrbitalPlatform(0, 35, 0, 30, 15, 1, 8);
    platforms.push(orbitalPlatform);
    movingPlatforms.push(orbitalPlatform);
    
    // Bonus: Elevator platform
    const elevatorPlatform = createElevatorPlatform(-20, 50, 60, 20, 1, 10, 20);
    platforms.push(elevatorPlatform);
    movingPlatforms.push(elevatorPlatform);
}

// Create a floating platform
function createFloatingPlatform(x, y, z, width, depth) {
    const platformGeometry = new THREE.BoxGeometry(width, 1, depth);
    const platformMaterial = new THREE.MeshLambertMaterial({
        color: 0x8b4513 // Brown wood color
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y, z);
    scene.add(platform);
    
    // Add platform type for collision system
    platform.userData = {
        type: 'platform_static',
        lastPosition: new THREE.Vector3().copy(platform.position)
    };
    
    // Add a colorful edge to make height more visible
    const edgeGeometry = new THREE.BoxGeometry(width, 0.2, depth);
    const edgeMaterial = new THREE.MeshLambertMaterial({
        color: 0xffff00 // Yellow edge
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 0.6; // Position on top of platform
    platform.add(edge);
    
    return platform;
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
    edge.position.y = height/2 + 0.15; // Position on top of platform
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
    edge.position.y = height/2 + 0.15; // Position on top of platform
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
    edge.position.y = height/2 + 0.15; // Position on top of platform
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
    edge.position.y = height/2 + 0.15; // Position on top of platform
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

// Create mountains for depth perception
function createMountains() {
    createDistantMountain(-200, 150, -300, 300, 100, 0x6b8e23); // Olive green
    createDistantMountain(250, 180, -350, 360, 120, 0x556b2f); // Darker green
    createDistantMountain(0, 200, -400, 400, 150, 0x2f4f4f); // Dark slate gray
}

// Create a distant mountain
function createDistantMountain(x, y, z, height, radius, color) {
    const mountainGeometry = new THREE.ConeGeometry(radius, height, 8);
    const mountainMaterial = new THREE.MeshLambertMaterial({
        color: color
    });
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.set(x, y, z);
    scene.add(mountain);
}

// Create clouds for altitude perception
function createClouds() {
    // Create clouds at regular height intervals to help gauge altitude
    for (let height = 10; height <= 100; height += 15) {
        // Create clouds at different positions for each height
        heightMarkerClouds.push(
            createCloud(-50, height, Math.random() * 50 - 25),
            createCloud(50, height, Math.random() * 50 - 25)
        );
    }
}

// Create a cloud
function createCloud(x, y, z) {
    const cloud = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    // Create several spheres to form a cloud
    for (let i = 0; i < 5; i++) {
        const radius = 2 + Math.random() * 2;
        const cloudPartGeometry = new THREE.SphereGeometry(radius, 8, 8);
        const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudMaterial);
        
        // Position each part randomly within a small area
        cloudPart.position.set(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 5
        );
        cloud.add(cloudPart);
    }
    
    cloud.position.set(x, y, z);
    scene.add(cloud);
    
    return cloud;
}

// Create height markers
function createHeightMarkers() {
    for (let height = 10; height <= 100; height += 10) {
        // Create lines instead of rings
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({
            color: height % 20 === 0 ? 0xff0000 : 0xffffff, // Red for every 20 units
            linewidth: 2 // Note: linewidth > 1 only works in some browsers
        });
        
        // Create points for a square at this height
        const size = 250;
        const points = [
            new THREE.Vector3(-size, height, -size),
            new THREE.Vector3(size, height, -size),
            new THREE.Vector3(size, height, size),
            new THREE.Vector3(-size, height, size),
            new THREE.Vector3(-size, height, -size)
        ];
        
        lineGeometry.setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }
}

// Update function for moving platforms - Call this in your animation loop
export function updateMovingPlatforms() {
    if (!movingPlatforms || movingPlatforms.length === 0) return;
    
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
