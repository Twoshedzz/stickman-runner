import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, GestureResponderEvent, Platform, Pressable, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HowToPlayScreen } from '../components/menu/HowToPlayScreen';
import { InitialsScreen } from '../components/menu/InitialsScreen';
import { LoadingScreen } from '../components/menu/LoadingScreen';
import { PausedScreen } from '../components/menu/PausedScreen';
import { FinishedScreen, GameOverScreen, StageClearScreen } from '../components/menu/ResultScreens';
import { FONT, glow, MENU_FONT_FILES, NEON } from '../components/menu/menuStyle';
import { TitleScreen } from '../components/menu/TitleScreen';
import { WorldScoresScreen } from '../components/menu/WorldScoresScreen';
import { RNText } from '../components/RNText';
import { EnergyBar } from '../components/ui/EnergyBar';
import { HealthBar } from '../components/ui/HealthBar';
import { PauseButton } from '../components/ui/PauseButton';
import { ScoreDisplay } from '../components/ui/ScoreDisplay';
import { DEBUG_ENABLED, SCREEN_HEIGHT, SCREEN_WIDTH } from '../game/constants';
import { useGameLoop } from '../game/loop/useGameLoop';
import { canPause, countdownLeft, isCountingDown, RESUME_COUNTDOWN_SEC } from '../game/pause';
import { STAGES } from '../game/stages';
import { endSwipe, moveSwipe, startSwipe, Swipe } from '../game/swipe';
import { BOARD_SIZE } from '../scoreboard/rules';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { SendOutcome, useWorldBoard } from '../scoreboard/worldBoard';

// Lazy load GameCanvas to ensure Skia is initialized before import (on Web)
const GameCanvas = React.lazy(() =>
    import('../components/GameCanvas').then(module => ({ default: module.GameCanvas }))
);

const LOGICAL_WIDTH = SCREEN_WIDTH;   // 600 – game logic (spawn, player, focus) stays in this width
const LOGICAL_HEIGHT = SCREEN_HEIGHT; // 350

/** Desktop web: fixed size for preview/feedback; no filling the browser. */
const WEB_VIEWPORT = { width: 600, height: 350 };

/** The stage name shows for this long at the start of each stage, then fades over the next bit. */
const STAGE_BANNER_SEC = 5;
const STAGE_BANNER_FADE_SEC = 0.8;


/**
 * A phone or tablet browser, including the game saved to the home screen. These fill the
 * screen the way the phone app does, rather than showing the small desktop preview.
 */
const isTouchWeb =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(pointer: coarse)').matches;

export const GameScreen = () => {
    const windowDim = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    /** Desktop web shows a fixed-size preview; everything else fills the screen. */
    const fixedPreview = isWeb && !isTouchWeb;
    const viewportWidth = fixedPreview ? WEB_VIEWPORT.width : windowDim.width;
    const viewportHeight = fixedPreview ? WEB_VIEWPORT.height : windowDim.height;
    /** Phones can't be locked sideways from a web page, so ask the player to turn it. */
    const needsRotate = isTouchWeb && windowDim.height > windowDim.width;

    const { gameState, gameMetrics, onJump, onDuck, onDuckRelease, restartGame, tick, highScore, scoreTable, newScoreIndex, toggleDebugMode, onContinue, jumpToStage, pauseGame, resumeGame, quitToTitle, setMusicClock } = useGameLoop();
    const { playMusic, stopMusic, pauseMusic, resumeMusic, musicPosition, preloadTrack } = useBackgroundMusic();
    const [showInstructions, setShowInstructions] = React.useState(false);

    /**
     * Pausing. The button (or P / Esc) stops the run and its music; RESUME counts 3-2-1 with
     * the music rewound to play through the count (see src/game/pause.ts).
     */
    const countingDown = isCountingDown(gameState);
    // Also catches a pause the game made itself, when the app went to the background.
    useEffect(() => {
        if (gameState.paused && !countingDown) pauseMusic();
    }, [gameState.paused, countingDown, pauseMusic]);
    const pauseRun = useCallback(() => {
        if (pauseGame()) pauseMusic();
    }, [pauseGame, pauseMusic]);
    // Leaving the app mid-run pauses the run (in the game loop), so pause its music here and
    // now too. Waiting for the screen to catch up let the music play for a moment on return,
    // which put it a little out of step with the game.
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            const state = gameStateRef.current;
            if (next !== 'active' && (state.paused || canPause(state))) pauseMusic();
        });
        return () => subscription.remove();
    }, [pauseMusic]);
    // The stage clock follows the music (see src/game/musicSync.ts).
    useEffect(() => {
        setMusicClock(musicPosition);
        return () => setMusicClock(null);
    }, [setMusicClock, musicPosition]);
    // The music starts inside this tap: iPhone Safari won't start it any other way.
    const resumeRun = useCallback(() => {
        resumeMusic(RESUME_COUNTDOWN_SEC);
        resumeGame();
    }, [resumeMusic, resumeGame]);

    /**
     * The world scoreboard. When a run ends with a score that makes the world top 10, it
     * asks for initials before the Game Over or Finished screen. Debug runs never count.
     */
    const world = useWorldBoard();
    const [enterInitials, setEnterInitials] = useState<{ score: number; completed: boolean } | null>(null);
    /** What became of the last run's score on the world board, for the end screens. */
    const [worldResult, setWorldResult] = useState<SendOutcome | null>(null);
    /**
     * The world top 10 screen: straight after entering initials ('entered', then on to the
     * end screen), or opened from the title or Game Over menu ('browse').
     */
    const [worldScreen, setWorldScreen] = useState<'entered' | 'browse' | null>(null);
    /** This run's own place on the board, to light up. */
    const myPlace = worldResult?.outcome === 'sent' && worldResult.rank !== null && worldResult.rank < BOARD_SIZE
        ? worldResult.rank
        : -1;
    const runCheckedRef = useRef(false);
    /** A screen with its own keys is open (typing initials, the world board), so the game's keys stand aside. */
    const initialsOpenRef = useRef(false);
    initialsOpenRef.current = enterInitials !== null || worldScreen !== null;
    useEffect(() => {
        if (!gameState.gameOver) {
            // A new run after the last one ended: look at the board afresh, so it's up to
            // date by the time this run ends.
            if (runCheckedRef.current && gameState.gameStarted) {
                runCheckedRef.current = false;
                setWorldResult(null);
                world.refresh();
            }
            return;
        }
        if (runCheckedRef.current) return;
        runCheckedRef.current = true;
        if (!gameState.debugMode && world.canEnter(gameState.score)) {
            setEnterInitials({ score: gameState.score, completed: gameState.gameComplete });
        }
    }, [gameState.gameOver, gameState.gameStarted, gameState.debugMode, gameState.score, gameState.gameComplete, world]);

    const submitInitials = useCallback(async (initials: string) => {
        const entry = enterInitials;
        setEnterInitials(null);
        if (!entry) return;
        setWorldResult({ outcome: 'sending' });
        setWorldScreen('entered');
        setWorldResult(await world.submit({ initials, ...entry }));
    }, [enterInitials, world]);
    // The menu lettering. Until it arrives, text shows in the system font rather than waiting.
    useFonts(MENU_FONT_FILES);

    // Loading overlay: hide black block until building strip (and other assets) are ready.
    const [assetsReady, setAssetsReady] = useState(false);
    const onAssetsReady = useCallback(() => setAssetsReady(true), []);

    /**
     * The stage can't start until its music has loaded.
     *
     * Each track is 3 minutes to match the stage exactly, so if the stage starts first the
     * music runs behind the sunrise for the whole run. Waiting here costs a moment on the
     * start screen and keeps them locked together.
     */
    const [musicReady, setMusicReady] = useState(false);
    /** How much of the first track has arrived, 0-100, for the loading screen. */
    const [musicPercent, setMusicPercent] = useState(0);
    useEffect(() => {
        let cancelled = false;
        const stage = STAGES.find((s) => s.id === gameState.stageId) || STAGES[0];
        preloadTrack(stage.audio?.musicTrack || 'music_city', (fraction) => {
            if (!cancelled) setMusicPercent(Math.floor(fraction * 100));
        }).finally(() => {
            if (!cancelled) setMusicReady(true);
        });
        return () => { cancelled = true; };
        // Runs once: preloadTrack is stable and the stage is always the first one here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preloadTrack]);

    /**
     * Web: once the first track is in, fetch the other stages' music in the background, one at
     * a time, so each later stage can start straight away. (The phone app has it built in.)
     */
    useEffect(() => {
        if (!musicReady || Platform.OS !== 'web') return;
        let cancelled = false;
        (async () => {
            for (const stage of STAGES) {
                if (cancelled) return;
                await preloadTrack(stage.audio?.musicTrack || 'music_city');
            }
        })();
        return () => { cancelled = true; };
    }, [musicReady, preloadTrack]);

    /**
     * On the Stage Clear screen, make sure the next stage's music is in before CONTINUE is
     * offered. Usually it already is, from the background fetch above.
     */
    const [nextMusicPercent, setNextMusicPercent] = useState(100);
    useEffect(() => {
        if (!gameState.showContinue) return;
        const index = STAGES.findIndex((s) => s.id === gameState.stageId);
        const next = STAGES[index + 1];
        if (!next) return;
        let cancelled = false;
        setNextMusicPercent(0);
        preloadTrack(next.audio?.musicTrack || 'music_city', (fraction) => {
            if (!cancelled) setNextMusicPercent(Math.floor(fraction * 100));
        }).finally(() => {
            if (!cancelled) setNextMusicPercent(100);
        });
        return () => { cancelled = true; };
    }, [gameState.showContinue, gameState.stageId, preloadTrack]);

    const readyToStart = assetsReady && musicReady;

    // View width: on mobile when viewport is wide, draw wider so obstacles have longer run-in; focus stays left 600.
    const viewWidth = fixedPreview ? LOGICAL_WIDTH : Math.max(LOGICAL_WIDTH, LOGICAL_HEIGHT * (viewportWidth / viewportHeight));
    const viewHeight = LOGICAL_HEIGHT;

    // The game fills the whole screen, notch included; the score and health bars stay clear of
    // the notch and rounded corners. Insets are in screen points, so divide by the game's scale.
    const insets = useSafeAreaInsets();

    // Single uniform scale → no stretch (aspect ratio preserved). Scale to fill viewport.
    const scale = Math.max(viewportWidth / viewWidth, viewportHeight / viewHeight);
    const translateX = viewportWidth / 2 - viewWidth / 2;
    const translateY = viewportHeight / 2 - viewHeight / 2;

    // Start music only when playing (not on game over) so we don't start then immediately fade on death
    const musicStartedForRunRef = React.useRef(false);
    useEffect(() => {
        if (gameState.gameStarted && !gameState.gameOver && !musicStartedForRunRef.current) {
            musicStartedForRunRef.current = true;
            const currentStage = STAGES.find(s => s.id === gameState.stageId) || STAGES[0];
            playMusic(currentStage.audio?.musicTrack || 'music_city');
        }
    }, [gameState.gameStarted, gameState.gameOver, gameState.stageId, playMusic]);

    /** QUIT on the PAUSED screen: the run is dropped, back to the title. */
    const quitRun = useCallback(() => {
        musicStartedForRunRef.current = false;
        stopMusic();
        setShowInstructions(false);
        quitToTitle();
    }, [stopMusic, quitToTitle]);

    // Stop music on game over / continue; reset so Play Again can start music again
    useEffect(() => {
        if (gameState.gameOver || gameState.showContinue) {
            musicStartedForRunRef.current = false;
            stopMusic();
        }
    }, [gameState.gameOver, gameState.showContinue, stopMusic]);

    // A new run always starts at stage 1, so start stage 1's music - not the music of the
    // stage the last run ended on.
    const playAgain = useCallback(() => {
        playMusic(STAGES[0].audio?.musicTrack || 'music_city');
        restartGame();
    }, [playMusic, restartGame]);

    const handleInteraction = useCallback(() => {
        if (gameState.gameOver) return;
        if (gameState.showContinue) return;
        onJump();
    }, [onJump, gameState.gameOver, gameState.showContinue]);

    // Swipe down to duck, and keep the finger down to stay ducked; swipe back up from there
    // to jump. Tap still jumps.
    const gestureSwipeRef = useRef<Swipe | null>(null);
    const duckGesture = useMemo(
        () => Gesture.Pan()
            .runOnJS(true)
            .minDistance(12)
            .onBegin(() => { gestureSwipeRef.current = startSwipe(0, 0); })
            .onUpdate((e) => {
                const swipe = gestureSwipeRef.current;
                if (!swipe) return;
                if (moveSwipe(swipe, e.translationX, e.translationY) === 'jump') {
                    onDuckRelease();
                    handleInteraction();
                } else if (swipe.ducked && !swipe.jumped) {
                    onDuck(true); // again as the finger moves, so a duck swiped in the air lands ducked
                }
            })
            .onFinalize(() => {
                gestureSwipeRef.current = null;
                onDuckRelease();
            }),
        [onDuck, onDuckRelease, handleInteraction]
    );

    /**
     * START. The music is started right here, inside the tap, as well as when the run begins:
     * iPhone Safari only lets music start during a tap, and won't download it ahead of time,
     * so on a first visit the track isn't ready yet. Started from the tap, it plays as soon
     * as it arrives; starting the same track again later does nothing.
     */
    const startGame = useCallback(() => {
        const stage = STAGES.find((st) => st.id === gameState.stageId) || STAGES[0];
        playMusic(stage.audio?.musicTrack || 'music_city');
        handleInteraction();
    }, [gameState.stageId, playMusic, handleInteraction]);

    /**
     * CONTINUE on the Stage Clear screen. Like START, the next stage's music is started right
     * here in the tap (iPhone Safari only allows music to start during one), and the stage
     * itself starts at the same moment.
     */
    const continueToNextStage = useCallback(() => {
        const index = STAGES.findIndex((st) => st.id === gameState.stageId);
        const next = STAGES[index + 1];
        if (next) {
            musicStartedForRunRef.current = true;
            playMusic(next.audio?.musicTrack || 'music_city');
        }
        onContinue();
    }, [gameState.stageId, playMusic, onContinue]);

    /**
     * Phone browsers: one handler decides, for each touch, whether it's a tap (jump) or a
     * downward swipe (duck), or a swipe back up from that duck (jump). In a browser the gesture
     * library and the tap button each saw the same touch, so a swipe also jumped on release,
     * and jumping cancels a duck. The phone app keeps the gesture library above, where it works.
     */
    const touchRef = useRef<Swipe | null>(null);
    const onTouchStart = useCallback((e: GestureResponderEvent) => {
        const t = e.nativeEvent.touches[0];
        if (t) touchRef.current = startSwipe(t.pageX, t.pageY);
    }, []);
    const onTouchMove = useCallback((e: GestureResponderEvent) => {
        const swipe = touchRef.current;
        const t = e.nativeEvent.touches[0];
        if (!swipe || !t) return;
        // Duck the moment the finger has clearly moved down, rather than waiting for it to lift,
        // and stay down for as long as the finger stays on the screen.
        const action = moveSwipe(swipe, t.pageX, t.pageY);
        if (action === 'duck' && !gameState.gameOver && !gameState.showContinue) onDuck(true);
        if (action === 'jump') {
            onDuckRelease();
            handleInteraction();
        }
    }, [onDuck, onDuckRelease, handleInteraction, gameState.gameOver, gameState.showContinue]);
    const onTouchEnd = useCallback((e: GestureResponderEvent) => {
        const swipe = touchRef.current;
        touchRef.current = null;
        // Stops the browser also sending a mouse click for this touch.
        e.preventDefault();
        if (!swipe) return;
        const action = endSwipe(swipe);
        if (action === 'release') onDuckRelease();
        if (action === 'tap') handleInteraction();
    }, [handleInteraction, onDuckRelease]);

    // Web Keyboard: capture phase so we handle Space/Up before React (no synthetic click on Pressable)
    const onJumpRef = React.useRef(onJump);
    const onDuckRef = React.useRef(onDuck);
    const onDuckReleaseRef = React.useRef(onDuckRelease);
    const playMusicRef = React.useRef(playMusic);
    const restartGameRef = React.useRef(restartGame);
    const pauseRunRef = React.useRef(pauseRun);
    const resumeRunRef = React.useRef(resumeRun);
    const showInstructionsRef = React.useRef(showInstructions);
    pauseRunRef.current = pauseRun;
    resumeRunRef.current = resumeRun;
    showInstructionsRef.current = showInstructions;
    onJumpRef.current = onJump;
    onDuckRef.current = onDuck;
    onDuckReleaseRef.current = onDuckRelease;
    playMusicRef.current = playMusic;
    restartGameRef.current = restartGame;
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                // Typing initials: the keys are letters and arrows there, not jump and duck.
                if (initialsOpenRef.current) return;
                const state = gameStateRef.current;
                // P or Esc pauses, and on the PAUSED screen carries on.
                if (e.code === 'KeyP' || e.code === 'Escape') {
                    e.preventDefault();
                    if (!state.paused) pauseRunRef.current();
                    else if (!state.resumeAt && !showInstructionsRef.current) resumeRunRef.current();
                    return;
                }
                // Nothing else does anything while paused.
                if (state.paused) {
                    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
                    return;
                }
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (state.gameOver) return;
                    if (state.showContinue) return;
                    onJumpRef.current();
                }
                if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    e.preventDefault();
                    if (state.gameOver || state.showContinue) return;
                    onDuckRef.current(true); // held until the key comes up
                }
                if (state.gameOver && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
                    playMusicRef.current(STAGES[0].audio?.musicTrack || 'music_city');
                    restartGameRef.current();
                }
            };
            const handleKeyUp = (e: KeyboardEvent) => {
                if (e.code === 'ArrowDown' || e.code === 'KeyS') onDuckReleaseRef.current();
            };
            window.addEventListener('keydown', handleKeyDown, true);
            window.addEventListener('keyup', handleKeyUp, true);
            return () => {
                window.removeEventListener('keydown', handleKeyDown, true);
                window.removeEventListener('keyup', handleKeyUp, true);
            };
        }
    }, []);

    return (
        <View style={[styles.container, fixedPreview && styles.containerWeb]}>
            <View
                style={[
                    styles.scaledGameWrapper,
                    {
                        width: viewWidth,
                        height: viewHeight,
                        transform: fixedPreview ? undefined : [
                            { translateX },
                            { translateY },
                            { scale },
                        ],
                    },
                ]}
            >
                <View style={[styles.gameContainer, { width: viewWidth, height: viewHeight }]}>
                {/* 1. Rendering Layer */}
                <View style={styles.renderLayer}>
                    <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#87CEEB' }} />}>
                        <GameCanvas gameState={gameState} tick={tick} viewWidth={viewWidth} onAssetsReady={onAssetsReady} />
                    </Suspense>
                </View>

                {/* 2. Input Layer - Transparent; no tap when Continue modal is showing so music doesn’t restart */}
                {isTouchWeb ? (
                    <View
                        style={[styles.inputLayer, { pointerEvents: gameState.showContinue ? 'none' : 'auto' }]}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    />
                ) : (
                    <GestureDetector gesture={duckGesture}>
                        <View style={[styles.inputLayer, { pointerEvents: gameState.showContinue ? 'none' : 'auto' }]}>
                            <Pressable style={StyleSheet.absoluteFill} onPress={handleInteraction} />
                        </View>
                    </GestureDetector>
                )}

                {/* 3. UI Overlay */}
                <View style={styles.uiLayer}>
                    {/* Loading: hide black block until assets ready */}
                    {!readyToStart && (
                        <LoadingScreen
                            label={musicReady ? 'GET READY...' : `LOADING MUSIC ${musicPercent}%`}
                            percent={musicReady ? undefined : musicPercent}
                        />
                    )}
                    {/* Title screen - only after assets loaded so the game is ready behind it */}
                    {readyToStart && !gameState.gameStarted && !gameState.gameOver && !showInstructions && !worldScreen && (
                        <TitleScreen
                            hiScore={highScore}
                            scoreTable={scoreTable}
                            worldEntries={world.available ? world.entries : null}
                            onStart={startGame}
                            onHowToPlay={() => setShowInstructions(true)}
                            onWorldScores={world.available ? () => setWorldScreen('browse') : undefined}
                        />
                    )}

                    {/* The world top 10, with this run's entry lit up if it's on there */}
                    {worldScreen && !showInstructions && (
                        <WorldScoresScreen
                            entries={world.entries}
                            highlight={myPlace}
                            world={worldScreen === 'entered' ? worldResult : null}
                            offline={world.status === 'offline'}
                            doneLabel={worldScreen === 'entered' ? 'CONTINUE' : 'BACK'}
                            onDone={() => setWorldScreen(null)}
                        />
                    )}

                    {/* Stage name: shown for the first few seconds of each stage, then fades */}
                    {gameState.gameStarted && gameState.stageStatus === 'playing' && !gameState.gameOver &&
                        gameState.elapsedSecInStage < STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC && (
                        <View
                            style={[
                                styles.stageBanner,
                                {
                                    opacity: Math.min(1, Math.max(0,
                                        (STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC - gameState.elapsedSecInStage) / STAGE_BANNER_FADE_SEC
                                    )),
                                },
                            ]}
                        >
                            <RNText style={styles.stageBannerNumber}>
                                STAGE {STAGES.findIndex(s => s.id === gameState.stageId) + 1}
                            </RNText>
                            <RNText style={styles.stageBannerName}>
                                {(STAGES.find(s => s.id === gameState.stageId) || STAGES[0]).name}
                            </RNText>
                        </View>
                    )}

                    {/* HUD - Only show if playing or Game Over */}
                    {(gameState.gameStarted || gameState.gameOver) && (
                        <View
                            style={[
                                styles.hudArea,
                                fixedPreview ? null : { left: insets.left / scale, right: insets.right / scale },
                            ]}
                        >
                            <HealthBar health={gameMetrics.health} maxHealth={gameMetrics.maxHealth} />
                            <EnergyBar energy={gameMetrics.energy} />
                            <ScoreDisplay
                                score={gameMetrics.score}
                                stageNumber={STAGES.findIndex(s => s.id === gameState.stageId) + 1}
                                streak={gameMetrics.streak}
                                colour={(STAGES.find(s => s.id === gameState.stageId) ?? STAGES[0]).theme.pickupColors.glow}
                            />
                            {canPause(gameState) && <PauseButton onPress={pauseRun} />}
                        </View>
                    )}

                    {/* Resuming: 3-2-1 over the frozen game, the music already playing */}
                    {countingDown && (
                        <View style={styles.countdown}>
                            <RNText style={styles.countdownNumber}>{countdownLeft(gameState, Date.now() / 1000)}</RNText>
                        </View>
                    )}

                    {/* Paused */}
                    {gameState.paused && !countingDown && !showInstructions && (
                        <PausedScreen
                            stageNumber={STAGES.findIndex(s => s.id === gameState.stageId) + 1}
                            stageName={(STAGES.find(s => s.id === gameState.stageId) ?? STAGES[0]).name}
                            score={gameState.score}
                            onResume={resumeRun}
                            onHowToPlay={() => setShowInstructions(true)}
                            onQuit={quitRun}
                        />
                    )}

                    {/* Made the world top 10: initials first, then the end screen */}
                    {enterInitials && !showInstructions && (
                        <InitialsScreen
                            score={enterInitials.score}
                            initials={world.lastInitials}
                            keyboard={fixedPreview}
                            onSubmit={submitInitials}
                            onSkip={() => setEnterInitials(null)}
                        />
                    )}

                    {/* Finished: every stage cleared */}
                    {gameState.gameComplete && !enterInitials && !worldScreen && !showInstructions && (
                        <FinishedScreen
                            score={gameState.score}
                            scoreTable={scoreTable}
                            newScoreIndex={newScoreIndex}
                            world={worldResult}
                            onPlayAgain={playAgain}
                        />
                    )}

                    {/* Game over */}
                    {gameState.gameOver && !gameState.gameComplete && !enterInitials && !worldScreen && !showInstructions && (
                        <GameOverScreen
                            score={gameState.score}
                            hiScore={highScore}
                            newHiScore={gameState.score > 0 && newScoreIndex === 0}
                            world={worldResult}
                            onPlayAgain={playAgain}
                            onHowToPlay={() => setShowInstructions(true)}
                            onWorldScores={world.available ? () => setWorldScreen('browse') : undefined}
                        />
                    )}

                    {/* How to play: its own screen */}
                    {showInstructions && (
                        <HowToPlayScreen keyboard={fixedPreview} onBack={() => setShowInstructions(false)} />
                    )}
                    {/* DEBUG HUD */}
                    {gameState.debugMode && (
                        <View style={{ position: 'absolute', top: 100, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10 }}>
                            <RNText style={{ color: 'white' }}>Status: {gameState.stageStatus}</RNText>
                            <RNText style={{ color: 'white' }}>Score: {gameState.score}</RNText>
                            <RNText style={{ color: 'white' }}>Metrics Score: {gameMetrics.score}</RNText>
                            <RNText style={{ color: 'white' }}>Obs: {gameState.obstacles.length}</RNText>
                            <RNText style={{ color: 'white' }}>Started: {String(gameState.gameStarted)}</RNText>
                            <RNText style={{ color: 'white', fontWeight: 'bold' }}>Distance: {Math.floor(gameState.distance)}</RNText>
                            <RNText style={{ color: 'white' }}>Segment: {Math.min(6, 1 + Math.floor(gameState.distance / 7200))} (30s each)</RNText>
                            <RNText style={{ color: 'white', opacity: 0.8 }}>tick: {tick}</RNText>
                            {/* Jump to a stage, so stages 2-4 can be checked without playing through. */}
                            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                {STAGES.map((stage, i) => (
                                    <Pressable
                                        key={stage.id}
                                        onPress={() => {
                                            jumpToStage(stage.id);
                                            musicStartedForRunRef.current = true;
                                            playMusic(stage.audio?.musicTrack || 'music_city');
                                        }}
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            marginRight: 6,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: '#00ffff',
                                            backgroundColor: gameState.stageId === stage.id ? '#00ffff' : 'transparent',
                                        }}
                                    >
                                        <RNText style={{ color: gameState.stageId === stage.id ? '#0f0c29' : '#00ffff', fontWeight: 'bold' }}>
                                            {i + 1}
                                        </RNText>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    )}
                    {/* Debug Toggle */}
                    {DEBUG_ENABLED && (
                        <View style={{ position: 'absolute', top: 50, left: 20, flexDirection: 'row', alignItems: 'center' }}>
                            <RNText style={{ color: 'white', fontWeight: 'bold', marginRight: 10, textShadowColor: 'black', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 }}>DEBUG</RNText>
                            <Switch
                                value={gameState.debugMode}
                                onValueChange={toggleDebugMode}
                                trackColor={{ false: "#767577", true: "#ff00cc" }}
                                thumbColor={gameState.debugMode ? "#00ffff" : "#f4f3f4"}
                            />
                        </View>
                    )}
                    {/* Stage clear */}
                    {gameState.showContinue && (() => {
                        const index = STAGES.findIndex(st => st.id === gameState.stageId);
                        const next = STAGES[index + 1] ?? STAGES[index];
                        return (
                            <StageClearScreen
                                stageNumber={index + 1}
                                score={gameState.score}
                                nextStageNumber={index + 2}
                                nextStageName={next.name}
                                nextMusicPercent={nextMusicPercent}
                                onContinue={continueToNextStage}
                            />
                        );
                    })()}
                </View>
                </View>
            </View>
            {needsRotate && (
                <View style={styles.rotateOverlay}>
                    <RNText style={styles.rotateIcon}>{'\u21BB'}</RNText>
                    <RNText style={styles.rotateText}>TURN YOUR PHONE SIDEWAYS</RNText>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
        overflow: 'hidden',
    },
    containerWeb: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    // A dark see-through band behind the stage name, so it reads over the sun and sky.
    stageBanner: {
        position: 'absolute',
        top: '22%',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingVertical: 8,
        backgroundColor: 'rgba(4, 2, 12, 0.45)',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(0, 255, 255, 0.35)',
        pointerEvents: 'none',
    },
    stageBannerNumber: {
        fontFamily: FONT.bold,
        fontSize: 13,
        letterSpacing: 6,
        color: NEON.cyan,
        ...glow(NEON.cyan, 6),
    },
    stageBannerName: {
        marginTop: 2,
        fontFamily: FONT.display,
        fontSize: 30,
        letterSpacing: 4,
        color: NEON.white,
        ...glow(NEON.pink, 12),
    },
    hudArea: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'box-none',
    },
    countdown: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        // Taps pass straight through (they don't jump while paused anyway).
        pointerEvents: 'none',
    },
    countdownNumber: {
        fontFamily: FONT.display,
        fontSize: 96,
        color: NEON.white,
        ...glow(NEON.pink, 24),
    },
    rotateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0f0c29',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    rotateIcon: {
        color: '#ff00cc',
        fontSize: 64,
    },
    rotateText: {
        color: '#00ffff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    scaledGameWrapper: {
        position: 'absolute',
        left: 0,
        top: 0,
    },
    gameContainer: {
        backgroundColor: '#000',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#444',
    },
    renderLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
        backgroundColor: '#000',
    },
    inputLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    uiLayer: {
        ...StyleSheet.absoluteFillObject,
        // Taps pass through to the jump layer except on buttons. This has to live here in the
        // stylesheet: on web, 'box-none' written inline is silently dropped, and the overlay
        // then swallows every tap, so tapping never jumped.
        pointerEvents: 'box-none',
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    /** The run that just ended. */
});
