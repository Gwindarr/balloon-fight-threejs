import * as THREE from 'three';
import { scene } from '../scene.js';

export const groundSize = 300; // Reduced from 500
export let ground;

// Create ground
export function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: 0x2E8B57,
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.userData = { type: 'ground' };
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(groundSize, 50, 0x000000, 0x555555);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    createBoundaryMarker(200, 200, 0xff0000);
    createBoundaryMarker(-200, 200, 0xff0000);
    createBoundaryMarker(200, -200, 0xff0000);
    createBoundaryMarker(-200, -200, 0xff0000);
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
