import { Circle, Group, Line } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { DUCK_POSE, EXHAUSTED_POSE, FALL_POSE, JUMP_POSE, Limb, Pose, RUN_POSES, STAND_POSE } from "../game/animations";

interface StickmanProps {
    x: number;
    y: number;
    /** Used for run cycle; pass real-time seconds (e.g. elapsedSecInStage) so animation speed is independent of frame rate. */
    animationTimeSec: number;
    isGrounded: boolean;
    isRunning: boolean;
    /** Crouching under an overhead bar. */
    isDucking?: boolean;
    size: number;
    status?: 'playing' | 'exhausted' | 'victory';
    /** Vertical speed (negative = rising): blends the leap into the reach for the ground. */
    verticalSpeed?: number;
    /** 1 the moment he lands, fading to 0: drives the knee-bend that absorbs the landing. */
    landing?: number;
}

/** Blend two poses: t = 0 is `a`, 1 is `b`. */
const mixLimb = (a: Limb, b: Limb, t: number): Limb => ({
    upper: a.upper + (b.upper - a.upper) * t,
    lower: a.lower + (b.lower - a.lower) * t,
});
const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
    lLeg: mixLimb(a.lLeg, b.lLeg, t),
    rLeg: mixLimb(a.rLeg, b.rLeg, t),
    lArm: mixLimb(a.lArm, b.lArm, t),
    rArm: mixLimb(a.rArm, b.rArm, t),
});
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Eases in and out, so blends start and finish gently. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * A smooth curve through the key poses (Catmull-Rom). Straight-line blends between poses
 * made every limb change direction with a jolt at each one, which is what read as stiff.
 */
const curve = (p0: number, p1: number, p2: number, p3: number, t: number) =>
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const curveLimb = (a: Limb, b: Limb, c: Limb, d: Limb, t: number): Limb => ({
    upper: curve(a.upper, b.upper, c.upper, d.upper, t),
    lower: curve(a.lower, b.lower, c.lower, d.lower, t),
});

// Mirror function to generate the other half of the cycle
const getMirroredPose = (p: Pose): Pose => ({
    lLeg: p.rLeg,
    rLeg: p.lLeg,
    lArm: p.rArm,
    rArm: p.lArm,
});

// Full Cycle: 4 frames Right + 4 frames Left (Mirrored)
const FULL_CYCLE: Pose[] = [
    ...RUN_POSES,
    ...RUN_POSES.map(getMirroredPose)
];

export const Stickman = ({ x, y, animationTimeSec, isGrounded, isRunning, isDucking = false, size, status = 'playing', verticalSpeed = 0, landing = 0 }: StickmanProps) => {
    // Synthwave Stickman: White with Neon Glow
    const color = "white";
    const strokeWidth = 5; // Thicker for pictogram style

    // Dimensions
    const scale = size / 40;
    const headRadius = 4 * scale;
    const bodyLength = 16 * scale;
    const limbLen1 = 9 * scale;
    const limbLen2 = 10 * scale;
    const foreArmLen = limbLen2 * 0.8; // Shorter forearms per user request

    // Lean: Head/Shoulders are ahead of hips while running, in the air too, so the body
    // doesn't snap upright on take-off.
    const leanOffset = isRunning && status === 'playing' ? 6 * scale : 0;

    const cycleSpeed = 18; // Run cycle units per real second (so animation speed is independent of frame rate)
    const frameIndex = (animationTimeSec * cycleSpeed) % FULL_CYCLE.length;
    // 1 just after landing, easing to 0: how much the knees bend to absorb it.
    const absorb = isGrounded && isRunning && !isDucking && status === 'playing' ? smooth(clamp01((landing - 0.6) / 0.4)) : 0;

    // Interpolate Poses
    const pose = useMemo(() => {
        if (status === 'exhausted') return EXHAUSTED_POSE;
        if (status === 'victory') return STAND_POSE;

        if (isDucking) return DUCK_POSE;
        if (!isRunning) return STAND_POSE;

        // The run, as a smooth curve through the key poses.
        const n = FULL_CYCLE.length;
        const i = Math.floor(frameIndex);
        const t = frameIndex - i;
        const [a, b, c, d] = [i - 1, i, i + 1, i + 2].map((k) => FULL_CYCLE[((k % n) + n) % n]);
        const run: Pose = {
            lLeg: curveLimb(a.lLeg, b.lLeg, c.lLeg, d.lLeg, t),
            rLeg: curveLimb(a.rLeg, b.rLeg, c.rLeg, d.rLeg, t),
            lArm: curveLimb(a.lArm, b.lArm, c.lArm, d.lArm, t),
            rArm: curveLimb(a.rArm, b.rArm, c.rArm, d.rArm, t),
        };

        if (!isGrounded) {
            // In the air: from the leap on the way up to reaching for the ground on the way
            // down, eased in over the first moments after take-off so it doesn't snap.
            const air = mixPose(JUMP_POSE, FALL_POSE, smooth(clamp01((verticalSpeed + 4) / 10)));
            const takeOff = smooth(clamp01((verticalSpeed + 12) / 3));
            return mixPose(run, air, takeOff);
        }

        // Just landed: bend the knees to absorb it, then ease back into the stride.
        if (absorb <= 0) return run;
        const bent = (leg: Limb): Limb => ({ upper: leg.upper + 0.35, lower: leg.lower - 0.8 });
        const crouch: Pose = { ...run, lLeg: bent(run.lLeg), rLeg: bent(run.rLeg) };
        return mixPose(run, mixPose(FALL_POSE, crouch, 0.6), absorb);
    }, [frameIndex, isGrounded, isRunning, isDucking, status, verticalSpeed, absorb]);

    // A runner's bounce: lowest as each foot takes the weight, highest between strides.
    const running = isRunning && isGrounded && !isDucking && status === 'playing';
    const stride = (frameIndex % 4) / 4;
    const bounce = running ? 1.6 * Math.cos(2 * Math.PI * (stride - 0.25)) * (size / 40) : 0;

    if (!pose) {
        return null;
    }

    // Calculate Points
    // 0 Angle = Straight Down (+Y)
    const getJoint = (start: { x: number, y: number }, angle: number, len: number) => ({
        x: start.x + Math.sin(angle) * len,
        y: start.y + Math.cos(angle) * len
    });

    // Center alignment:
    const anchorX = size / 2;
    const anchorY = headRadius + 2; // Head Position (Top)

    // Exhausted Bend: Lower the neck significantly
    const exhaustedBendY = status === 'exhausted' ? 12 * scale : 0;
    const exhaustedBendX = status === 'exhausted' ? 8 * scale : 0;

    // Ducking drops the head and tucks the hips slightly; the feet don't move.
    const duckNeckDrop = isDucking ? 14 * scale : 0;
    const duckHipDrop = isDucking ? 2 * scale : 0;

    const neck = {
        x: anchorX + leanOffset + exhaustedBendX,
        y: anchorY + headRadius + exhaustedBendY + duckNeckDrop
    };

    // Hip stays roughly same place, maybe slightly lower in squat
    const hip = { x: anchorX, y: anchorY + headRadius + bodyLength + (status === 'exhausted' ? 4 * scale : 0) + duckHipDrop };

    // Shoulders
    const shoulders = {
        x: neck.x - (leanOffset * 0.2),
        y: neck.y + 4 * scale
    };

    const headCenter = { x: neck.x, y: neck.y - headRadius }; // Head follows neck

    // Limbs
    const lKnee = getJoint(hip, pose.lLeg.upper, limbLen1);
    const lFoot = getJoint(lKnee, pose.lLeg.upper + pose.lLeg.lower, limbLen2);

    const rKnee = getJoint(hip, pose.rLeg.upper, limbLen1);
    const rFoot = getJoint(rKnee, pose.rLeg.upper + pose.rLeg.lower, limbLen2);

    const lElbow = getJoint(shoulders, pose.lArm.upper, limbLen1);
    const lHand = getJoint(lElbow, pose.lArm.upper + pose.lArm.lower, foreArmLen);

    const rElbow = getJoint(shoulders, pose.rArm.upper, limbLen1);
    const rHand = getJoint(rElbow, pose.rArm.upper + pose.rArm.lower, foreArmLen);

    // Plant the feet when ducking. The duck pose folds the legs up, so drawn from the usual
    // position the feet hang in the air and it reads as a flying kick. Shift the whole figure
    // down until the lowest foot sits where straight legs would touch the ground.
    const groundY = anchorY + headRadius + bodyLength + limbLen1 + limbLen2;
    const lowestFoot = Math.max(lFoot.y, rFoot.y);
    // Landing does the same, so the bent knees lower the body instead of lifting the feet.
    const plantShift = isDucking ? Math.max(0, groundY - lowestFoot)
        : absorb > 0 ? Math.max(0, groundY - lowestFoot) * absorb : 0;

    return (
        <Group transform={[{ translateX: x }, { translateY: y + plantShift + bounce }]}>
            {/* Render Back Limbs First (Left side usually, depends on direction) */}
            <Group>
                <Line p1={hip} p2={lKnee} color={color} strokeWidth={strokeWidth} strokeCap="round" />
                <Line p1={lKnee} p2={lFoot} color={color} strokeWidth={strokeWidth} strokeCap="round" />
                <Line p1={shoulders} p2={lElbow} color={color} strokeWidth={strokeWidth} strokeCap="round" />
                <Line p1={lElbow} p2={lHand} color={color} strokeWidth={strokeWidth} strokeCap="round" />
            </Group>

            {/* Body & Head */}
            <Line p1={neck} p2={hip} color={color} strokeWidth={strokeWidth} strokeCap="round" />
            <Circle cx={headCenter.x} cy={headCenter.y} r={headRadius} color={color} style="fill" />

            {/* Front Limbs */}
            <Group>
                <Line p1={hip} p2={rKnee} color={color} strokeWidth={strokeWidth} strokeCap="round" />
                <Line p1={rKnee} p2={rFoot} color={color} strokeWidth={strokeWidth} strokeCap="round" />
                <Line p1={shoulders} p2={rElbow} color={color} strokeWidth={strokeWidth} strokeCap="round" />
                <Line p1={rElbow} p2={rHand} color={color} strokeWidth={strokeWidth} strokeCap="round" />
            </Group>
        </Group>
    );
};
