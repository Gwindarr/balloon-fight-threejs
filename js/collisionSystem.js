// Unified collision detection and response system
import { scene } from './scene.js';
import * as THREE from 'three'; // Add this
import { playerVelocity } from './player.js';

export class CollisionSystem {
    static CONSTANTS = {
        GROUND_LEVEL: 0,
        PLAYER_HEIGHT: 1,
        PLAYER_RADIUS: 0.6,
        BOUNCE_FACTOR: 0.3,
        WATER_LEVEL: 0.1,
        WATER_RESISTANCE: 0.92,
        BOUNDARY_X: 200,
        BOUNDARY_Z: 200,
        PLATFORM_COLLISION_MARGIN: 0.15,
        PLATFORMER_COYOTE_TIME: 6,
        PLATFORM_DAMAGE_THRESHOLD: 6,
        WATER_DAMAGE_THRESHOLD: 10,
        PLATFORM_DEATH_THRESHOLD: 10,
        WATER_DEATH_THRESHOLD: 16
    };

    static checkCollisions(entity) {
        entity.userData.isOnSurface = false;
        entity.userData.currentPlatform = null;

        if (!entity.userData.lastHeight) {
            entity.userData.lastHeight = entity.position.y;
        }

        this.checkGroundCollision(entity);
        this.checkPlatformCollisions(entity);
        this.checkWaterCollision(entity);
        this.checkBoundaryCollisions(entity);
        this.checkEntityCollisions(entity);

        // Reset fall tracking if on surface
        if (entity.userData.isOnSurface) {
            const fallDistance = entity.userData.lastHeight - entity.position.y;
            if (fallDistance > this.CONSTANTS.PLATFORM_DEATH_THRESHOLD) {
                entity.userData.health = 0; // Dead
            } else if (fallDistance > this.CONSTANTS.PLATFORM_DAMAGE_THRESHOLD) {
                entity.userData.health -= 1;
            }
            entity.userData.lastHeight = entity.position.y;
        } else {
            // Track highest point during fall
            entity.userData.lastHeight = Math.max(entity.userData.lastHeight, entity.position.y);
        }
    }

    static checkGroundCollision(entity) {
        const bottom = entity.position.y - this.CONSTANTS.PLAYER_HEIGHT / 2;
        if (bottom < this.CONSTANTS.GROUND_LEVEL) {
            entity.position.y = this.CONSTANTS.GROUND_LEVEL + this.CONSTANTS.PLAYER_HEIGHT / 2;
            entity.userData.velocity.y = 0;
            entity.userData.isOnSurface = true;
        }
    }

    static checkPlatformCollisions(entity) {
        const playerRadius = this.CONSTANTS.PLAYER_RADIUS;
        const playerBottom = entity.position.y - this.CONSTANTS.PLAYER_HEIGHT / 2;
        const playerTop = entity.position.y + this.CONSTANTS.PLAYER_HEIGHT / 2;

        const platforms = window.environmentPlatforms ? [...window.environmentPlatforms] : [];
        if (platforms.length === 0) {
            console.warn("No platforms found in environment - falling back to scene search");
            const scenePlatforms = Array.from(scene.children).filter(
                obj => obj.userData && obj.userData.type && obj.userData.type.includes('platform')
            );
            platforms.push(...scenePlatforms);
        }

        for (const platform of platforms) {
            const bbox = new THREE.Box3().setFromObject(platform);

            const playerMinX = entity.position.x - playerRadius;
            const playerMaxX = entity.position.x + playerRadius;
            const playerMinZ = entity.position.z - playerRadius;
            const playerMaxZ = entity.position.z + playerRadius;

            const horizontallyWithinPlatform =
                playerMaxX >= bbox.min.x && playerMinX <= bbox.max.x &&
                playerMaxZ >= bbox.min.z && playerMinZ <= bbox.max.z;

            if (horizontallyWithinPlatform &&
                playerBottom <= bbox.max.y + this.CONSTANTS.PLATFORM_COLLISION_MARGIN &&
                playerBottom >= bbox.max.y - 0.5 &&
                entity.userData.velocity.y <= 0) {

                entity.position.y = bbox.max.y + this.CONSTANTS.PLAYER_HEIGHT / 2;
                entity.userData.velocity.y = 0;
                entity.userData.isOnSurface = true;
                entity.userData.currentPlatform = platform;
                continue;
            }

            if (horizontallyWithinPlatform && playerTop >= bbox.min.y && playerBottom <= bbox.max.y) {
                if (
                    playerBottom <= bbox.max.y + this.CONSTANTS.PLATFORM_COLLISION_MARGIN &&
                    playerBottom >= bbox.max.y - 0.5 &&
                    entity.userData.velocity.y <= 0
                ) {
                    entity.position.y = bbox.max.y + this.CONSTANTS.PLAYER_HEIGHT / 2;
                    entity.userData.velocity.y = 0;
                    entity.userData.isOnSurface = true;
                    entity.userData.currentPlatform = platform;
                    continue;
                }

                if (
                    playerTop >= bbox.min.y - this.CONSTANTS.PLATFORM_COLLISION_MARGIN &&
                    playerTop <= bbox.min.y + 0.1 &&
                    entity.userData.velocity.y > 0
                ) {
                    entity.position.y = bbox.min.y - this.CONSTANTS.PLAYER_HEIGHT / 2;
                    entity.userData.velocity.y = 0;
                    continue;
                }

                const penRight = bbox.max.x - playerMinX;
                const penLeft = playerMaxX - bbox.min.x;
                const penFront = bbox.max.z - playerMinZ;
                const penBack = playerMaxZ - bbox.min.z;

                const minPen = Math.min(penRight, penLeft, penFront, penBack);

                if (minPen === penRight) {
                    entity.position.x = bbox.max.x + playerRadius;
                    entity.userData.velocity.x = 0;
                } else if (minPen === penLeft) {
                    entity.position.x = bbox.min.x - playerRadius;
                    entity.userData.velocity.x = 0;
                } else if (minPen === penFront) {
                    entity.position.z = bbox.max.z + playerRadius;
                    entity.userData.velocity.z = 0;
                } else if (minPen === penBack) {
                    entity.position.z = bbox.min.z - playerRadius;
                    entity.userData.velocity.z = 0;
                }
            }
        }
    }

    static checkWaterCollision(entity) {
        if (entity.position.z > 0 && entity.position.y < this.CONSTANTS.PLAYER_HEIGHT * 1.2) {
            const fallDistance = entity.userData.lastHeight - entity.position.y;

            if (fallDistance > this.CONSTANTS.WATER_DEATH_THRESHOLD) {
                entity.userData.health = 0; // Died from hard water fall
            } else if (fallDistance > this.CONSTANTS.WATER_DAMAGE_THRESHOLD) {
                entity.userData.health -= 1;
            }

            entity.position.y = Math.max(
                entity.position.y,
                this.CONSTANTS.PLAYER_HEIGHT * 1.2
            );
            entity.userData.velocity.multiplyScalar(this.CONSTANTS.WATER_RESISTANCE);
            entity.userData.velocity.y += 0.005;

            entity.userData.isInWater = true;
        } else {
            entity.userData.isInWater = false;
        }
    }

    static checkBoundaryCollisions(entity) {
        if (entity.position.x < -this.CONSTANTS.BOUNDARY_X) {
            entity.position.x = -this.CONSTANTS.BOUNDARY_X;
            entity.userData.velocity.x = -entity.userData.velocity.x * this.CONSTANTS.BOUNCE_FACTOR;
        } else if (entity.position.x > this.CONSTANTS.BOUNDARY_X) {
            entity.position.x = this.CONSTANTS.BOUNDARY_X;
            entity.userData.velocity.x = -entity.userData.velocity.x * this.CONSTANTS.BOUNCE_FACTOR;
        }

        if (entity.position.z < -this.CONSTANTS.BOUNDARY_Z) {
            entity.position.z = -this.CONSTANTS.BOUNDARY_Z;
            entity.userData.velocity.z = -entity.userData.velocity.z * this.CONSTANTS.BOUNCE_FACTOR;
        } else if (entity.position.z > this.CONSTANTS.BOUNDARY_Z) {
            entity.position.z = this.CONSTANTS.BOUNDARY_Z;
            entity.userData.velocity.z = -entity.userData.velocity.z * this.CONSTANTS.BOUNCE_FACTOR;
        }
    }

    static checkEntityCollisions(entity) {
        if (!entity || !entity.parent || !entity.position || !entity.userData) return;

        const entities = Array.from(entity.parent.children).filter(obj => {
            return (
                obj &&
                obj !== entity &&
                obj.userData &&
                obj.position &&
                typeof obj.position.x === 'number' &&
                typeof obj.position.y === 'number' &&
                typeof obj.position.z === 'number'
            );
        });

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

            const bodyCollisionDistance = this.CONSTANTS.PLAYER_RADIUS * 1.5;
            if (distSquared < bodyCollisionDistance * bodyCollisionDistance) {
                const dist = Math.sqrt(distSquared);
                const pushDist = (bodyCollisionDistance - dist) / 2;

                const pushX = dx / dist * pushDist;
                const pushZ = dz / dist * pushDist;

                entity.position.x += pushX * 0.5;
                entity.position.z += pushZ * 0.5;

                const bounceMultiplier = 0.3;
                entity.userData.velocity.x += pushX * bounceMultiplier;
                entity.userData.velocity.z += pushZ * bounceMultiplier;

                const entityHasBalloons = entity.userData.balloons?.length > 0;
                const otherHasBalloons = otherEntity.userData.balloons?.length > 0;

                if (!otherHasBalloons && entityHasBalloons && otherEntity.userData.isOnSurface) {
                    const knockOffForce = Math.max(0.1, Math.abs(entity.userData.velocity.x) +
                        Math.abs(entity.userData.velocity.z));
                    otherEntity.userData.velocity.x += pushX * 0.4;
                    otherEntity.userData.velocity.z += pushZ * 0.4;
                    otherEntity.userData.velocity.y += 0.05;
                } else if (entity.position.y < otherEntity.position.y && !entity.userData.isLocalPlayer) {
                    entity.userData.velocity.y += 0.02;
                }
            }
        }
    }
}
