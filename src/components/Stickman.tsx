import { Circle, Group, Line } from "@shopify/react-native-skia";
import React from "react";

interface StickmanProps {
    x: number;
    y: number;
    size: number;
    tick: number;
    isGrounded: boolean;
}

export const Stickman = ({ x, y, size, tick, isGrounded }: StickmanProps) => {
    // Dimensions based on size
    const headRadius = size * 0.15;
    const bodyLength = size * 0.4;
    const limbLength = size * 0.35;

    // Center X relative to the Group
    const cx = size / 2;
    const topY = 0;

    // Animation State
    // Run cycle speed
    const cycle = tick * 0.3;

    // Limbs angles (in radians)
    // If not grounded, freeze in a "jump" pose (legs spread)
    const leftLegAngle = isGrounded ? Math.sin(cycle) * 0.5 : -0.5;
    const rightLegAngle = isGrounded ? Math.sin(cycle + Math.PI) * 0.5 : 0.8; // Offset by PI for opposite phase

    const leftArmAngle = isGrounded ? Math.sin(cycle + Math.PI) * 0.5 : -2.5; // Arms swing opposite to legs
    const rightArmAngle = isGrounded ? Math.sin(cycle) * 0.5 : -0.5;

    // Joint Positions
    const headCenter = { x: cx, y: topY + headRadius };
    const neck = { x: cx, y: topY + headRadius * 2 };
    const waist = { x: cx, y: neck.y + bodyLength };

    // Helper to calculate end point of a limb
    const getLimbEnd = (start: { x: number, y: number }, len: number, angle: number) => {
        // 0 angle is straight down
        return {
            x: start.x + Math.sin(angle) * len,
            y: start.y + Math.cos(angle) * len,
        };
    };

    const leftFoot = getLimbEnd(waist, limbLength, leftLegAngle);
    const rightFoot = getLimbEnd(waist, limbLength, rightLegAngle);

    // Shoulders are slightly down from neck
    const shoulders = { x: cx, y: neck.y + size * 0.05 };
    const leftHand = getLimbEnd(shoulders, limbLength, leftArmAngle);
    const rightHand = getLimbEnd(shoulders, limbLength, rightArmAngle);

    // Paint for stroke
    const strokeWidth = 3;
    const color = "black";

    return (
        <Group transform={[{ translateX: x }, { translateY: y }]}>
            {/* Head */}
            <Circle cx={headCenter.x} cy={headCenter.y} r={headRadius} color={color} style="stroke" strokeWidth={strokeWidth} />

            {/* Body */}
            <Line p1={neck} p2={waist} color={color} strokeWidth={strokeWidth} />

            {/* Legs */}
            <Line p1={waist} p2={leftFoot} color={color} strokeWidth={strokeWidth} />
            <Line p1={waist} p2={rightFoot} color={color} strokeWidth={strokeWidth} />

            {/* Arms */}
            <Line p1={shoulders} p2={leftHand} color={color} strokeWidth={strokeWidth} />
            <Line p1={shoulders} p2={rightHand} color={color} strokeWidth={strokeWidth} />
        </Group>
    );
};
