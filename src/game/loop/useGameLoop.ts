import AsyncStorage from '@react-native-async-storage/async-storage'; // Assuming React Native for AsyncStorage
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { MAX_HEALTH, TIME_CYCLE_DURATION } from '../constants';
import { frameScale } from '../frame';
import { updateParticles } from '../particles';
import { speedAt, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { checkCollisions } from '../systems/collisions';
import { applyPhysics, jump, releaseDuck, startDuck } from '../systems/physics';
import { resetSpawner, spawnObstacle } from '../systems/spawn';

/** One run in the score table. */
export interface ScoreEntry {
    score: number;
    /** ISO date the run ended. */
    date: string;
    /** Cleared every stage, rather than running out of health. */
    completed: boolean;
}

const SCORE_TABLE_KEY = 'SCORE_TABLE';
const SCORE_TABLE_SIZE = 5;

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

    /**
     * Freeze the game while it's in the background (another app, or the phone locked), and
     * carry on exactly where it left off on return. The stage clock runs on real time, so the
     * time away is added to the stage's start time; otherwise the stage would have jumped
     * ahead while the music (paused by the music player) picked up where it stopped.
     */
    useEffect(() => {
        let awaySince: number | null = null;
        const subscription = AppState.addEventListener('change', (next) => {
            if (next !== 'active') {
                if (awaySince === null) awaySince = Date.now() / 1000;
                return;
            }
            if (awaySince === null) return;
            const away = Date.now() / 1000 - awaySince;
            awaySince = null;
            const state = stateRef.current;
            if (state.stageStartTime > 0) state.stageStartTime += away;
            // Start timing frames afresh, so the first frame back isn't one huge step.
            lastFrameTimeRef.current = 0;
        });
        return () => subscription.remove();
    }, []);

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

    // The best runs, kept between sessions. Every run that scores goes in, not only ones
    // that finish, so a big score that died in stage 4 still counts.
    const [scoreTable, setScoreTable] = useState<ScoreEntry[]>([]);
    const scoreTableRef = useRef<ScoreEntry[]>([]);
    /** Where the run that just ended landed in the table, or -1 if it didn't make it. */
    const [newScoreIndex, setNewScoreIndex] = useState(-1);
    const recordedRef = useRef(false);

    // Load the score table
    useEffect(() => {
        AsyncStorage.getItem(SCORE_TABLE_KEY).then((raw) => {
            if (!raw) return;
            try {
                const saved = JSON.parse(raw);
                if (Array.isArray(saved)) {
                    scoreTableRef.current = saved;
                    setScoreTable(saved);
                }
            } catch {
                // A corrupt table just starts empty again.
            }
        });
    }, []);

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
                state.stageProgress = Math.min(elapsedSec / currentStage.durationSec, 1);
                state.distance = state.stageProgress * currentStage.courseLength;
                state.speed = speedAt(currentStage, state.stageProgress);

                const cycleStart = 0.25;
                const cycleRange = 0.75;
                const cycleProgress = cycleStart + (state.stageProgress * cycleRange);
                state.timeOfDay = Math.floor(cycleProgress * TIME_CYCLE_DURATION);

                const isComplete = state.stageProgress >= 1;

                if (isComplete && state.stageStatus === 'playing') {
                    const isLastStage = STAGES.findIndex(s => s.id === state.stageId) === STAGES.length - 1;
                    if (isLastStage) {
                        // The whole game is done: straight to the win screen, no Continue.
                        state.stageStatus = 'victory';
                        state.gameComplete = true;
                        state.gameOver = true;
                    } else {
                        state.stageStatus = 'exhausted';
                        state.showContinue = true;
                    }
                }

                // ONLY Update Game Logic if Playing
                if (state.stageStatus === 'playing') {
                    const now = performance.now();
                    const deltaTimeSec = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) / 1000 : 1 / 60;
                    lastFrameTimeRef.current = now;
                    // Same step the obstacles take, so the scenery and grid move with them.
                    state.scroll += (state.speed / 60) * frameScale(deltaTimeSec);
                    applyPhysics(state, deltaTimeSec);
                    if (state.distance < currentStage.courseLength - 1000) {
                        spawnObstacle(state, currentStage, deltaTimeSec);
                    }
                    state.particles = updateParticles(state.particles, deltaTimeSec);
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

            // A run just ended: put it in the score table once. Debug runs are left out,
            // since debug mode switches off damage and would flood the table.
            if (state.gameOver && !recordedRef.current) {
                recordedRef.current = true;
                if (state.score > 0 && !state.debugMode) {
                    const entry: ScoreEntry = {
                        score: state.score,
                        date: new Date().toISOString(),
                        completed: state.gameComplete,
                    };
                    const table = [...scoreTableRef.current, entry]
                        .sort((a, b) => b.score - a.score)
                        .slice(0, SCORE_TABLE_SIZE);
                    scoreTableRef.current = table;
                    setScoreTable(table);
                    setNewScoreIndex(table.indexOf(entry));
                    AsyncStorage.setItem(SCORE_TABLE_KEY, JSON.stringify(table));
                } else {
                    setNewScoreIndex(-1);
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
        recordedRef.current = false;
        setNewScoreIndex(-1);
        resetSpawner(stateRef.current);
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

    /** Debug only: jump straight to a stage so you don't have to play through to reach it. */
    const jumpToStage = useCallback((stageId: string) => {
        const state = stateRef.current;
        state.stageId = stageId;
        state.distance = 0;
        state.scroll = 0;
        state.stageProgress = 0;
        state.elapsedSecInStage = 0;
        state.stageStartTime = Date.now() / 1000;
        state.stageStatus = 'playing';
        state.showContinue = false;
        state.gameOver = false;
        state.gameComplete = false;
        state.gameStarted = true;
        state.obstacles = [];
        state.particles = [];
        recordedRef.current = false;
        resetSpawner(state);
        setRenderTrigger(prev => prev + 1);
    }, []);

    /** `hold`: stay down until onDuckRelease (finger kept on the screen, or the key held). */
    const onDuck = useCallback((hold = false) => {
        const state = stateRef.current;
        if (state.gameOver || !state.gameStarted) return;
        startDuck(state, hold);
    }, []);

    const onDuckRelease = useCallback(() => {
        releaseDuck(stateRef.current);
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

        // Straight into the next stage. (There used to be a one-second pause here, which
        // showed the finished stage again for a moment after the Stage Clear screen went.)
        const nextIndex = STAGES.findIndex(s => s.id === state.stageId) + 1;
        const nextStage = STAGES[nextIndex];

        if (nextStage) {
            state.stageId = nextStage.id;
            state.distance = 0;
            state.scroll = 0;
            state.stageStatus = 'playing';
            state.stageStartTime = Date.now() / 1000; // Reset so stage 2+ progress is from 0
            state.obstacles = [];
            resetSpawner(state);
        } else {
            // No stage after this one. The loop normally catches the last stage before
            // Continue is ever offered; this is only a safety net.
            state.gameComplete = true;
            state.gameOver = true;
        }
        setRenderTrigger(prev => prev + 1);
    }, []);

    return {
        gameState: stateRef.current,
        gameMetrics,
        onJump,
        onDuck,
        onDuckRelease,
        restartGame,
        onContinue,
        toggleDebugMode,
        jumpToStage,
        tick: renderTrigger,
        highScore,
        scoreTable,
        newScoreIndex
    };
};
