import AsyncStorage from '@react-native-async-storage/async-storage'; // Assuming React Native for AsyncStorage
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_HEALTH, TIME_CYCLE_DURATION } from '../constants';
import { updateParticles } from '../particles';
import { STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump } from '../systems/physics';
import { resetSpawner, spawnObstacle } from '../systems/spawn';

export const useGameLoop = () => {
    const stateRef = useRef<GameState>(createInitialState());
    // Ensure energy/time is initialized
    if (stateRef.current.energy === undefined) {
        stateRef.current.energy = 100;
    }
    if (stateRef.current.timeOfDay === undefined) {
        stateRef.current.timeOfDay = 0;
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
                const currentStage = STAGES.find(s => s.id === state.stageId) || STAGES[0];

                // Update Stage Progress (Distance Based)
                // "Run Until Dawn" Logic
                // Start: Sunset (Progress 0) -> Corresponds to Cycle 0.25 (Start of Sunset)
                // End: Dawn (Progress 1) -> Corresponds to Cycle 1.0 (Sunrise)

                // Reset distance relative to stage start? 
                // For now, let's assume global distance is reset or we track stage distance.
                // Simple approach: Use state.distance directly if we reset it on stage change.
                // Let's assume state.distance accumulates. We need a 'stageStartDistance' in state or just calc relative.
                // For MVP: Let's just use state.distance % duration for looping stages, or assume infinite for now.

                // Let's implement actual progression:
                // Cycle: 0.25 (Sunset Start) -> 1.0 (Sunrise) = 0.75 range

                state.stageProgress = Math.min(state.distance / currentStage.durationDistance, 1);

                const cycleStart = 0.25;
                const cycleRange = 0.75; // 0.25 -> 1.0

                const cycleProgress = cycleStart + (state.stageProgress * cycleRange);
                state.timeOfDay = Math.floor(cycleProgress * TIME_CYCLE_DURATION);

                // Stage Complete Check
                if (state.stageProgress >= 1) {
                    // TODO: Trigger Stage Transition
                    // For now, loop back to start of night to keep running
                    // state.distance = 0; 
                    // state.stageProgress = 0;
                }

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
                // Use floor for energy to reduce updates (only update on integer changes)
                if (
                    state.score !== metricsRef.current.score ||
                    state.player.health !== metricsRef.current.health ||
                    Math.floor(state.energy) !== Math.floor(metricsRef.current.energy) ||
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
                    // Optimized: No deep clone needed here as metrics handle UI
                    // state is mutated in place for the game loop
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
