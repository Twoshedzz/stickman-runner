export type Limb = { upper: number; lower: number };
export type Pose = {
    lLeg: Limb;
    rLeg: Limb;
    lArm: Limb;
    rArm: Limb;
};

// ANATOMY RULES (Right-Facing Runner):
// 0 = Straight Down.
// + = Rotate Anti-Clockwise (Toward Right/Forward).
// - = Rotate Clockwise (Toward Left/Back).
//
// CONSTRAINTS:
// KNEES: Can only bend BACK. Relative angle 'lower' must be <= 0.
// ELBOWS: Can only bend FORWARD (in run). Relative angle 'lower' must be >= 0.

export const RUN_POSES: Pose[] = [
    // 1. Contact (Right Foot Strikes Ground)
    {
        // Right Leg: Reaching forward, almost straight
        rLeg: { upper: 0.6, lower: -0.05 },
        // Left Leg: Recovering behind, heel coming up to butt
        lLeg: { upper: -0.5, lower: -1.8 },

        // Arms oppose legs
        rArm: { upper: -0.6, lower: 1.5 }, // Right Arm Back (elbow bent up)
        lArm: { upper: 0.6, lower: 1.0 }   // Left Arm Forward
    },

    // 2. Down (Weight Loading / Compression)
    {
        // Right Leg: Under body, knee bends to absorb impact
        rLeg: { upper: 0.1, lower: -0.4 },
        // Left Leg: Swing phase, knee driving forward
        lLeg: { upper: 0.8, lower: -2.0 },  // Thigh fwd, shin tucked back

        rArm: { upper: -0.2, lower: 1.2 },
        lArm: { upper: 0.2, lower: 1.5 }
    },

    // 3. Push-Off (Propulsion)
    {
        // Right Leg: Extending back powerfuly
        rLeg: { upper: -0.4, lower: -0.1 }, // Almost straight line back
        // Left Leg: High Knee Drive forward
        lLeg: { upper: 1.4, lower: -1.4 },  // Thigh high, shin vertical

        rArm: { upper: 0.4, lower: 1.0 },   // Right arm swinging forward
        lArm: { upper: -0.5, lower: 1.5 }   // Left arm swinging back
    },

    // 4. Flight (Air Phase)
    {
        // Right Leg: Trailing, knee bends from momentum
        rLeg: { upper: -0.8, lower: -1.0 },
        // Left Leg: Extending forward to prepare for contact
        lLeg: { upper: 1.0, lower: -0.3 },

        rArm: { upper: 0.8, lower: 0.8 },
        lArm: { upper: -0.8, lower: 1.2 }
    },
];

export const JUMP_POSE: Pose = {
    // Jump: Dynamic leap forward (Arms Raised)
    rLeg: { upper: 0.8, lower: -0.5 },  // Right knee driving up/forward
    lLeg: { upper: -0.5, lower: -1.0 }, // Left leg trailing
    rArm: { upper: 2.0, lower: 0.5 },   // Right arm reaching forward/up
    lArm: { upper: -2.0, lower: -0.5 }  // Left arm reaching back/up (raised)
};

export const STAND_POSE: Pose = {
    // Standing: Hands on hips, legs apart (Power Stance)
    // Legs: Straight lines, splayed for stability
    rLeg: { upper: 0.25, lower: 0.0 },   // Forward, Straight
    lLeg: { upper: -0.25, lower: 0.0 },  // Back, Straight

    // Arms: Hands on hips (Akimbo)
    // Elbows bent back (-), Lower arm returns to body (+)
    rArm: { upper: -0.85, lower: 1.6 },
    lArm: { upper: -0.85, lower: 1.6 }
};

export const EXHAUSTED_POSE: Pose = {
    // Exhausted: Hands on knees
    // Legs: Bent somewhat
    rLeg: { upper: 0.5, lower: -0.7 },
    lLeg: { upper: -0.2, lower: -0.3 },

    // Arms: Reaching down to knees/thighs
    // Upper arm fwd/down, lower arm back slightly? 
    // Hands on knees -> Arm almost straight or slightly bent
    rArm: { upper: 0.9, lower: 0.1 },
    lArm: { upper: 0.9, lower: 0.1 }
};
