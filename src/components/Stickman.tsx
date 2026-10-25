import { Circle, Group, Line, RadialGradient, vec } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { DUCK_BODY, DUCK_POSE, EXHAUSTED_POSE, FALL_POSE, JUMP_POSE, Limb, Pose, RUN_POSES, STAND_POSE } from "../game/animations";

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

type Point = { x: number; y: number };

/**
 * A limb drawn as a lit tube: a shaded core with a bright stripe along the edge facing the
 * light (the upper left, as on the obstacles).
 */
const Tube = ({ a, b, width, shade, light }: { a: Point; b: Point; width: number; shade: string; light: string }) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // Across the limb, pointing towards the upper left.
    let nx = -dy / len, ny = dx / len;
    if (nx + ny > 0) { nx = -nx; ny = -ny; }
    const o = width * 0.22;
    return (
        <>
            <Line p1={a} p2={b} color={shade} strokeWidth={width} strokeCap="round" />
            <Line p1={{ x: a.x + nx * o, y: a.y + ny * o }} p2={{ x: b.x + nx * o, y: b.y + ny * o }} color={light} strokeWidth={width * 0.4} strokeCap="round" />
        </>
    );
};

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
    // Limbs are drawn as lit tubes (see Tube): the near side bright, the far arm and leg a
    // darker blue-grey, thinner and set slightly back, so he reads as a solid figure.
    const near = { width: 5.5, shade: "#dcdff0", light: "#ffffff" };
    const far = { width: 4.6, shade: "#8e94b4", light: "#bfc4dc" };
    const farShift = [{ translateX: 1.2 * (size / 40) }, { translateY: -0.8 * (size / 40) }];

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

    // Where the feet touch the floor, in the figure's own coordinates.
    const groundY = anchorY + headRadius + bodyLength + limbLen1 + limbLen2;
    const sliding = isDucking && status === 'playing';

    let neck: { x: number; y: number };
    let hip: { x: number; y: number };
    let shoulders: { x: number; y: number };
    let headCenter: { x: number; y: number };
    if (sliding) {
        // The slide: hip low on the floor, the body leaning back from it.
        hip = { x: anchorX - DUCK_BODY.hipBack * scale, y: groundY - DUCK_BODY.hipHeight * scale };
        const along = (len: number) => ({
            x: hip.x + Math.sin(DUCK_BODY.torso) * len,
            y: hip.y - Math.cos(DUCK_BODY.torso) * len,
        });
        neck = along(bodyLength);
        shoulders = along(bodyLength - 4 * scale);
        headCenter = along(bodyLength + headRadius);
    } else {
        neck = {
            x: anchorX + leanOffset + exhaustedBendX,
            y: anchorY + headRadius + exhaustedBendY
        };
        // Hip stays roughly same place, maybe slightly lower in squat
        hip = { x: anchorX, y: anchorY + headRadius + bodyLength + (status === 'exhausted' ? 4 * scale : 0) };
        shoulders = {
            x: neck.x - (leanOffset * 0.2),
            y: neck.y + 4 * scale
        };
        headCenter = { x: neck.x, y: neck.y - headRadius }; // Head follows neck
    }

    // Limbs
    const lKnee = getJoint(hip, pose.lLeg.upper, limbLen1);
    const lFoot = getJoint(lKnee, pose.lLeg.upper + pose.lLeg.lower, limbLen2);

    const rKnee = getJoint(hip, pose.rLeg.upper, limbLen1);
    const rFoot = getJoint(rKnee, pose.rLeg.upper + pose.rLeg.lower, limbLen2);

    const lElbow = getJoint(shoulders, pose.lArm.upper, limbLen1);
    const lHand = getJoint(lElbow, pose.lArm.upper + pose.lArm.lower, foreArmLen);

    const rElbow = getJoint(shoulders, pose.rArm.upper, limbLen1);
    const rHand = getJoint(rElbow, pose.rArm.upper + pose.rArm.lower, foreArmLen);

    // Landing: shift the figure down so the bent knees lower the body instead of lifting the
    // feet off the floor. (The slide is placed on the floor already.)
    const lowestFoot = Math.max(lFoot.y, rFoot.y);
    const plantShift = !sliding && absorb > 0 ? Math.max(0, groundY - lowestFoot) * absorb : 0;

    return (
        <Group transform={[{ translateX: x }, { translateY: y + plantShift + bounce }]}>
            {/* Render Back Limbs First (Left side usually, depends on direction) */}
            <Group transform={farShift}>
                <Tube a={hip} b={lKnee} {...far} />
                <Tube a={lKnee} b={lFoot} {...far} />
                <Tube a={shoulders} b={lElbow} {...far} />
                <Tube a={lElbow} b={lHand} {...far} />
            </Group>

            {/* Body & Head */}
            <Tube a={neck} b={hip} {...near} />
            {/* The head as a ball, lit from the upper left like the obstacles. */}
            <Circle cx={headCenter.x} cy={headCenter.y} r={headRadius}>
                <RadialGradient
                    c={vec(headCenter.x - headRadius * 0.35, headCenter.y - headRadius * 0.4)}
                    r={headRadius * 1.5}
                    colors={["#ffffff", "#eef0f8", "#a9aec9"]}
                    positions={[0, 0.35, 1]}
                />
            </Circle>

            {/* Front Limbs */}
            <Group>
                <Tube a={hip} b={rKnee} {...near} />
                <Tube a={rKnee} b={rFoot} {...near} />
                <Tube a={shoulders} b={rElbow} {...near} />
                <Tube a={rElbow} b={rHand} {...near} />
            </Group>
        </Group>
    );
};
