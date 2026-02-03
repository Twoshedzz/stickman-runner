import { Circle, Group, Line } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { EXHAUSTED_POSE, JUMP_POSE, Limb, Pose, RUN_POSES, STAND_POSE } from "../game/animations";

interface StickmanProps {
    x: number;
    y: number;
    tick: number;
    isGrounded: boolean;
    isRunning: boolean;
    size: number;
    status?: 'playing' | 'exhausted' | 'victory';
}

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

export const Stickman = ({ x, y, tick, isGrounded, isRunning, size, status = 'playing' }: StickmanProps) => {
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

    // Lean: Head/Shoulders are ahead of hips (Only when running)
    const leanOffset = isRunning && isGrounded && status === 'playing' ? 6 * scale : 0;

    // Interpolate Poses
    const pose = useMemo(() => {
        if (status === 'exhausted') return EXHAUSTED_POSE;
        if (status === 'victory') return STAND_POSE;

        if (!isGrounded) return JUMP_POSE;
        if (!isRunning) return STAND_POSE;

        const cycleSpeed = 0.3; // Controls run speed (Slower)
        const frameIndex = (tick * cycleSpeed) % FULL_CYCLE.length;
        const currentFrame = Math.floor(frameIndex);
        const nextFrame = (currentFrame + 1) % FULL_CYCLE.length;
        const progress = frameIndex - currentFrame;

        const interpolateLimb = (l1: Limb, l2: Limb): Limb => ({
            upper: l1.upper + (l2.upper - l1.upper) * progress,
            lower: l1.lower + (l2.lower - l1.lower) * progress
        });

        const p1 = FULL_CYCLE[currentFrame];
        const p2 = FULL_CYCLE[nextFrame];

        return {
            lLeg: interpolateLimb(p1.lLeg, p2.lLeg),
            rLeg: interpolateLimb(p1.rLeg, p2.rLeg),
            lArm: interpolateLimb(p1.lArm, p2.lArm),
            rArm: interpolateLimb(p1.rArm, p2.rArm),
        };
    }, [tick, isGrounded, isRunning, status]);

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

    const neck = {
        x: anchorX + leanOffset + exhaustedBendX,
        y: anchorY + headRadius + exhaustedBendY
    };

    // Hip stays roughly same place, maybe slightly lower in squat
    const hip = { x: anchorX, y: anchorY + headRadius + bodyLength + (status === 'exhausted' ? 4 * scale : 0) };

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

    return (
        <Group transform={[{ translateX: x }, { translateY: y }]}>
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
