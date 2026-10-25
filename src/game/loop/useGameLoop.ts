import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { MAX_HEALTH, TIME_CYCLE_DURATION } from '../constants';
import { cancelResume, pauseRun, startResume, tickPause } from '../pause';
import { musicNudge } from '../musicSync';
import { speedAt, stageById, StageConfig, STAGES } from '../stages';
import { createInitialState, GameState } from '../state';
import { stepWorld } from '../step';
import { jump, releaseDuck, startDuck } from '../systems/physics';
import { resetSpawner } from '../systems/spawn';
import { useScoreTable } from './useScoreTable';

export type { ScoreEntry } from './useScoreTable';

/** The numbers the HUD shows, as at the start of a run. A new object each time, so setting it always redraws. */
const startingMetrics = () => ({
    score: 0,
    health: MAX_HEALTH,
    energy: 100,
    maxHealth: MAX_HEALTH,
    streak: 0,
});

/**
 * Start a stage from its beginning: the clock, the scroll and the obstacles. Used by
 * Continue (on to the next stage) and the debug jump to a stage.
 */
const startStage = (state: GameState, stageId: string) => {
    state.stageId = stageId;
    state.distance = 0;
    state.scroll = 0;
    state.stageStatus = 'playing';
    state.stageStartTime = Date.now() / 1000; // Reset so stage 2+ progress is from 0
    state.obstacles = [];
    resetSpawner(state);
};

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
    if (stateRef.current.paused === undefined) {
        stateRef.current.paused = false;
        stateRef.current.pausedAt = 0;
        stateRef.current.resumeAt = 0;
    }
    if (stateRef.current.pickups === undefined) {
        stateRef.current.pickups = [];
        stateRef.current.streak = 0;
    }
    const requestRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    /** Where the music is in a track, or null when it isn't playing it (see setMusicClock). */
    const musicClockRef = useRef<((trackKey: string) => number | null) | null>(null);
    /** The stage being played, looked up again only when the stage changes. */
    const stageRef = useRef<StageConfig>(stageById(stateRef.current.stageId));
    const { highScore, scoreTable, newScoreIndex, noteScore, saveHighScore, recordRun, unrecordRun, newRun } = useScoreTable();

    /**
     * Leaving the app (another app, or the phone locked) pauses a run that's going, so it
     * comes back to the PAUSED screen rather than carrying straight on. A 3-2-1 that was
     * counting stops, back to plain paused.
     *
     * Anything else (a Stage Clear screen, say) just freezes: the time away is added to the
     * stage's start time, since the stage clock runs on real time.
     */
    useEffect(() => {
        let awaySince: number | null = null;
        const subscription = AppState.addEventListener('change', (next) => {
            const state = stateRef.current;
            if (next !== 'active') {
                // The app may be closed while it's away: keep the high score.
                saveHighScore();
                if (awaySince === null) awaySince = Date.now() / 1000;
                if (!pauseRun(state, awaySince)) cancelResume(state);
                return;
            }
            if (awaySince === null) return;
            const away = Date.now() / 1000 - awaySince;
            awaySince = null;
            // A paused run's clock is already standing still; it moves on when play resumes.
            if (state.stageStartTime > 0 && !state.paused) state.stageStartTime += away;
            // Start timing frames afresh, so the first frame back isn't one huge step.
            lastFrameTimeRef.current = 0;
        });
        return () => subscription.remove();
    }, [saveHighScore]);

    // UI State Sync (Optimized)
    const [gameMetrics, setGameMetrics] = useState(startingMetrics);
    const metricsRef = useRef(gameMetrics); // Ref to avoid closure staleness in loop check

    const [renderTrigger, setRenderTrigger] = useState(0); // For Canvas (60fps)

    useEffect(() => {
        const loop = () => {
            const state = stateRef.current;

            if (!state.gameOver && state.gameStarted) {
                if (stageRef.current.id !== state.stageId) stageRef.current = stageById(state.stageId);
                const currentStage = stageRef.current;

                // Time-based stage progress: 3 minutes per stage so audio and visuals stay in sync (see docs/STAGE_DESIGN.md)
                const nowSec = Date.now() / 1000;
                if (state.stageStartTime <= 0) state.stageStartTime = nowSec;

                // Paused: nothing moves and the stage clock stands still until the 3-2-1 runs out.
                if (state.paused) {
                    if (!tickPause(state, nowSec)) {
                        setRenderTrigger(prev => prev + 1);
                        requestRef.current = requestAnimationFrame(loop);
                        return;
                    }
                    // Carrying on: time the next frame afresh, so it isn't one huge step.
                    lastFrameTimeRef.current = 0;
                }
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
                    // Keep the stage clock on the music, which drifts a little each time it
                    // stops and starts (pauses, other apps). See musicSync.ts.
                    const musicSec = musicClockRef.current?.(currentStage.audio?.musicTrack || 'music_city');
                    if (musicSec != null) state.stageStartTime += musicNudge(elapsedSec, musicSec, deltaTimeSec);
                    stepWorld(state, currentStage, deltaTimeSec);
                }

                // The high score on screen keeps up with the score (it's saved when the run ends or pauses).
                noteScore(state.score);

                // Sync UI State (Throttled by actual changes)
                // Use floor for energy to reduce updates (only update on integer changes)
                if (
                    state.score !== metricsRef.current.score ||
                    state.player.health !== metricsRef.current.health ||
                    Math.floor(state.energy) !== Math.floor(metricsRef.current.energy) ||
                    state.player.maxHealth !== metricsRef.current.maxHealth ||
                    state.streak !== metricsRef.current.streak
                ) {
                    const newMetrics = {
                        score: state.score,
                        health: state.player.health,
                        energy: state.energy,
                        maxHealth: state.player.maxHealth,
                        streak: state.streak,
                    };
                    metricsRef.current = newMetrics;
                    setGameMetrics(newMetrics);
                }
            }

            // A run just ended: into the score table, once (see useScoreTable).
            if (state.gameOver) recordRun(state);

            // Force React to re-render for Canvas (60fps when possible for smooth animation).
            setRenderTrigger(prev => prev + 1);

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [noteScore, recordRun]);

    /** A fresh game state, not yet recorded, with the HUD numbers reset. `started`: straight into the run. */
    const resetRun = useCallback((started: boolean) => {
        stateRef.current = createInitialState();
        lastFrameTimeRef.current = 0;
        stateRef.current.gameStarted = started;
        newRun();
        resetSpawner(stateRef.current);
        const metrics = startingMetrics();
        metricsRef.current = metrics;
        setGameMetrics(metrics);
    }, [newRun]);

    /** Play again from the start. */
    const restartGame = useCallback(() => resetRun(true), [resetRun]);

    /** Tell the game where the music is, so the stage clock can follow it. */
    const setMusicClock = useCallback((clock: ((trackKey: string) => number | null) | null) => {
        musicClockRef.current = clock;
    }, []);

    /** Pause the run. False if there's nothing to pause (menus, Stage Clear, Game Over). */
    const pauseGame = useCallback(() => {
        const paused = pauseRun(stateRef.current, Date.now() / 1000);
        if (paused) {
            saveHighScore();
            setRenderTrigger(prev => prev + 1);
        }
        return paused;
    }, [saveHighScore]);

    /** Start the 3-2-1; play carries on when it runs out. */
    const resumeGame = useCallback(() => {
        startResume(stateRef.current, Date.now() / 1000);
        setRenderTrigger(prev => prev + 1);
    }, []);

    /** Give up this run and go back to the title. It isn't recorded: it didn't end. */
    const quitToTitle = useCallback(() => resetRun(false), [resetRun]);

    // Input Handler
    const onJump = useCallback(() => {
        const state = stateRef.current;
        if (state.gameOver || state.paused) return;

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
        startStage(state, stageId);
        // Unlike Continue, this can come from anywhere (mid-stage, Stage Clear, Game Over), so
        // it also clears the stage's clock readings, the end-of-run flags and the particles.
        state.stageProgress = 0;
        state.elapsedSecInStage = 0;
        state.showContinue = false;
        state.gameOver = false;
        state.gameComplete = false;
        state.gameStarted = true;
        state.particles = [];
        unrecordRun();
        setRenderTrigger(prev => prev + 1);
    }, [unrecordRun]);

    /** `hold`: stay down until onDuckRelease (finger kept on the screen, or the key held). */
    const onDuck = useCallback((hold = false) => {
        const state = stateRef.current;
        if (state.gameOver || !state.gameStarted || state.paused) return;
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
            startStage(state, nextStage.id);
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
        pauseGame,
        resumeGame,
        setMusicClock,
        quitToTitle,
        toggleDebugMode,
        jumpToStage,
        tick: renderTrigger,
        highScore,
        scoreTable,
        newScoreIndex
    };
};
