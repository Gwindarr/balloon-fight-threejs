import { scene } from './scene.js';

// Exports
export const groundSize = 500;
export let ground;
export let water;
export let platforms = [];
export let heightMarkerClouds = [];

export function initEnvironment() {
    createGround();
    createWater();
    createPlatforms();
    createMountains();
    createClouds();
    createHeightMarkers();
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
    scene.add(water);
}

// Create platforms
function createPlatforms() {
    platforms = [
        createFloatingPlatform(30, 15, -20, 20, 5),
        createFloatingPlatform(-25, 30, -10, 15, 5),
        createFloatingPlatform(0, 45, -30, 25, 5),
        createFloatingPlatform(-40, 60, 10, 15, 5),
        createFloatingPlatform(50, 75, 0, 20, 5)
    ];
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