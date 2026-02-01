export interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;     // 0-1, fades out
    decay: number;    // life -= decay per frame
    color: string;
    size: number;
    target?: { x: number, y: number }; // For homing particles
}

let particleIdCounter = 0;

export const createParticle = (
    x: number,
    y: number,
    color: string,
    size: number,
    velocity: { x: number, y: number },
    target?: { x: number, y: number }
): Particle => ({
    id: particleIdCounter++,
    x,
    y,
    vx: velocity.x,
    vy: velocity.y,
    life: 1.0,
    decay: 0.01 + Math.random() * 0.02, // Slower decay (was 0.05-0.10)
    color,
    size,
    target,
});

export const updateParticles = (particles: Particle[]): Particle[] => {
    return particles
        .map(p => {
            let vx = p.vx;
            let vy = p.vy;

            // Homing Logic
            if (p.target) {
                const dx = p.target.x - p.x;
                const dy = p.target.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 10) {
                    // Accelerate towards target
                    vx += (dx / dist) * 2; // Homing force
                    vy += (dy / dist) * 2;
                    vx *= 0.9; // Damping
                    vy *= 0.9;
                } else {
                    // Shrink fast when close
                    return { ...p, life: 0 };
                }
            } else {
                // Gravity / Friction for normal particles? 
                // Let's keep it simple for now, maybe slight drag
                vx *= 0.95;
                vy *= 0.95;
            }

            return {
                ...p,
                x: p.x + vx,
                y: p.y + vy,
                vx,
                vy,
                life: p.life - p.decay,
            };
        })
        .filter(p => p.life > 0);
};

export const spawnParticles = (
    currentParticles: Particle[],
    x: number,
    y: number,
    color: string,
    count: number = 5,
    speed: number = 2,
    target?: { x: number, y: number },
    velocityBias: { x: number, y: number } = { x: 0, y: 0 },
    size: number = 4
): Particle[] => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = Math.random() * speed;
        // Randomize size slightly based on base size
        const pSize = Math.max(1, size * (0.5 + Math.random()));
        newParticles.push(createParticle(
            x,
            y,
            color,
            pSize,
            {
                x: (Math.cos(angle) * v) + velocityBias.x,
                y: (Math.sin(angle) * v) + velocityBias.y
            },
            target
        ));
    }
    return [...currentParticles, ...newParticles];
};
