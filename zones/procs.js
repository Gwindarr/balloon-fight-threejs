// zones/procs.js - Procedural Zone Generation
import * as THREE from 'three';

// Simple Pseudo-Random Number Generator (PRNG) using mulberry32 algorithm
function mulberry32(seed) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Define some basic themes
const themes = {
    "Purple Swamp": {
        groundColor: 0x550055, // Dark Purple
        platformColor: 0x00FF00, // Bright Green
        fogColor: 0x400040
    },
    "Desert Oasis": {
        groundColor: 0xC19A6B, // Sandy Brown
        platformColor: 0xADD8E6, // Light Blue
        fogColor: 0xFAEBD7 // Antique White
    },
    "Default": {
        groundColor: 0x808080, // Grey
        platformColor: 0x008080, // Teal
        fogColor: 0xA0A0A0
    }
};

export function generateZone(themeName, seed, position) {
    console.log(`Generating zone with theme: ${themeName}, seed: ${seed}, position: ${position.x},${position.y},${position.z}`);
    const zone = new THREE.Group();
    zone.position.copy(position);

    // Initialize PRNG with the seed
    const random = mulberry32(seed);

    // Get theme colors, fallback to Default
    const theme = themes[themeName] || themes["Default"];

    // --- Ground ---
    const zoneSize = 200; // Size of the zone area
    const groundGeometry = new THREE.PlaneGeometry(zoneSize, zoneSize);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: theme.groundColor,
        side: THREE.DoubleSide,
        shininess: 10 // Add some shininess
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    zone.add(ground);

    // --- Platforms ---
    const platformCount = 5 + Math.floor(random() * 6); // 5 to 10 platforms
    const platformMaterial = new THREE.MeshPhongMaterial({
        color: theme.platformColor,
        shininess: 30
    });

    for (let i = 0; i < platformCount; i++) {
        const pWidth = 5 + random() * 10; // Width 5-15
        const pHeight = 1 + random() * 2;  // Height 1-3
        const pDepth = 5 + random() * 10; // Depth 5-15

        const platformGeometry = new THREE.BoxGeometry(pWidth, pHeight, pDepth);
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);

        // Random position within the zone, ensuring they are above ground
        const pX = (random() - 0.5) * (zoneSize - pWidth);
        const pY = 5 + random() * 20; // Height 5-25 above ground
        const pZ = (random() - 0.5) * (zoneSize - pDepth);

        platform.position.set(pX, pY, pZ);
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData = { type: 'platform' }; // Mark as platform for collisions
        zone.add(platform);
    }

    // --- Optional: Zone-specific Fog (could override main scene fog if desired) ---
    // Example: Add local fog matching the theme
    // Note: This would require managing fog state when entering/leaving zones.
    // For now, we rely on the main scene's fog.
    // const zoneFog = new THREE.FogExp2(theme.fogColor, 0.01);
    // zone.fog = zoneFog; // This doesn't work directly on Groups, needs scene management

    console.log(`Generated zone with ${platformCount} platforms.`);
    return zone;
}
