// Unified collision detection and response system
import { scene } from './scene.js';
export class CollisionSystem {
    static CONSTANTS = {
        GROUND_LEVEL: 0,
        PLAYER_HEIGHT: 1,  // Changed from 2 to 1 to match the actual player model height
        PLAYER_RADIUS: 0.6,
        BOUNCE_FACTOR: 0.3,
        WATER_LEVEL: 0.1,
        WATER_RESISTANCE: 0.92,
        BOUNDARY_X: 200,
        BOUNDARY_Z: 200,
        PLATFORM_COLLISION_MARGIN: 0.15,  // Adjusted to match the new PLAYER_HEIGHT
        PLATFORMER_COYOTE_TIME: 6         // Frames of coyote time for platformer state
    };

    static checkCollisions(entity) {
        // Reset collision state at the start of each check
        entity.userData.isOnSurface = false;
        entity.userData.currentPlatform = null;

        // Run all collision checks in a specific order
        this.checkGroundCollision(entity);
        this.checkPlatformCollisions(entity);
        this.checkWaterCollision(entity);
        this.checkBoundaryCollisions(entity);
        
        // Only check entity collisions if the entity has balloons
        if (entity.userData.balloons && entity.userData.balloons.length > 0) {
            this.checkEntityCollisions(entity);
        }
    }

    static checkGroundCollision(entity) {
        const bottom = entity.position.y - this.CONSTANTS.PLAYER_HEIGHT / 2;
        
        if (bottom < this.CONSTANTS.GROUND_LEVEL) {
            // Ground collision response
            entity.position.y = this.CONSTANTS.GROUND_LEVEL + this.CONSTANTS.PLAYER_HEIGHT / 2;
            entity.userData.velocity.y = 0;
            entity.userData.isOnSurface = true;
        }
    }

    static checkPlatformCollisions(entity) {
        const playerRadius = this.CONSTANTS.PLAYER_RADIUS;
        const playerBottom = entity.position.y - this.CONSTANTS.PLAYER_HEIGHT / 2;
        const playerTop = entity.position.y + this.CONSTANTS.PLAYER_HEIGHT / 2;

        // Get platforms from the scene - using direct access to environment platforms
        const platforms = window.environmentPlatforms || [];
        if (platforms.length === 0) {
            // Fallback - try to find platforms in the scene
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
            
            if (
                playerMaxX >= bbox.min.x && playerMinX <= bbox.max.x &&
                playerMaxZ >= bbox.min.z && playerMinZ <= bbox.max.z &&
                playerTop >= bbox.min.y && playerBottom <= bbox.max.y
            ) {
                // Landing on top of platform
                if (
                    playerBottom <= bbox.max.y + this.CONSTANTS.PLATFORM_COLLISION_MARGIN &&
                    playerBottom >= bbox.max.y - 0.1 &&
                    entity.userData.velocity.y <= 0
                ) {
                    entity.position.y = bbox.max.y + this.CONSTANTS.PLAYER_HEIGHT / 2;
                    entity.userData.velocity.y = 0;
                    entity.userData.isOnSurface = true;
                    entity.userData.currentPlatform = platform;
                    continue;
                }
                
                // Hitting bottom of platform
                if (
                    playerTop >= bbox.min.y - this.CONSTANTS.PLATFORM_COLLISION_MARGIN &&
                    playerTop <= bbox.min.y + 0.1 &&
                    entity.userData.velocity.y > 0
                ) {
                    entity.position.y = bbox.min.y - this.CONSTANTS.PLAYER_HEIGHT / 2;
                    entity.userData.velocity.y = 0;
                    continue;
                }
                
                // Side collisions
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
            // Water pushes entity up slightly
            entity.position.y = Math.max(
                entity.position.y,
                this.CONSTANTS.PLAYER_HEIGHT * 1.2
            );
            
            // Apply water resistance
            entity.userData.velocity.multiplyScalar(this.CONSTANTS.WATER_RESISTANCE);
            
            // Apply small upward force (buoyancy)
            entity.userData.velocity.y += 0.005;
        }
    }

    static checkBoundaryCollisions(entity) {
        // X-axis boundaries
        if (entity.position.x < -this.CONSTANTS.BOUNDARY_X) {
            entity.position.x = -this.CONSTANTS.BOUNDARY_X;
            entity.userData.velocity.x = -entity.userData.velocity.x * this.CONSTANTS.BOUNCE_FACTOR;
        } else if (entity.position.x > this.CONSTANTS.BOUNDARY_X) {
            entity.position.x = this.CONSTANTS.BOUNDARY_X;
            entity.userData.velocity.x = -entity.userData.velocity.x * this.CONSTANTS.BOUNCE_FACTOR;
        }
        
        // Z-axis boundaries
        if (entity.position.z < -this.CONSTANTS.BOUNDARY_Z) {
            entity.position.z = -this.CONSTANTS.BOUNDARY_Z;
            entity.userData.velocity.z = -entity.userData.velocity.z * this.CONSTANTS.BOUNCE_FACTOR;
        } else if (entity.position.z > this.CONSTANTS.BOUNDARY_Z) {
            entity.position.z = this.CONSTANTS.BOUNDARY_Z;
            entity.userData.velocity.z = -entity.userData.velocity.z * this.CONSTANTS.BOUNCE_FACTOR;
        }
    }

    static checkEntityCollisions(entity) {
        // Get all entities with balloons from the scene
        const entities = Array.from(entity.parent.children).filter(
            obj => obj !== entity && 
            obj.userData && 
            obj.userData.balloons && 
            obj.userData.balloons.length > 0
        );

        for (const otherEntity of entities) {
            // Skip if other entity is invincible
            if (otherEntity.userData.invincibleTime > 0) continue;

            const dx = entity.position.x - otherEntity.position.x;
            const dz = entity.position.z - otherEntity.position.z;
            const distSquared = dx * dx + dz * dz;
            
            const minDistance = this.CONSTANTS.PLAYER_HEIGHT;
            if (distSquared < minDistance * minDistance) {
                const dist = Math.sqrt(distSquared);
                const pushDist = (minDistance - dist) / 2;
                
                const pushX = dx / dist * pushDist;
                const pushZ = dz / dist * pushDist;
                
                // Push both entities apart
                entity.position.x += pushX;
                entity.position.z += pushZ;
                
                // Apply bounce effect
                const bounceMultiplier = 0.5;
                entity.userData.velocity.x += pushX * bounceMultiplier;
                entity.userData.velocity.z += pushZ * bounceMultiplier;
                entity.userData.velocity.y += 0.03;
            }
        }
    }
}
