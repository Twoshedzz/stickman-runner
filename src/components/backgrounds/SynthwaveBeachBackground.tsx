
import { Group, LinearGradient, Path, Rect, vec } from "@shopify/react-native-skia";
import React from 'react';
import { GROUND_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH } from "../../game/constants";
import { GameState } from "../../game/state";

interface SynthwaveBeachProps {
    gameState: GameState;
}

export const SynthwaveBeachBackground = ({ gameState }: SynthwaveBeachProps) => {
    const oceanY = SCREEN_HEIGHT - GROUND_HEIGHT - 60;

    return (
        <>
            {/* Ocean Water */}
            <Rect x={0} y={oceanY} width={SCREEN_WIDTH} height={60} color="#006994">
                <LinearGradient
                    start={vec(0, oceanY)}
                    end={vec(0, oceanY + 60)}
                    colors={["#006994", "#1a2a6c"]}
                />
            </Rect>

            {/* Waves / Reflections */}
            <Group opacity={0.4}>
                {[1, 2, 3].map(i => (
                    <Rect
                        key={`wave-${i}`}
                        x={-(gameState.distance * (0.2 + i * 0.1)) % 400}
                        y={oceanY + 10 + i * 15}
                        width={200}
                        height={2}
                        color="white"
                    />
                ))}
            </Group>

            {/* Palm Trees (Parallax) */}
            <Group transform={[{ translateX: -(gameState.distance * 0.4) % 1200 }]}>
                {[0, 400, 800].map(xOff => {
                    const trunkX = 100 + xOff;
                    const trunkY = SCREEN_HEIGHT - GROUND_HEIGHT;
                    const topY = trunkY - 140;

                    return (
                        <Group key={`palm-${xOff}`}>
                            {/* Trunk - Curved silhouette */}
                            <Path
                                path={`M ${trunkX} ${trunkY} Q ${trunkX - 15} ${trunkY - 70} ${trunkX} ${topY}`}
                                style="stroke"
                                strokeWidth={10}
                                color="#0f0c29"
                            />
                            {/* Leaves - Detailed Symmetrical Arching based on reference */}
                            <Group color="#0f0c29">
                                {/* Top Leaf */}
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX} ${topY - 50} ${trunkX} ${topY - 60}`} style="stroke" strokeWidth={3} />

                                {/* Left Arches */}
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX - 40} ${topY - 20} ${trunkX - 60} ${topY + 20}`} style="stroke" strokeWidth={4} />
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX - 45} ${topY - 40} ${trunkX - 70} ${topY - 10}`} style="stroke" strokeWidth={4} />
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX - 30} ${topY - 60} ${trunkX - 55} ${topY - 40}`} style="stroke" strokeWidth={4} />

                                {/* Right Arches */}
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX + 40} ${topY - 20} ${trunkX + 60} ${topY + 20}`} style="stroke" strokeWidth={4} />
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX + 45} ${topY - 40} ${trunkX + 70} ${topY - 10}`} style="stroke" strokeWidth={4} />
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX + 30} ${topY - 60} ${trunkX + 55} ${topY - 40}`} style="stroke" strokeWidth={4} />

                                {/* Low Hangs */}
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX - 20} ${topY - 10} ${trunkX - 30} ${topY + 30}`} style="stroke" strokeWidth={3} />
                                <Path path={`M ${trunkX} ${topY} Q ${trunkX + 20} ${topY - 10} ${trunkX + 30} ${topY + 30}`} style="stroke" strokeWidth={3} />
                            </Group>
                        </Group>
                    );
                })}
            </Group>
        </>
    );
};
