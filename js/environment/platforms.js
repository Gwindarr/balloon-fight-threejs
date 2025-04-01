import * as THREE from 'three';
import { scene } from '../scene.js';

export let platforms = [];

// Create platforms
export function createStaticPlatforms() {
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
    // Return the created platforms so they can be combined later
    return platforms;
}

// Create a floating platform
function createFloatingPlatform(x, y, z, width, depth) {
    const platformGeometry = new THREE.BoxGeometry(width, 1, depth);
    const platformMaterial = new THREE.MeshPhongMaterial({
        color: 0xD2691E
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);

    platform.userData = {
        type: 'platform_static',
        lastPosition: new THREE.Vector3().copy(platform.position)
    };

    const edgeGeometry = new THREE.BoxGeometry(width, 0.2, depth);
    const edgeMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFD700
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 0.6;
    platform.add(edge);

    return platform;
}
