import * as THREE from 'three';
import { scene } from '../scene.js';

// Create height markers
export function createHeightMarkers() {
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
