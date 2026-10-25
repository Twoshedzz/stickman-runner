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

/** On the way up: a sprinter's leap, front knee tucked high, arms pumping. */
export const JUMP_POSE: Pose = {
    rLeg: { upper: 1.35, lower: -1.7 }, // front knee driven high, shin tucked under
    lLeg: { upper: -0.55, lower: -1.25 }, // back leg trailing, heel kicked up
    rArm: { upper: -0.9, lower: 1.4 },  // arm swung back
    lArm: { upper: 1.3, lower: 1.0 },   // arm driven forward
};

/** On the way down: the front leg reaches to land, arms out for balance. */
export const FALL_POSE: Pose = {
    rLeg: { upper: 0.55, lower: -0.25 }, // front leg reaching down and forward
    lLeg: { upper: -0.2, lower: -0.9 },  // back leg following
    rArm: { upper: 1.1, lower: 0.5 },
    lArm: { upper: -0.9, lower: 0.7 },
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

/**
 * Ducking under a bar: a feet-first slide. The front leg reaches out along the floor, the back
 * leg folds under it, the body leans back with one hand down behind for balance and the other
 * arm forward. The body itself is placed by DUCK_BODY (the torso leans back, so it isn't the
 * usual upright figure).
 */
export const DUCK_POSE: Pose = {
    rLeg: { upper: 1.3, lower: 0 },     // front leg out along the floor
    lLeg: { upper: 1.9, lower: -2.6 },  // back leg folded under, knee up
    rArm: { upper: 1.75, lower: 0.5 },  // front arm forward for balance
    lArm: { upper: -0.85, lower: 0.1 }, // back hand down on the floor behind
};

/**
 * Where the body goes in the slide, at the normal size (scaled with the runner): the hip this
 * far back from the middle and this high off the floor, and the torso leaning back by this
 * angle (radians from upright). Keeps the whole figure under the bar's 26px clearance.
 */
export const DUCK_BODY = { hipBack: 6, hipHeight: 5, torso: -1.0 };

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
