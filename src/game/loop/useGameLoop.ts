import AsyncStorage from '@react-native-async-storage/async-storage'; // Assuming React Native for AsyncStorage
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_HEALTH } from '../constants';
import { updateParticles } from '../particles';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump } from '../systems/physics';
import { resetSpawner, spawnObstacle } from '../systems/spawn';

export const useGameLoop = () => {
    const stateRef = useRef<GameState>(createInitialState());
    // Ensure energy is initialized
    if (stateRef.current.energy === undefined) {
        stateRef.current.energy = 100;
    }
    const requestRef = useRef<number | null>(null);

    // UI State Sync (Optimized)
    const [gameMetrics, setGameMetrics] = useState({
        score: 0,
        health: MAX_HEALTH,
        energy: 100,
        maxHealth: MAX_HEALTH
    });
    const metricsRef = useRef(gameMetrics); // Ref to avoid closure staleness in loop check

    const [renderTrigger, setRenderTrigger] = useState(0); // For Canvas (60fps)
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

            if (!state.gameOver && state.gameStarted) {
                applyPhysics(state);
                spawnObstacle(state);
                state.particles = updateParticles(state.particles);
                const isCollision = checkCollisions(state);

                // Check High Score
                if (state.score > highScoreRef.current) {
                    highScoreRef.current = state.score;
                    setHighScore(state.score);
                    AsyncStorage.setItem('HIGH_SCORE', state.score.toString());
                }

                // Sync UI State (Throttled by actual changes)
                if (
                    state.score !== metricsRef.current.score ||
                    state.player.health !== metricsRef.current.health ||
                    state.energy !== metricsRef.current.energy ||
                    state.player.maxHealth !== metricsRef.current.maxHealth
                ) {
                    const newMetrics = {
                        score: state.score,
                        health: state.player.health,
                        energy: state.energy,
                        maxHealth: state.player.maxHealth
                    };
                    metricsRef.current = newMetrics;
                    setGameMetrics(newMetrics);
                }

                if (isCollision) {
                    // Update ref for immediate physics checks (though mutable state handles this)
                    // We don't strictly need to clone stateRef for UI anymore as we use gameMetrics
                    // But good for safety.
                    stateRef.current = { ...state };
                }
            }

            // Force React to re-render for Canvas (60fps)
            setRenderTrigger(prev => prev + 1);

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Dedicated Restart Function
    const restartGame = useCallback(() => {
        // console.log('Resetting game state');
        stateRef.current = createInitialState();
        stateRef.current.gameStarted = true;
        resetSpawner();
        // Reset Metrics immediately
        const initialMetrics = {
            score: 0,
            health: MAX_HEALTH,
            energy: 100,
            maxHealth: MAX_HEALTH
        };
        metricsRef.current = initialMetrics;
        setGameMetrics(initialMetrics);
    }, []);

    // Input Handler
    const onJump = useCallback(() => {
        const state = stateRef.current;
        if (state.gameOver) return;

        if (!state.gameStarted) {
            state.gameStarted = true;
            jump(state);
        } else {
            jump(state);
        }
    }, []);

    return {
        gameState: stateRef.current,
        gameMetrics,
        onJump,
        restartGame,
        tick: renderTrigger,
        highScore
    };
};
