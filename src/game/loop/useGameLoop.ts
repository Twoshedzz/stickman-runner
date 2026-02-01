import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump } from '../systems/physics';
import { resetSpawner, spawnObstacle } from '../systems/spawn';

export const useGameLoop = () => {
    const stateRef = useRef<GameState>(createInitialState());
    const requestRef = useRef<number | null>(null);
    const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render
    const [highScore, setHighScore] = useState(0);
    const highScoreRef = useRef(0);

    // Load High Score
    useEffect(() => {
        AsyncStorage.getItem('HIGH_SCORE').then(value => {
            if (value) {
                const score = parseInt(value, 10);
                setHighScore(score);
                highScoreRef.current = score;
            }
        });
    }, []);

    useEffect(() => {
        const loop = () => {
            const state = stateRef.current;

            if (!state.gameOver) {
                applyPhysics(state);
                spawnObstacle(state);
                const isCollision = checkCollisions(state);

                // Check High Score continuously
                if (state.score > highScoreRef.current) {
                    highScoreRef.current = state.score;
                    setHighScore(state.score);
                    AsyncStorage.setItem('HIGH_SCORE', state.score.toString());
                }

                if (isCollision) {
                    // Collision logic is handled in checkCollisions (health reduction, game over)
                }
            }

            // Force React to re-render to update the UI
            // In a production specific game we might separate this or use Skia values directly
            setRenderTrigger(prev => prev + 1);

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Stabilize onJump to prevent event listener churn
    const onJump = useCallback(() => {
        const state = stateRef.current;
        console.log('Input received. GameOver:', state.gameOver, 'Grounded:', state.player.isGrounded);

        if (state.gameOver) {
            console.log('Resetting game state');
            stateRef.current = createInitialState();
            resetSpawner();
        } else {
            // Always attempt to jump, let physics decide if it's allowed (double jump)
            jump(state);
        }
    }, []);

    return {
        gameState: stateRef.current,
        onJump,
        tick: renderTrigger,
        highScore
    };
};
