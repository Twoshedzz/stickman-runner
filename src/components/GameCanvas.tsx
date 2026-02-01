import { Canvas, Circle, Rect } from "@shopify/react-native-skia";
import React from 'react';
import { GROUND_HEIGHT, OBSTACLE_SIZE, OBSTACLE_SIZE_PURPLE, PLAYER_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH } from "../game/constants";
import { GameState } from "../game/state";
import { Stickman } from "./Stickman";

interface GameCanvasProps {
    gameState: GameState;
    tick?: number;
}

const PLAYER_X = 50;

export const GameCanvas = ({ gameState, tick }: GameCanvasProps) => {
    const { player, obstacles } = gameState;

    return (
        <Canvas style={{ flex: 1 }}>
            {/* Background (optional, but good for contrast) */}
            <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} color="#F0F8FF" />

            {/* Ground */}
            <Rect
                x={0}
                y={SCREEN_HEIGHT - GROUND_HEIGHT}
                width={SCREEN_WIDTH}
                height={GROUND_HEIGHT}
                color="#333"
            />

            {/* Player */}
            <Stickman
                x={PLAYER_X}
                y={player.y}
                size={PLAYER_SIZE}
                tick={tick || 0}
                isGrounded={player.isGrounded}
            />

            {/* Obstacles */}
            {obstacles.map((obs) => {
                const isPurple = obs.type === 'purple';
                const isHeart = obs.type === 'heart';

                let size = OBSTACLE_SIZE;
                let color = "red";

                if (isPurple) {
                    size = OBSTACLE_SIZE_PURPLE;
                    color = "purple";
                } else if (isHeart) {
                    size = 30; // Heart size
                    color = "hotpink";
                }

                if (isHeart) {
                    // Render simple Circle for heart
                    return (
                        <Circle
                            key={obs.id}
                            cx={obs.x + size / 2}
                            cy={SCREEN_HEIGHT - GROUND_HEIGHT - size / 2}
                            r={size / 2}
                            color={color}
                        />
                    );
                }

                return (
                    <Rect
                        key={obs.id}
                        x={obs.x}
                        y={SCREEN_HEIGHT - GROUND_HEIGHT - size}
                        width={size}
                        height={size}
                        color={color}
                    />
                );
            })}
        </Canvas>
    );
};
