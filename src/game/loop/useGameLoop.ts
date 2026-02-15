import AsyncStorage from '@react-native-async-storage/async-storage'; // Assuming React Native for AsyncStorage
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_HEALTH, STAGE_DURATION_SECONDS, TIME_CYCLE_DURATION } from '../constants';
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
    const lastFrameTimeRef = useRef<number>(0);

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

                // Time-based stage progress: 3 minutes per stage so audio and visuals stay in sync (see docs/STAGE_DESIGN.md)
                const nowSec = Date.now() / 1000;
                if (state.stageStartTime <= 0) state.stageStartTime = nowSec;
                const elapsedSec = nowSec - state.stageStartTime;
                state.elapsedSecInStage = elapsedSec;
                state.stageProgress = Math.min(elapsedSec / STAGE_DURATION_SECONDS, 1);
                state.distance = state.stageProgress * currentStage.courseLength;

                const cycleStart = 0.25;
                const cycleRange = 0.75;
                const cycleProgress = cycleStart + (state.stageProgress * cycleRange);
                state.timeOfDay = Math.floor(cycleProgress * TIME_CYCLE_DURATION);

                const isComplete = state.stageProgress >= 1;

                if (isComplete && state.stageStatus === 'playing') {
                    console.log(`Stage Complete! (Debug: ${state.debugMode})`);
                    state.stageStatus = 'exhausted';
                    state.showContinue = true;
                }

                // ONLY Update Game Logic if Playing
                if (state.stageStatus === 'playing') {
                    const now = performance.now();
                    const deltaTimeSec = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) / 1000 : 1 / 60;
                    lastFrameTimeRef.current = now;
                    applyPhysics(state, deltaTimeSec);
                    if (state.distance < currentStage.courseLength - 1000) {
                        spawnObstacle(state, currentStage);
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

            // Force React to re-render for Canvas (60fps when possible for smooth animation).
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
        stateRef.current = createInitialState();
        lastFrameTimeRef.current = 0;
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

    // Continue to next stage
    const onContinue = useCallback(() => {
        const state = stateRef.current;
        if (!state.showContinue) return;

        state.showContinue = false;
        state.stageStatus = 'victory';

        // Brief delay before loading next stage for visual polish
        setTimeout(() => {
            const nextIndex = STAGES.findIndex(s => s.id === state.stageId) + 1;
            const nextStage = STAGES[nextIndex];

            if (nextStage) {
                state.stageId = nextStage.id;
                state.distance = 0;
                state.stageStatus = 'playing';
                state.stageStartTime = Date.now() / 1000; // Reset so stage 2+ progress is from 0
                state.obstacles = [];
                resetSpawner();
            }
        }, 1000);
    }, []);

    return {
        gameState: stateRef.current,
        gameMetrics,
        onJump,
        restartGame,
        onContinue,
        toggleDebugMode,
        tick: renderTrigger,
        highScore
    };
};
