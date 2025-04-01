// Unified collision detection and response system
import { scene } from './scene.js';
import * as THREE from 'three';
import { playerVelocity } from './entity.js';
// Removed triggerMushroomBounce import
import {
    GROUND_LEVEL,
    PLAYER_HEIGHT,
    PLAYER_RADIUS,
    BOUNCE_FACTOR,
    WATER_LEVEL,
    WATER_RESISTANCE,
    BOUNDARY_X,
    BOUNDARY_Z,
    PLATFORM_COLLISION_MARGIN,
    PLATFORMER_COYOTE_TIME
} from './constants.js';

export class CollisionSystem {

    static checkCollisions(entity) {
        entity.userData.isOnSurface = false;
        entity.userData.currentPlatform = null;
        entity.userData.justLanded = false;

        if (!entity.userData.lastHeight) {
            entity.userData.lastHeight = entity.position.y;
        }

        // Update landing timer if present
        if (entity.userData.landingTimer > 0) {
            entity.userData.landingTimer--;
        }

        this.checkGroundCollision(entity);
        // Removed checkSpecialPlatformCollisions call
        this.checkPlatformCollisions(entity); // Now called unconditionally
        this.checkWaterCollision(entity);
        this.checkBoundaryCollisions(entity);
        this.checkEntityCollisions(entity);

        // Track max height for future use
        if (entity.userData.isOnSurface) {
            entity.userData.lastHeight = entity.position.y;
        } else {
            entity.userData.lastHeight = Math.max(entity.userData.lastHeight, entity.position.y);
        }

        // Store current position for next frame's trajectory checking
        entity.userData.prevY = entity.position.y;
    }

    static checkGroundCollision(entity) {
        const bottom = entity.position.y - PLAYER_HEIGHT / 2;
        if (bottom < GROUND_LEVEL) {
            entity.position.y = GROUND_LEVEL + PLAYER_HEIGHT / 2;
            if (entity.userData.velocity) entity.userData.velocity.y = 0;
            entity.userData.isOnSurface = true;
        }
    }

    static checkPlatformCollisions(entity) {
        if (!entity || !entity.position || !entity.userData) return;

        const playerRadius = PLAYER_RADIUS;
        const playerBottom = entity.position.y - PLAYER_HEIGHT / 2;
        const playerTop = entity.position.y + PLAYER_HEIGHT / 2;

        // Store previous position for trajectory check - helps catch fast falls through platforms
        if (!entity.userData.prevY) {
            entity.userData.prevY = entity.position.y;
        }
        const fallingFast = entity.userData.prevY - entity.position.y > 0.5; // Moving down quickly

        const platforms = (window.environmentPlatforms || []).concat(
            Array.from(scene.children).filter(
                obj => obj.userData?.type?.includes('platform')
            )
        );

        for (const platform of platforms) {
            const bbox = new THREE.Box3().setFromObject(platform);

            const playerMinX = entity.position.x - playerRadius;
            const playerMaxX = entity.position.x + playerRadius;
            const playerMinZ = entity.position.z - playerRadius;
            const playerMaxZ = entity.position.z + playerRadius;

            const horizontallyWithinPlatform =
                playerMaxX >= bbox.min.x && playerMinX <= bbox.max.x &&
                playerMaxZ >= bbox.min.z && playerMinZ <= bbox.max.z;

            // Additional check for fast falls: Did we go through a platform this frame?
            // This helps catch cases where an entity falls through a platform in one frame
            if (fallingFast && horizontallyWithinPlatform) {
                const prevBottom = entity.userData.prevY - PLAYER_HEIGHT / 2;
                const passThroughPlatform =
                    prevBottom >= bbox.max.y && // Was above platform in previous frame
                    playerBottom <= bbox.max.y; // Is below platform top now

                if (passThroughPlatform) {
                    // We fell through a platform - snap back to platform top
                    entity.position.y = bbox.max.y + PLAYER_HEIGHT / 2;
                    if (entity.userData.velocity) {
                        entity.userData.velocity.y = 0;
                    }
                    entity.userData.isOnSurface = true;
                    entity.userData.currentPlatform = platform;
                    entity.userData.justLanded = true;
                    entity.userData.landingTimer = 15; // Extra stabilization time
                    // Store updated position for next frame
                    entity.userData.prevY = entity.position.y;
                    return; // Exit immediately after fixing the fall-through
                }
            }

            // Moved balloon check inside the loop
            const balloonCount = entity.userData.balloons?.length || 0;
            let landingTolerance = PLATFORM_COLLISION_MARGIN;

            // Adjust tolerance based on exact balloon count
            if (balloonCount === 3) {
                landingTolerance *= 1.5; // Most floaty - largest tolerance
            } else if (balloonCount === 2) {
                landingTolerance *= 1.2; // Medium floatiness
            } else if (balloonCount === 1) {
                landingTolerance *= 1.0; // Minimal tolerance - similar to platformer
            }

            // First check: If we're above a platform and falling or very close to landing
            if (horizontallyWithinPlatform &&
                playerBottom <= bbox.max.y + landingTolerance &&
                playerBottom >= bbox.max.y - 0.5 &&
                entity.userData.velocity &&
                // Either falling or close to the platform and barely moving
                (entity.userData.velocity.y < 0 ||
                 (Math.abs(entity.userData.velocity.y) <= 0.03 &&
                  Math.abs(playerBottom - bbox.max.y) < 0.15))) {

                // Land on the platform
                entity.position.y = bbox.max.y + PLAYER_HEIGHT / 2;
                if (entity.userData.velocity) {
                    entity.userData.velocity.y = 0;
                }
                entity.userData.isOnSurface = true;
                entity.userData.currentPlatform = platform;
                entity.userData.justLanded = true; // Set flag for entity collision
                entity.userData.landingTimer = 10; // Give a few frames to stabilize on the platform
                continue;
            }

            if (horizontallyWithinPlatform && playerTop >= bbox.min.y && playerBottom <= bbox.max.y) {
                // Check if we're falling onto this platform - prioritize landing on top
                if (
                    entity.userData.velocity &&
                    entity.userData.velocity.y < 0 && // Falling downward
                    playerBottom <= bbox.max.y + landingTolerance && // Close to platform top
                    playerBottom >= bbox.max.y - 0.5 // Not too far beneath
                ) {
                    // Land on the platform
                    entity.position.y = bbox.max.y + PLAYER_HEIGHT / 2;
                    if (entity.userData.velocity) {
                        entity.userData.velocity.y = 0;
                    }
                    entity.userData.isOnSurface = true;
                    entity.userData.currentPlatform = platform;
                    entity.userData.justLanded = true;
                    entity.userData.landingTimer = 10; // Give a few frames to stabilize
                    continue;
                }

                // Still handle the case when we're already near the top but not falling
                else if (
                    playerBottom <= bbox.max.y + PLATFORM_COLLISION_MARGIN &&
                    playerBottom >= bbox.max.y - 0.5 &&
                    entity.userData.velocity && Math.abs(entity.userData.velocity.y) <= 0.02
                ) {
                    entity.position.y = bbox.max.y + PLAYER_HEIGHT / 2;
                    if (entity.userData.velocity) {
                        entity.userData.velocity.y = 0;
                    }
                    entity.userData.isOnSurface = true;
                    entity.userData.currentPlatform = platform;
                    entity.userData.justLanded = true;
                    entity.userData.landingTimer = 10; // Give a few frames to stabilize
                    continue;
                }

                // Handle hitting the bottom of the platform while jumping up
                if (
                    playerTop >= bbox.min.y - PLATFORM_COLLISION_MARGIN &&
                    playerTop <= bbox.min.y + 0.1 &&
                    entity.userData.velocity && entity.userData.velocity.y > 0
                ) {
                    entity.position.y = bbox.min.y - PLAYER_HEIGHT / 2;
                    if (entity.userData.velocity) {
                        entity.userData.velocity.y = 0;
                    }
                    continue;
                }

                // Only push horizontally if we're not in the process of landing
                // or if we're very far from the top or bottom
                const farFromTop = playerBottom < bbox.max.y - 0.5;
                const farFromBottom = playerTop > bbox.min.y + 0.5;

                // Skip horizontal collision during landing grace period
                if (entity.userData.landingTimer > 0) {
                    continue;
                }

                // If we're in the middle of the platform (far from top and bottom),
                // or not moving much vertically, push horizontally
                if ((farFromTop && farFromBottom) ||
                    (entity.userData.velocity && Math.abs(entity.userData.velocity.y) < 0.01)) {

                    const penRight = bbox.max.x - playerMinX;
                    const penLeft = playerMaxX - bbox.min.x;
                    const penFront = bbox.max.z - playerMinZ;
                    const penBack = playerMaxZ - bbox.min.z;

                    const minPen = Math.min(penRight, penLeft, penFront, penBack);

                    if (minPen === penRight) {
                        entity.position.x = bbox.max.x + playerRadius;
                        if (entity.userData.velocity) entity.userData.velocity.x = 0;
                    } else if (minPen === penLeft) {
                        entity.position.x = bbox.min.x - playerRadius;
                        if (entity.userData.velocity) entity.userData.velocity.x = 0;
                    } else if (minPen === penFront) {
                        entity.position.z = bbox.max.z + playerRadius;
                        if (entity.userData.velocity) entity.userData.velocity.z = 0;
                    } else if (minPen === penBack) {
                        entity.position.z = bbox.min.z - playerRadius;
                        if (entity.userData.velocity) entity.userData.velocity.z = 0;
                    }
                }
            }
        }
    }

    // Removed static checkSpecialPlatformCollisions(entity) function

    static checkWaterCollision(entity) {
        if (!entity || !entity.position || !entity.userData) return;

        const waterSurfaceHeight = WATER_LEVEL + PLAYER_HEIGHT * 0.2;
        // Remove the z-position check to allow water anywhere on the map
        if (entity.position.y < waterSurfaceHeight) {
            // Ensure the entity doesn't sink too deep into the water
            entity.position.y = Math.max(
                entity.position.y,
                PLAYER_HEIGHT * 1.2
            );

            if (entity.userData.velocity) {
                entity.userData.velocity.multiplyScalar(WATER_RESISTANCE);
                entity.userData.velocity.y += 0.005;
            }

            // Set both water and surface flags
            entity.userData.isInWater = true;
            entity.userData.isOnSurface = true;
        } else {
            // Just update the water flag
            entity.userData.isInWater = false;
        }
    }

    static checkBoundaryCollisions(entity) {
        if (entity.position.x < -BOUNDARY_X) {
            entity.position.x = -BOUNDARY_X;
            if (entity.userData.velocity) {
                entity.userData.velocity.x = -entity.userData.velocity.x * BOUNCE_FACTOR;
            }
        } else if (entity.position.x > BOUNDARY_X) {
            entity.position.x = BOUNDARY_X;
            if (entity.userData.velocity) {
                entity.userData.velocity.x = -entity.userData.velocity.x * BOUNCE_FACTOR;
            }
        }

        if (entity.position.z < -BOUNDARY_Z) {
            entity.position.z = -BOUNDARY_Z;
            if (entity.userData.velocity) {
                entity.userData.velocity.z = -entity.userData.velocity.z * BOUNCE_FACTOR;
            }
        } else if (entity.position.z > BOUNDARY_Z) {
            entity.position.z = BOUNDARY_Z;
            if (entity.userData.velocity) {
                entity.userData.velocity.z = -entity.userData.velocity.z * BOUNCE_FACTOR;
            }
        }
    }

    static checkEntityCollisions(entity) {
        if (!entity || !entity.parent || !entity.position || !entity.userData) return;

        const entities = Array.from(entity.parent.children).filter(obj =>
            obj &&
            obj !== entity &&
            obj.userData &&
            obj.position &&
            !obj.userData.isDestroyed
        );

        for (const otherEntity of entities) {
            if (
                !otherEntity.userData ||
                !otherEntity.position ||
                !otherEntity.userData.velocity ||
                otherEntity.userData.invincibleTime > 0
            ) continue;

            const dx = entity.position.x - otherEntity.position.x;
            const dz = entity.position.z - otherEntity.position.z;
            const distSquared = dx * dx + dz * dz;

            const bodyCollisionDistance = PLAYER_RADIUS * 1.5;
            if (distSquared < bodyCollisionDistance * bodyCollisionDistance) {
                if (entity.userData.justLanded) {
                    entity.userData.justLanded = false;
                    continue;
                }

                const dist = Math.sqrt(distSquared);
                const pushDist = (bodyCollisionDistance - dist) / 2;

                const pushX = dx / dist * pushDist;
                const pushZ = dz / dist * pushDist;

                entity.position.x += pushX * 0.5;
                entity.position.z += pushZ * 0.5;

                const bounceMultiplier = 0.3;
                if (entity.userData.velocity) {
                    entity.userData.velocity.x += pushX * bounceMultiplier;
                    entity.userData.velocity.z += pushZ * bounceMultiplier;
                }

                const entityHasBalloons = entity.userData.balloons?.length > 0;
                const otherHasBalloons = otherEntity.userData.balloons?.length > 0;

                if (!otherHasBalloons && entityHasBalloons && otherEntity.userData.isOnSurface) {
                    if (entity.userData.velocity && otherEntity.userData.velocity) {
                        const knockOffForce = Math.max(0.1, Math.abs(entity.userData.velocity.x) +
                            Math.abs(entity.userData.velocity.z));
                        otherEntity.userData.velocity.x += pushX * 0.4;
                        otherEntity.userData.velocity.z += pushZ * 0.4;
                        otherEntity.userData.velocity.y += 0.05;
                    }
                } else if (entity.position.y < otherEntity.position.y && !entity.userData.isLocalPlayer) {
                    if (entity.userData.velocity) {
                        entity.userData.velocity.y += 0.02;
                    }
                }
            }
        }
    }
}
