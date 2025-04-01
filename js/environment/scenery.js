import * as THREE from 'three';
import { scene } from '../scene.js';
import { gaussianRand } from './utils.js'; // Import the utility function

export let heightMarkerClouds = []; // For non-collidable clouds

// --- Scenery Creation ---

// Main function to create all scenery elements
export function createScenery() {
    createMountains();
    createNonCollidableClouds(); // Renamed from createClouds to avoid confusion
}

// Create mountains and other zone boundaries for depth perception
function createMountains() {
    // Back boundary: Existing mountain ranges
    createMountainRange(-250, 0, -400, 400, 200, 0x4B0082, 5); // Purple range
    createMountainRange(250, 0, -400, 450, 220, 0x1E90FF, 6); // Blue range
    createMountainRange(0, 0, -500, 500, 250, 0x2E8B57, 7);  // Dark green far range
    createMountainRange(-180, 0, -200, 150, 120, 0x556B2F, 3); // Olive green closer
    createMountainRange(180, 0, -200, 160, 130, 0x6B8E23, 4); // Olive drab closer

    // Left boundary: Forest with tall trees and vines
    createForestBoundary(-200, 0, 0, 500, 50); // Centered along z-axis
}

// Create clouds for altitude perception (non-collidable)
function createNonCollidableClouds() {
    // Create clouds at regular height intervals to help gauge altitude
    for (let height = 10; height <= 100; height += 15) {
        // Create clouds at different positions for each height
        heightMarkerClouds.push(
            createCloud(-50, height, Math.random() * 50 - 25),
            createCloud(50, height, Math.random() * 50 - 25)
        );
    }
}

// --- Mountain Helpers ---

// Create a mountain range with multiple peaks
function createMountainRange(x, baseHeight, z, width, maxHeight, baseColor, peakCount) {
    const rangeGroup = new THREE.Group();
    const peakWidth = width / peakCount;

    for (let i = 0; i < peakCount; i++) {
        const peakX = x + (i * peakWidth) - (width / 2) + (peakWidth / 2);
        const peakHeight = maxHeight * (0.6 + Math.random() * 0.5); // More height variation
        const peakRadius = peakWidth * (0.7 + Math.random() * 0.5); // More radius variation
        // const peakColor = new THREE.Color(baseColor).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1); // Slight color variation - removed for gradient

        // Main peak with noise for ruggedness
        const segments = 32; // More segments for smoother noise
        const mountainGeometry = new THREE.ConeGeometry(peakRadius, peakHeight, segments);

        // Apply noise to geometry for rugged look
        const positions = mountainGeometry.attributes.position;
        for (let j = 0; j < positions.count; j++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, j);
            const heightRatio = vertex.y / (peakHeight / 2); // -1 to 1 from base to peak
            if (heightRatio > -0.8) { // Avoid base to prevent distortion
                const noise = (Math.random() - 0.5) * 0.3 * peakRadius * (1 - Math.abs(heightRatio));
                vertex.x += noise;
                vertex.z += noise;
            }
            positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }
        positions.needsUpdate = true;
        mountainGeometry.computeVertexNormals();

        // Gradient color: darker at base, lighter at peak
        const baseColorDark = new THREE.Color(baseColor).multiplyScalar(0.7);
        const peakColorLight = new THREE.Color(baseColor).multiplyScalar(1.2);
        const vertexColors = new Float32Array(positions.count * 3);
        for (let j = 0; j < positions.count; j++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, j);
            const heightRatio = vertex.y / (peakHeight / 2); // -1 (base) to 1 (peak)
            const t = (heightRatio + 1) / 2; // 0 (base) to 1 (peak)
            const color = baseColorDark.clone().lerp(peakColorLight, t);
            vertexColors[j * 3] = color.r;
            vertexColors[j * 3 + 1] = color.g;
            vertexColors[j * 3 + 2] = color.b;
        }
        mountainGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

        const mountainMaterial = new THREE.MeshPhongMaterial({
            vertexColors: true,
            flatShading: false,
        });
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(peakX, baseHeight + peakHeight / 2, z);
        rangeGroup.add(mountain);

        // Add snow cap for taller peaks
        if (peakHeight > maxHeight * 0.8) {
            const snowHeight = peakHeight * 0.2; // Top 20% is snow
            const snowGeometry = new THREE.ConeGeometry(peakRadius * 0.5, snowHeight, segments);
            const snowMaterial = new THREE.MeshPhongMaterial({
                color: 0xF5F5F5, // Snow white
                emissive: 0xD3D3D3,
                emissiveIntensity: 0.1
            });
            const snowCap = new THREE.Mesh(snowGeometry, snowMaterial);
            snowCap.position.set(peakX, baseHeight + peakHeight - snowHeight / 2, z);
            rangeGroup.add(snowCap);
        }

        // Add rocky details with varied colors
        const detailCount = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < detailCount; j++) {
            const detailSize = peakRadius * (0.2 + Math.random() * 0.3);
            const detailGeometry = new THREE.BoxGeometry(detailSize, detailSize, detailSize);
            const detailMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0x808080).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2), // Gray with variation
            });
            const detail = new THREE.Mesh(detailGeometry, detailMaterial);

            const angle = Math.random() * Math.PI * 2;
            const distance = peakRadius * (0.3 + Math.random() * 0.5);
            const heightRatio = Math.random() * 0.8 + 0.2;

            detail.position.set(
                peakX + Math.cos(angle) * distance,
                baseHeight + (peakHeight * heightRatio),
                z + Math.sin(angle) * distance
            );

            detail.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            rangeGroup.add(detail);
        }
    }

    scene.add(rangeGroup);
}

// --- Forest Helpers ---

// Create a forest boundary with a natural, randomized layout
function createForestBoundary(x, baseHeight, z, length, width) {
    const forestGroup = new THREE.Group();

    // Use larger values for the forest area
    const forestDepth = 150; // Deep forest
    const forestWidth = length; // Make it span the entire side

    // Create forest floor first
    createForestFloor(forestGroup, x - forestDepth / 2, baseHeight, z, forestWidth, forestDepth);

    // Create transition zone between water and forest
    createWaterToForestTransition(forestGroup, x, baseHeight, z, forestWidth, 20);

    // Number of trees to create
    const totalTrees = 350; // Lots of trees

    // Create trees with natural clustering
    for (let i = 0; i < totalTrees; i++) {
        // Use a normal-like distribution to create more trees near the center
        // and fewer at the edges
        const zPosition = gaussianRand() * forestWidth * 0.45;
        const zCoord = z + zPosition;

        // Use a distance-based distribution that gets denser away from the edge
        const distanceFactor = Math.random() * Math.random(); // Quadratic falloff
        const xCoord = x - distanceFactor * forestDepth;

        // Add some height variation
        const heightOffset = (Math.random() - 0.5) * 2;

        // Create trees with size variation based partly on position
        // Trees deeper in the forest can be taller
        const sizeFactor = 0.8 + (distanceFactor * 0.4) + (Math.random() * 0.3);

        // Add more randomness to tree type selection
        const treeTypeRand = Math.random();

        // Different probabilities for different tree types
        // with some clustering tendencies
        let treeType;
        if (treeTypeRand < 0.4) {
            treeType = 0; // Pine trees
        } else if (treeTypeRand < 0.8) {
            treeType = 1; // Leafy trees
        } else {
            treeType = 2; // Twisted trees
        }

        // Add cluster effect - trees of same type tend to grow near each other
        // If we're generating a leafy tree, slightly increase chance of other leafy trees nearby
        if (Math.random() < 0.5 && i < totalTrees - 5) {
            // Create a small cluster of similar trees
            const clusterSize = 1 + Math.floor(Math.random() * 4);
            const clusterRadius = 5 + Math.random() * 10;

            // Create the main tree
            if (treeType === 0) {
                createPineTree(forestGroup, xCoord, baseHeight + heightOffset, zCoord, sizeFactor);
            } else if (treeType === 1) {
                createLeafyTree(forestGroup, xCoord, baseHeight + heightOffset, zCoord, sizeFactor);
            } else {
                createTwistedTree(forestGroup, xCoord, baseHeight + heightOffset, zCoord, sizeFactor);
            }

            // Create cluster around this tree
            for (let j = 0; j < clusterSize; j++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * clusterRadius;
                const clusterX = xCoord + Math.cos(angle) * distance;
                const clusterZ = zCoord + Math.sin(angle) * distance;

                // Slightly vary height and size within cluster
                const clusterHeight = heightOffset + (Math.random() - 0.5) * 1;
                const clusterSizeFactor = sizeFactor * (0.8 + Math.random() * 0.4); // Renamed variable

                // Small chance of different tree type within cluster
                const sameType = Math.random() < 0.8;
                const clusterType = sameType ? treeType : Math.floor(Math.random() * 3);

                if (clusterType === 0) {
                    createPineTree(forestGroup, clusterX, baseHeight + clusterHeight, clusterZ, clusterSizeFactor);
                } else if (clusterType === 1) {
                    createLeafyTree(forestGroup, clusterX, baseHeight + clusterHeight, clusterZ, clusterSizeFactor);
                } else {
                    createTwistedTree(forestGroup, clusterX, baseHeight + clusterHeight, clusterZ, clusterSizeFactor);
                }

                // Skip ahead in the main loop to account for trees we created
                i++;
                if (i >= totalTrees - 1) break;
            }
        } else {
            // Create individual tree
            if (treeType === 0) {
                createPineTree(forestGroup, xCoord, baseHeight + heightOffset, zCoord, sizeFactor);
            } else if (treeType === 1) {
                createLeafyTree(forestGroup, xCoord, baseHeight + heightOffset, zCoord, sizeFactor);
            } else {
                createTwistedTree(forestGroup, xCoord, baseHeight + heightOffset, zCoord, sizeFactor);
            }
        }
    }

    // Add animated elements
    createForestAnimations(forestGroup, x - forestDepth / 2, baseHeight, z, forestWidth, forestDepth);

    scene.add(forestGroup);
}

// Create transition between water and forest
function createWaterToForestTransition(group, x, baseHeight, z, length, width) {
    // Create shoreline with different material
    const shoreGeometry = new THREE.PlaneGeometry(length * 1.2, width);
    const shoreMaterial = new THREE.MeshPhongMaterial({
        color: 0x826644, // Sandy brown
        shininess: 0
    });

    const shore = new THREE.Mesh(shoreGeometry, shoreMaterial);
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(x, baseHeight, z); // Position exactly at baseHeight (0)
    shore.receiveShadow = true;
    group.add(shore);

    // Add water plants and reeds along the shore
    for (let i = 0; i < 80; i++) {
        const plantX = x + (Math.random() - 0.5) * length;
        const plantZ = z + (Math.random() - 0.5) * width;

        if (Math.random() > 0.7) {
            // Create tall reeds
            createReed(group, plantX, baseHeight, plantZ);
        } else {
            // Create low water plants
            createWaterPlant(group, plantX, baseHeight, plantZ);
        }
    }
}

// Create a reed plant for water transition
function createReed(group, x, baseHeight, z) {
    const reedHeight = 1.5 + Math.random() * 1.5;
    const reedGeometry = new THREE.CylinderGeometry(0.05, 0.08, reedHeight, 4);
    const reedMaterial = new THREE.MeshPhongMaterial({
        color: 0x556B2F, // Dark olive green
        shininess: 0,
        flatShading: true
    });

    const reed = new THREE.Mesh(reedGeometry, reedMaterial);
    reed.position.set(x, baseHeight + reedHeight / 2, z);

    // Add random tilt
    reed.rotation.x = (Math.random() - 0.5) * 0.2;
    reed.rotation.z = (Math.random() - 0.5) * 0.2;

    group.add(reed);

    // Add reed head/flower
    if (Math.random() > 0.5) {
        const headGeometry = new THREE.CylinderGeometry(0.12, 0.05, 0.5, 4);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513, // Brown
            shininess: 0,
            flatShading: true
        });

        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, reedHeight / 2 + 0.1, 0);
        reed.add(head);
    }
}

// Create a water plant for transition area
function createWaterPlant(group, x, baseHeight, z) {
    const plantSize = 0.3 + Math.random() * 0.5;

    // Create several leaves
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, baseHeight, z);

    const leafCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < leafCount; i++) {
        const leafGeometry = new THREE.PlaneGeometry(plantSize, plantSize * 3);
        const leafMaterial = new THREE.MeshPhongMaterial({
            color: 0x006400, // Dark green
            side: THREE.DoubleSide,
            shininess: 0
        });

        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

        // Position leaves in a circular pattern
        const angle = (i / leafCount) * Math.PI * 2;
        leaf.rotation.x = Math.PI / 2 - 0.5; // Angle from ground
        leaf.rotation.y = angle;

        plantGroup.add(leaf);
    }

    group.add(plantGroup);
}

// Create a forest rock with variation
function createForestRock(group, x, baseHeight, z) {
    const rockSize = 0.5 + Math.random() * 1.5;
    const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
    const rockMaterial = new THREE.MeshPhongMaterial({
        color: 0x696969, // Gray
        shininess: 0,
        flatShading: true
    });

    // Distort vertices for natural look
    const positions = rockGeometry.attributes.position;
    for (let j = 0; j < positions.count; j++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positions, j);

        const noise = (Math.random() - 0.5) * 0.3;
        vertex.multiplyScalar(1 + noise);

        positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
    }
    positions.needsUpdate = true;
    rockGeometry.computeVertexNormals();

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, baseHeight + rockSize / 2, z);
    rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // Random moss on some rocks
    if (Math.random() > 0.6) {
        const mossGeometry = new THREE.SphereGeometry(rockSize * 0.8, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const mossMaterial = new THREE.MeshPhongMaterial({
            color: 0x567d46, // Moss green
            transparent: true,
            opacity: 0.9
        });

        const moss = new THREE.Mesh(mossGeometry, mossMaterial);
        moss.position.set(0, rockSize * 0.2, 0);
        moss.rotation.set(Math.PI, 0, 0);
        rock.add(moss);
    }
}

// Create a fallen log with moss
function createFallenLog(group, x, baseHeight, z) {
    const logLength = 2 + Math.random() * 6;
    const logRadius = 0.3 + Math.random() * 0.5;
    const logGeometry = new THREE.CylinderGeometry(logRadius * 0.8, logRadius, logLength, 8);
    const logMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513, // Brown
        shininess: 0,
        flatShading: true
    });

    const log = new THREE.Mesh(logGeometry, logMaterial);

    // Rotate to lay on side with random orientation
    log.rotation.set(
        Math.PI / 2 + (Math.random() - 0.5) * 0.2, // Almost horizontal but with slight variation
        Math.random() * Math.PI * 2,             // Random direction
        (Math.random() - 0.5) * 0.2              // Slight tilt
    );

    // Position half-buried in ground
    log.position.set(x, baseHeight + logRadius * 0.6, z);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);

    // Add moss and details
    if (Math.random() > 0.4) {
        const mossGeometry = new THREE.PlaneGeometry(logLength * 0.7, logRadius * 2);
        const mossMaterial = new THREE.MeshPhongMaterial({
            color: 0x567d46, // Moss green
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const moss = new THREE.Mesh(mossGeometry, mossMaterial);
        // Position on top of log
        moss.rotation.x = -Math.PI / 2;
        moss.position.set(0, logRadius * 0.5, 0);
        log.add(moss);
    }

    // Add some mushrooms to some logs
    if (Math.random() > 0.6) {
        const mushroomCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < mushroomCount; i++) {
            createMushroom(log, (Math.random() - 0.5) * logLength * 0.7, logRadius * 0.7, 0);
        }
    }
}

// Create a mushroom
function createMushroom(parent, x, y, z) {
    const stemHeight = 0.2 + Math.random() * 0.3;
    const stemRadius = 0.05 + Math.random() * 0.05;
    const capRadius = stemRadius * 2;

    // Create stem
    const stemGeometry = new THREE.CylinderGeometry(stemRadius * 0.8, stemRadius, stemHeight, 8);
    const stemMaterial = new THREE.MeshPhongMaterial({
        color: 0xDCDCDC, // Light gray
        shininess: 0
    });

    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.set(x, y + stemHeight / 2, z);

    // Create cap
    const capGeometry = new THREE.SphereGeometry(capRadius, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capMaterial = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0xA52A2A : 0xB22222, // Brown or red
        shininess: 0,
        flatShading: true
    });

    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.set(0, stemHeight * 0.8, 0);
    cap.rotation.x = Math.PI; // Flip cap

    stem.add(cap);
    parent.add(stem);
}

// Create forest floor with undergrowth - enhanced version
function createForestFloor(group, x, baseHeight, z, length, width) {
    // Create a larger ground area
    const groundCoverGeometry = new THREE.PlaneGeometry(width * 1.5, length * 1.5);
    const groundCoverMaterial = new THREE.MeshPhongMaterial({
        color: 0x3A5F0B, // Dark forest floor green
        shininess: 0
    });
    const groundCover = new THREE.Mesh(groundCoverGeometry, groundCoverMaterial);
    groundCover.rotation.x = -Math.PI / 2;
    groundCover.position.set(x, baseHeight, z); // Position exactly at baseHeight (0)
    groundCover.receiveShadow = true;
    group.add(groundCover);

    // Add dense ground details - more rocks, fallen logs, ferns, etc.
    const detailCount = 200; // Significantly increase details

    for (let i = 0; i < detailCount; i++) {
        const itemX = x + (Math.random() - 0.5) * width * 1.4;
        const itemZ = z + (Math.random() - 0.5) * length * 1.4;

        const detailType = Math.random();

        if (detailType > 0.7) {
            // More rocks
            createForestRock(group, itemX, baseHeight, itemZ); // Use helper function
        } else if (detailType > 0.5) {
            // More fallen logs with variations
            createFallenLog(group, itemX, baseHeight, itemZ); // Use helper function
        } else if (detailType > 0.25) {
            // More ferns and small plants
            createFern(group, itemX, baseHeight, itemZ);
        } else {
            // Add ground cover (small grass tufts, etc)
            const grassSize = 0.2 + Math.random() * 0.3;
            const grassHeight = 0.1 + Math.random() * 0.4;

            const grassGeometry = new THREE.ConeGeometry(grassSize, grassHeight, 4, 1);
            const grassMaterial = new THREE.MeshPhongMaterial({
                color: 0x556B2F, // Dark olive green
                shininess: 0,
                flatShading: true
            });

            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            grass.position.set(itemX, baseHeight + grassHeight / 2, itemZ);
            grass.rotation.set(
                (Math.random() - 0.5) * 0.2,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.2
            );
            group.add(grass);
        }
    }
}

// Create a fern plant
function createFern(group, x, baseHeight, z) {
    const fernGroup = new THREE.Group();
    fernGroup.position.set(x, baseHeight, z);

    const leafCount = 5 + Math.floor(Math.random() * 6);
    const fernHeight = 0.5 + Math.random() * 1;

    for (let i = 0; i < leafCount; i++) {
        const leafAngle = (i / leafCount) * Math.PI * 2;
        const leafTilt = Math.PI / 4 + Math.random() * Math.PI / 4;

        // Create the leaf shape
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, fernHeight * 0.6, 0),
            new THREE.Vector3(0, fernHeight, 0)
        );

        const points = curve.getPoints(10);
        const leafPath = new THREE.CatmullRomCurve3(points);

        // Create leaf
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, -0.1);
        leafShape.lineTo(0.5, 0);
        leafShape.lineTo(0, 0.1);
        leafShape.lineTo(0, -0.1);

        const extrudeSettings = {
            steps: 20,
            bevelEnabled: false,
            extrudePath: leafPath
        };

        const leafGeometry = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
        const leafMaterial = new THREE.MeshPhongMaterial({
            color: 0x228B22, // Forest green
            shininess: 0,
            flatShading: false,
            side: THREE.DoubleSide
        });

        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.rotation.y = leafAngle;
        leaf.rotation.x = leafTilt;
        leaf.castShadow = true;
        leaf.receiveShadow = true;

        fernGroup.add(leaf);
    }

    group.add(fernGroup);
}

// Updated pine tree function with height variation and some very tall trees
function createPineTree(group, x, baseHeight, z, sizeFactor = 1.0) {
    // Randomly create very tall trees (about 10% chance)
    const isVeryTall = Math.random() > 0.9;

    // Base trunk height with more variation
    let trunkHeight;
    if (isVeryTall) {
        // Create extra tall trees (up to 3x normal height)
        trunkHeight = (35 + Math.random() * 25) * sizeFactor;
    } else {
        trunkHeight = (18 + Math.random() * 10) * sizeFactor;
    }

    const trunkRadius = (0.6 + Math.random() * 0.4) * sizeFactor * (isVeryTall ? 1.2 : 1.0);
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513,
        shininess: 0,
        flatShading: true
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, baseHeight + trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Create several layers of foliage (pine tree style)
    // More layers for taller trees
    const layerCount = isVeryTall ? 8 + Math.floor(Math.random() * 4) : 5 + Math.floor(Math.random() * 3);
    const maxRadius = (4 + Math.random() * 2) * sizeFactor * (isVeryTall ? 1.3 : 1.0);

    // Random variation in green color
    const greenVariation = Math.random() * 0.1;
    const greenColor = new THREE.Color(0x006400).offsetHSL(0, 0, greenVariation);

    // Adjust layer distribution for very tall trees
    const startPercent = isVeryTall ? 0.3 : 0.4; // Start foliage higher on very tall trees

    for (let i = 0; i < layerCount; i++) {
        const layerHeight = trunkHeight * (startPercent + (i * (1.0 - startPercent) / layerCount));

        // For very tall trees, make the top layers smaller relative to the tree height
        const layerScale = isVeryTall ? (1 - (i / layerCount) * 0.8) : (1 - (i / layerCount) * 0.7);
        const layerRadius = maxRadius * layerScale;

        const coneGeometry = new THREE.ConeGeometry(layerRadius, trunkHeight / layerCount * (isVeryTall ? 1.2 : 1.5), 8);
        const coneMaterial = new THREE.MeshPhongMaterial({
            color: greenColor,
            shininess: 0,
            flatShading: true
        });

        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.set(x, baseHeight + layerHeight, z);
        cone.castShadow = true;
        cone.receiveShadow = true;
        group.add(cone);
    }
}

// Updated leafy tree function with height variation and some very tall trees
function createLeafyTree(group, x, baseHeight, z, sizeFactor = 1.0) {
    // Randomly create very tall trees (about 10% chance)
    const isVeryTall = Math.random() > 0.9;

    // Trunk with height variation
    let trunkHeight;
    if (isVeryTall) {
        // Create extra tall trees (up to 3x normal height)
        trunkHeight = (30 + Math.random() * 20) * sizeFactor;
    } else {
        trunkHeight = (12 + Math.random() * 8) * sizeFactor;
    }

    const trunkRadius = (0.7 + Math.random() * 0.5) * sizeFactor * (isVeryTall ? 1.3 : 1.0);
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B5A2B, // Lighter brown
        shininess: 0,
        flatShading: true
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, baseHeight + trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Add more branches for taller trees
    const branchCount = isVeryTall ? 6 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3);

    // For very tall trees, distribute branches throughout the height
    const branchHeightStart = isVeryTall ? 0.3 : 0.5;
    const branchHeightEnd = isVeryTall ? 0.9 : 0.9;

    for (let i = 0; i < branchCount; i++) {
        const branchHeightPercent = branchHeightStart + (i / branchCount) * (branchHeightEnd - branchHeightStart);
        const branchHeight = trunkHeight * branchHeightPercent;
        const branchAngle = Math.random() * Math.PI * 2;
        const branchLength = (2 + Math.random() * 3) * (isVeryTall ? 1.3 : 1.0);

        const branchGeometry = new THREE.CylinderGeometry(0.2, 0.3, branchLength, 5);
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial);

        branch.position.set(
            x + Math.cos(branchAngle) * branchLength / 2,
            baseHeight + branchHeight,
            z + Math.sin(branchAngle) * branchLength / 2
        );

        branch.rotation.z = Math.PI / 2 - branchAngle;
        branch.rotation.y = Math.random() * Math.PI / 4;

        branch.castShadow = true;
        branch.receiveShadow = true;
        group.add(branch);
    }

    // Foliage (more irregular and varied than pine)
    const foliageRadius = (5 + Math.random() * 3) * sizeFactor * (isVeryTall ? 1.5 : 1.0);
    const foliageDetail = 3 + Math.floor(Math.random() * 3);
    const foliageGeometry = new THREE.DodecahedronGeometry(foliageRadius, foliageDetail);

    // Distort vertices for natural look
    const positions = foliageGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positions, i);

        // Add noise to vertices
        const noise = (Math.random() - 0.5) * 1.5;
        vertex.multiplyScalar(1 + noise * 0.2);

        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    positions.needsUpdate = true;
    foliageGeometry.computeVertexNormals();

    // Different green shades for different trees
    const greenHue = 0.25 + (Math.random() - 0.5) * 0.1; // Variation in green
    const greenSat = 0.5 + Math.random() * 0.3;
    const greenLightness = 0.3 + Math.random() * 0.2;

    const foliageMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(greenHue, greenSat, greenLightness),
        shininess: 0,
        flatShading: true
    });

    // For very tall trees, create multiple foliage clusters
    if (isVeryTall) {
        const foliageCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < foliageCount; i++) {
            const fScale = 1.0 - (i * 0.15);
            const fHeight = trunkHeight * (0.6 + (i * 0.3));

            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial.clone());
            foliage.position.set(x, baseHeight + fHeight, z);
            foliage.scale.set(fScale, fScale, fScale);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            group.add(foliage);
        }
    } else {
        // Standard single foliage for normal trees
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(x, baseHeight + trunkHeight + foliageRadius / 2, z);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        group.add(foliage);
    }
}

// Updated twisted tree function with height variation and some very tall trees
function createTwistedTree(group, x, baseHeight, z, sizeFactor = 1.0) {
    // Randomly create very tall trees (about 10% chance)
    const isVeryTall = Math.random() > 0.9;

    // Create a curved path for the trunk
    const points = [];

    // Adjust height based on isVeryTall flag
    const height = isVeryTall ?
                  (30 + Math.random() * 20) * sizeFactor :
                  (15 + Math.random() * 10) * sizeFactor;

    const segments = isVeryTall ? 12 : 8;
    const curveFactor = 0.2 + Math.random() * 0.3;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = 4 * Math.PI * t * curveFactor;
        const radius = 2 * (1 - t);

        // For very tall trees, add more dramatic curves
        const xOffset = isVeryTall ? Math.sin(t * 5) * 2 : 0;

        points.push(new THREE.Vector3(
            Math.cos(angle) * radius + xOffset,
            height * t,
            Math.sin(angle) * radius
        ));
    }

    const path = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(
        path,
        segments * 2,
        0.6 * (1 - curveFactor) * (isVeryTall ? 1.2 : 1.0), // Thicker for tall trees
        8,
        false
    );

    const tubeMaterial = new THREE.MeshPhongMaterial({
        color: 0x4B3621, // Dark wood color
        shininess: 0,
        flatShading: true
    });

    const trunk = new THREE.Mesh(tubeGeometry, tubeMaterial);
    trunk.position.set(x, baseHeight, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Add more branches for taller trees
    const branchCount = isVeryTall ? 7 + Math.floor(Math.random() * 4) : 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
        // Distribute branches across more of the trunk for tall trees
        const tMin = isVeryTall ? 0.3 : 0.5;
        const tMax = isVeryTall ? 0.95 : 0.95;
        const t = tMin + (Math.random() * (tMax - tMin));

        const position = path.getPointAt(t);

        const branchLength = (2 + Math.random() * 3) * (isVeryTall ? 1.2 : 1.0);
        const branchGeometry = new THREE.CylinderGeometry(0.05, 0.15, branchLength, 5);
        const branch = new THREE.Mesh(branchGeometry, tubeMaterial);

        const branchAngle = Math.random() * Math.PI * 2;
        branch.position.set(
            x + position.x + Math.cos(branchAngle) * branchLength / 2,
            baseHeight + position.y,
            z + position.z + Math.sin(branchAngle) * branchLength / 2
        );

        branch.rotation.z = Math.PI / 2 - branchAngle;
        branch.rotation.x = (Math.random() - 0.5) * Math.PI / 2;

        branch.castShadow = true;
        branch.receiveShadow = true;
        group.add(branch);
    }

    // Add some sparse foliage for tall twisted trees
    if (isVeryTall) {
        const foliageCount = 2 + Math.floor(Math.random() * 3);

        for (let i = 0; i < foliageCount; i++) {
            const t = 0.6 + (i / foliageCount) * 0.3; // Position in top half
            const position = path.getPointAt(t);

            const foliageRadius = (1.5 + Math.random() * 1.0) * sizeFactor;
            const foliageGeometry = new THREE.SphereGeometry(foliageRadius, 8, 8);

            const greenHue = 0.25 + (Math.random() - 0.5) * 0.1; // Variation in green
            const greenSat = 0.3 + Math.random() * 0.2; // Less saturated for dead trees
            const greenLightness = 0.3 + Math.random() * 0.1;

            const foliageMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(greenHue, greenSat, greenLightness),
                shininess: 0,
                flatShading: true,
                transparent: true,
                opacity: 0.9
            });

            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(x + position.x, baseHeight + position.y, z + position.z);
            group.add(foliage);
        }
    }
}

// --- Forest Animations ---

// Create animated elements for the forest
function createForestAnimations(group, x, baseHeight, z, length, width) {
    // Particle system for forest mist
    const particleCount = 100;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = x + (Math.random() - 0.5) * width;
        particlePositions[i3 + 1] = baseHeight + Math.random() * 10;
        particlePositions[i3 + 2] = z + (Math.random() - 0.5) * length;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0xCCCCFF,
        size: 0.5,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(particlesGeometry, particleMaterial);
    particles.userData = {
        type: 'forest_mist',
        time: 0
    };

    group.add(particles);

    // Add some birds circling above the forest
    const birdCount = 5;
    const birdGroup = new THREE.Group();
    birdGroup.position.set(x, baseHeight + 30, z); // Position relative to forest center

    for (let i = 0; i < birdCount; i++) {
        createBird(birdGroup,
            (Math.random() - 0.5) * width * 0.5,
            Math.random() * 20,
            (Math.random() - 0.5) * length * 0.5
        );
    }

    group.add(birdGroup);
}

// Create a bird (simple V shape that flaps wings)
function createBird(group, x, y, z) {
    const birdSize = 0.5 + Math.random() * 0.5;

    // Create a simple bird shape (V)
    const birdGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        -birdSize, 0, 0,   // left wing
        0, 0, 0,           // body
        birdSize, 0, 0     // right wing
    ]);

    birdGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const birdMaterial = new THREE.LineBasicMaterial({
        color: 0x000000, // Black
        linewidth: 2     // Note: linewidth > 1 may not work in all browsers
    });

    const bird = new THREE.Line(birdGeometry, birdMaterial);
    bird.position.set(x, y, z); // Position relative to birdGroup

    // Set random flight pattern
    bird.userData = {
        type: 'bird',
        time: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        radius: 10 + Math.random() * 10,
        heightOffset: y, // Store initial height offset
        heightVariation: 5 + Math.random() * 10,
        wingFlapSpeed: 0.1 + Math.random() * 0.1,
        wingFlapAmount: 0.2 + Math.random() * 0.3
    };

    group.add(bird);

    return bird;
}

// Update forest mist
function updateForestMist(particles) {
    particles.userData.time = (particles.userData.time || 0) + 0.01;
    const time = particles.userData.time;

    const positions = particles.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;

        // Apply gentle swaying motion
        positions.array[i3] += Math.sin(time + i * 0.1) * 0.02;
        positions.array[i3 + 1] += Math.cos(time + i * 0.05) * 0.01;
        positions.array[i3 + 2] += Math.sin(time * 0.5 + i * 0.1) * 0.02;
    }

    positions.needsUpdate = true;
}

// Update forest animations (birds and mist)
function updateForestAnimations() {
    scene.traverse(function (object) {
        // Update birds
        if (object.userData && object.userData.type === 'bird') {
            object.userData.time += object.userData.speed;

            // Move in circular pattern relative to parent group
            const radius = object.userData.radius;
            const angle = object.userData.time;

            // Update position
            object.position.x = Math.cos(angle) * radius;
            object.position.z = Math.sin(angle) * radius;
            object.position.y = object.userData.heightOffset + Math.sin(angle * 2) * (object.userData.heightVariation / 2);

            // Face direction of movement
            object.rotation.y = -angle + Math.PI / 2;

            // Flap wings
            const flapAngle = Math.sin(object.userData.time * 10 * object.userData.wingFlapSpeed) * object.userData.wingFlapAmount;
            const vertices = object.geometry.attributes.position;

            // Left wing up/down
            vertices.setY(0, -flapAngle);

            // Right wing up/down (opposite)
            vertices.setY(2, flapAngle);

            vertices.needsUpdate = true;
        }
        // Update mist
        else if (object.userData && object.userData.type === 'forest_mist') {
            updateForestMist(object);
        }
    });
}


function createRain(group, x, y, z, width, depth) {
    const rainCount = 1000;
    const rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3;
        positions[i3] = x + (Math.random() - 0.5) * width;
        positions[i3 + 1] = y + Math.random() * 20; // Start high, relative to group y
        positions[i3 + 2] = z + (Math.random() - 0.5) * depth;
        velocities[i3] = 0; // X velocity
        velocities[i3 + 1] = -(0.5 + Math.random() * 0.5); // Fall speed
        velocities[i3 + 2] = 0; // Z velocity
    }

    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMaterial = new THREE.PointsMaterial({
        color: 0xAAAAAA,
        size: 0.2,
        transparent: true,
        opacity: 0.6
    });

    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.userData = { type: 'rain', velocities: velocities, baseY: y - 20 }; // Store base Y relative to group
    group.add(rain);
}

// --- Non-Collidable Cloud Helpers ---

// Create a non-collidable cloud
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


// --- Scenery Update Logic ---

export function updateScenery() {
    updateForestAnimations(); // Includes birds and mist

    scene.traverse(function (object) {
        // Update ocean waves
        if (object.userData.type === 'ocean') {
            object.userData.waveTime += 0.02;
            const vertices = object.geometry.attributes.position;
            for (let i = 0; i < vertices.count; i++) {
                const x = vertices.getX(i);
                const z = vertices.getZ(i);
                vertices.setY(i,
                    Math.sin(x * 0.1 + object.userData.waveTime) * 1.5 +
                    Math.cos(z * 0.15 + object.userData.waveTime * 1.2) * 1.5
                );
            }
            vertices.needsUpdate = true;
        }
        // Update rain
        else if (object.userData.type === 'rain') {
            const positions = object.geometry.attributes.position;
            const velocities = object.userData.velocities;
            const baseRainY = object.userData.baseY; // Base Y relative to parent group
            for (let i = 0; i < positions.count; i++) {
                const i3 = i * 3;
                positions.array[i3] += velocities[i3];
                positions.array[i3 + 1] += velocities[i3 + 1];
                positions.array[i3 + 2] += velocities[i3 + 2];

                // Reset raindrop if it falls below base height
                if (positions.array[i3 + 1] < baseRainY) {
                    positions.array[i3 + 1] = baseRainY + 20; // Reset relative to base Y
                }
            }
            positions.needsUpdate = true;
        }
        // Update lightning
        else if (object.userData.type === 'ocean_effects') {
            object.userData.lightningTimer--;
            if (object.userData.lightningTimer <= 0) {
                if (!object.userData.lightningActive) {
                    // Start lightning flash
                    object.userData.lightningActive = true;
                    object.userData.lightningTimer = object.userData.lightningDuration;

                    // Add temporary light relative to the ocean group's position
                    const lightningLight = new THREE.PointLight(0xFFFFFF, 2, 500);
                    // Get world position of the ocean group
                    const oceanWorldPos = new THREE.Vector3();
                    object.getWorldPosition(oceanWorldPos);

                    lightningLight.position.set(
                        oceanWorldPos.x + (Math.random() - 0.5) * 500,
                        oceanWorldPos.y + 30, // Height relative to ocean group
                        oceanWorldPos.z + (Math.random() - 0.5) * 500
                    );
                    scene.add(lightningLight);
                    setTimeout(() => scene.remove(lightningLight), 150); // Remove after 150ms
                } else {
                    // End lightning flash
                    object.userData.lightningActive = false;
                    object.userData.lightningTimer = 60 + Math.random() * 240; // Next flash in 1-5 seconds
                }
            }
        }
    });
}
