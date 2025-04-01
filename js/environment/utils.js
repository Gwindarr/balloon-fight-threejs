// Helper function for gaussian-like distribution
export function gaussianRand() {
    // Box-Muller transform approximation
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Avoid log(0)
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to range from -1 to 1
    return Math.min(Math.max(z * 0.3, -1), 1);
}
