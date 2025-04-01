import * as THREE from 'three';
import { scene } from '../scene.js';
import { groundSize } from './ground.js'; // Import groundSize

export let water;

// Create water surface
export function createWater() {
    // Make water plane the same size as the ground plane
    const waterGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8,
        emissive: 0x0A1D2E,
        emissiveIntensity: 0.2
    });
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.1;
    water.userData = { type: 'water' };
    water.receiveShadow = true;
    scene.add(water);

    // Make ripples the same size as the water/ground plane
    const rippleGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 20, 20);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    const ripples = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripples.rotation.x = -Math.PI / 2;
    ripples.position.y = 0.15;
    water.add(ripples);
    water.userData.ripples = ripples;
    water.userData.rippleTime = 0;
}

// Update function for water ripples
export function updateWater() {
    if (water && water.userData.ripples) {
        water.userData.rippleTime += 0.02;
        const vertices = water.userData.ripples.geometry.attributes.position;

        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i);
            const z = vertices.getZ(i);
            vertices.setY(i,
                Math.sin(x * 0.2 + water.userData.rippleTime) * 0.2 +
                Math.cos(z * 0.3 + water.userData.rippleTime * 1.3) * 0.3
            );
        }
        vertices.needsUpdate = true;
    }
}
