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
    // Fix for missing properties on hot reload
    if (!stateRef.current.stageStatus) {
        stateRef.current.stageStatus = 'playing';
    }
    if (stateRef.current.score === undefined) {
        stateRef.current.score = 0;
    }
    if (stateRef.current.debugMode === undefined) {
        stateRef.current.debugMode = false;
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

                state.stageProgress = Math.min(state.distance / currentStage.courseLength, 1);

                const cycleStart = 0.25;
                const cycleRange = 0.75; // 0.25 -> 1.0

                const cycleProgress = cycleStart + (state.stageProgress * cycleRange);
                state.timeOfDay = Math.floor(cycleProgress * TIME_CYCLE_DURATION);

                // Stage Complete Check
                // Trigger 300px AFTER crossing the line for a victory lap
                const isComplete = state.distance >= currentStage.courseLength + 300;

                if (isComplete && state.stageStatus === 'playing') {
                    console.log(`Stage Complete! (Debug: ${state.debugMode})`);
                    state.stageStatus = 'exhausted';

                    // Transition to Victory after 3 seconds
                    setTimeout(() => {
                        console.log("Victory Pose!");
                        if (stateRef.current) {
                            stateRef.current.stageStatus = 'victory';
                        }
                    }, 3000);
                }

                // ONLY Update Game Logic if Playing
                if (state.stageStatus === 'playing') {
                    applyPhysics(state);
                    if (state.distance < currentStage.courseLength) {
                        spawnObstacle(state);
                    }
                    state.particles = updateParticles(state.particles);
                    const isCollision = checkCollisions(state);

                    if (isCollision) {
                        // state is mutated in place
                    }
                }

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

    // Toggle Debug Mode
    const toggleDebugMode = useCallback(() => {
        stateRef.current.debugMode = !stateRef.current.debugMode;
        setRenderTrigger(prev => prev + 1);
    }, []);

    return {
        gameState: stateRef.current,
        gameMetrics,
        onJump,
        restartGame,
        toggleDebugMode,
        tick: renderTrigger,
        highScore
    };
};
