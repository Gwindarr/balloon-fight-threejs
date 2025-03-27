import * as THREE from 'three';
import { scene } from './scene.js';

// Exports
export const popEffects = [];

// Helper function for creating pop visual effect
export function createPopEffect(position) {
    // Create a simple particle burst
    const particleCount = 20;
    const particles = new THREE.Group();
    scene.add(particles);
    
    for (let i = 0; i < particleCount; i++) {
        try {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000, // Red particles
                    transparent: true,
                    opacity: 1.0
                })
            );
            
            // Position at balloon position (handle case where position might be relative)
            const worldPosition = position.clone();
            particle.position.copy(worldPosition);
            
            // Give random velocity
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.userData.lifetime = 30 + Math.random() * 30; // Frames of lifetime
            
            particles.add(particle);
        } catch (error) {
            console.error("Error creating pop particle:", error);
        }
    }
    
    // Add to a list to update
    popEffects.push({
        particles: particles,
        age: 0
    });
}

// Update pop effects
export function updatePopEffects() {
    for (let i = popEffects.length - 1; i >= 0; i--) {
        const effect = popEffects[i];
        effect.age++;
        
        // Update all particles in this effect
        effect.particles.children.forEach((particle) => {
            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.y -= 0.001; // Add gravity to particles
            particle.userData.lifetime--;
            
            // Fade out particle
            if (particle.material.opacity) {
                particle.material.opacity = particle.userData.lifetime / 60;
            }
        });
        
        // Remove effect when all particles are gone
        if (effect.age > 60) {
            scene.remove(effect.particles);
            popEffects.splice(i, 1);
        }
    }
}