import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Platform, Pressable, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HowToPlayScreen } from '../components/menu/HowToPlayScreen';
import { MENU_FONT_FILES } from '../components/menu/menuStyle';
import { TitleScreen } from '../components/menu/TitleScreen';
import { RNText } from '../components/RNText';
import { EnergyBar } from '../components/ui/EnergyBar';
import { HealthBar } from '../components/ui/HealthBar';
import { ScoreDisplay } from '../components/ui/ScoreDisplay';
import { DEBUG_ENABLED, SCREEN_HEIGHT, SCREEN_WIDTH } from '../game/constants';
import { useGameLoop } from '../game/loop/useGameLoop';
import { STAGES } from '../game/stages';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

// Lazy load GameCanvas to ensure Skia is initialized before import (on Web)
const GameCanvas = React.lazy(() =>
    import('../components/GameCanvas').then(module => ({ default: module.GameCanvas }))
);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** "21 OCT", written by hand so it doesn't depend on the device's locale support. */
const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const LOGICAL_WIDTH = SCREEN_WIDTH;   // 600 – game logic (spawn, player, focus) stays in this width
const LOGICAL_HEIGHT = SCREEN_HEIGHT; // 350

/** Desktop web: fixed size for preview/feedback; no filling the browser. */
const WEB_VIEWPORT = { width: 600, height: 350 };

/** The stage name shows for this long at the start of each stage, then fades over the next bit. */
const STAGE_BANNER_SEC = 5;
const STAGE_BANNER_FADE_SEC = 0.8;

/** How far a finger has to move down, in screen points, to count as a swipe to duck. */
const SWIPE_DUCK_PX = 24;

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

    const { gameState, gameMetrics, onJump, onDuck, onDuckRelease, restartGame, tick, highScore, scoreTable, newScoreIndex, toggleDebugMode, onContinue, jumpToStage } = useGameLoop();
    const { playMusic, stopMusic, preloadTrack } = useBackgroundMusic();
    const [showInstructions, setShowInstructions] = React.useState(false);
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

    // Stop music on game over / continue; reset so Play Again can start music again
    useEffect(() => {
        if (gameState.gameOver || gameState.showContinue) {
            musicStartedForRunRef.current = false;
            stopMusic();
        }
    }, [gameState.gameOver, gameState.showContinue, stopMusic]);

    // Swipe down to duck, and keep the finger down to stay ducked. Tap still jumps.
    const duckGesture = useMemo(
        () => Gesture.Pan()
            .runOnJS(true)
            .minDistance(12)
            .onUpdate((e) => {
                const mostlyDownward = e.translationY > Math.abs(e.translationX);
                if (e.translationY > SWIPE_DUCK_PX && mostlyDownward) onDuck(true);
            })
            .onFinalize(() => onDuckRelease()),
        [onDuck, onDuckRelease]
    );

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
     * Phone browsers: one handler decides, for each touch, whether it's a tap (jump) or a
     * downward swipe (duck). In a browser the gesture library and the tap button each saw
     * the same touch, so a swipe also jumped on release, and jumping cancels a duck.
     * The phone app keeps the gesture library below, where it works.
     */
    const touchRef = useRef<{ x: number; y: number; ducked: boolean } | null>(null);
    const onTouchStart = useCallback((e: GestureResponderEvent) => {
        const t = e.nativeEvent.touches[0];
        if (t) touchRef.current = { x: t.pageX, y: t.pageY, ducked: false };
    }, []);
    const onTouchMove = useCallback((e: GestureResponderEvent) => {
        const start = touchRef.current;
        const t = e.nativeEvent.touches[0];
        if (!start || start.ducked || !t) return;
        const dx = t.pageX - start.x;
        const dy = t.pageY - start.y;
        // Duck the moment the finger has clearly moved down, rather than waiting for it to lift,
        // and stay down for as long as the finger stays on the screen.
        if (dy > SWIPE_DUCK_PX && dy > Math.abs(dx)) {
            start.ducked = true;
            if (!gameState.gameOver && !gameState.showContinue) onDuck(true);
        }
    }, [onDuck, gameState.gameOver, gameState.showContinue]);
    const onTouchEnd = useCallback((e: GestureResponderEvent) => {
        const start = touchRef.current;
        touchRef.current = null;
        // Stops the browser also sending a mouse click for this touch.
        e.preventDefault();
        if (start?.ducked) onDuckRelease();
        else if (start) handleInteraction();
    }, [handleInteraction, onDuckRelease]);

    // Web Keyboard: capture phase so we handle Space/Up before React (no synthetic click on Pressable)
    const gameStateRef = React.useRef(gameState);
    gameStateRef.current = gameState;
    const onJumpRef = React.useRef(onJump);
    const onDuckRef = React.useRef(onDuck);
    const onDuckReleaseRef = React.useRef(onDuckRelease);
    const playMusicRef = React.useRef(playMusic);
    const restartGameRef = React.useRef(restartGame);
    onJumpRef.current = onJump;
    onDuckRef.current = onDuck;
    onDuckReleaseRef.current = onDuckRelease;
    playMusicRef.current = playMusic;
    restartGameRef.current = restartGame;
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                const state = gameStateRef.current;
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
                        <View style={styles.countdownOverlay}>
                            <RNText style={styles.countdownText}>
                                {musicReady ? 'GET READY...' : `LOADING MUSIC ${musicPercent}%`}
                            </RNText>
                            {!musicReady && (
                                <View style={styles.loadingTrack}>
                                    <View style={[styles.loadingFill, { width: `${musicPercent}%` }]} />
                                </View>
                            )}
                        </View>
                    )}
                    {/* Title screen - only after assets loaded so the game is ready behind it */}
                    {readyToStart && !gameState.gameStarted && !gameState.gameOver && !showInstructions && (
                        <TitleScreen
                            hiScore={highScore}
                            scoreTable={scoreTable}
                            onStart={startGame}
                            onHowToPlay={() => setShowInstructions(true)}
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
                            />
                        </View>
                    )}

                    {/* Finished: every stage cleared */}
                    {gameState.gameComplete && !showInstructions && (
                        <View style={[styles.gameOverContainer, styles.finishContainer]}>
                            <RNText style={styles.finishTitle}>FINISHED!</RNText>
                            <RNText style={styles.finishSubtitle}>ALL FOUR STAGES CLEARED</RNText>
                            <RNText style={styles.finishScore}>Score: {gameState.score}</RNText>

                            <RNText style={styles.tableHeading}>BEST RUNS</RNText>
                            {scoreTable.length === 0 ? (
                                <RNText style={styles.tableEmpty}>No scores yet</RNText>
                            ) : scoreTable.map((entry, i) => {
                                const isNew = i === newScoreIndex;
                                return (
                                    <View key={`${entry.date}-${i}`} style={styles.tableRow}>
                                        <RNText style={[styles.tableCell, styles.tableRank, isNew && styles.tableNew]}>{i + 1}</RNText>
                                        <RNText style={[styles.tableCell, styles.tableScore, isNew && styles.tableNew]}>{entry.score}</RNText>
                                        <RNText style={[styles.tableCell, styles.tableDate, isNew && styles.tableNew]}>{formatDate(entry.date)}</RNText>
                                        {/* A star marks runs that cleared every stage. */}
                                        <RNText style={[styles.tableCell, styles.tableMark, isNew && styles.tableNew]}>{entry.completed ? '\u2605' : ''}</RNText>
                                    </View>
                                );
                            })}

                            <Pressable style={[styles.restartButton, styles.startButton, styles.finishButton]} onPress={playAgain}>
                                <RNText style={[styles.restartButtonText, styles.startButtonText]}>PLAY AGAIN</RNText>
                            </Pressable>
                        </View>
                    )}

                    {/* Game Over Modal */}
                    {gameState.gameOver && !gameState.gameComplete && !showInstructions && (
                        <View style={styles.gameOverContainer}>
                            <RNText style={styles.gameOverTitle}>GAME OVER</RNText>
                            <RNText style={styles.gameOverScore}>Final Score: {gameState.score}</RNText>
                            <RNText style={styles.highScoreText}>Best: {highScore}</RNText>

                            <Pressable
                                style={styles.restartButton}
                                onPress={playAgain}
                            >
                                <RNText style={styles.restartButtonText}>PLAY AGAIN</RNText>
                            </Pressable>
                            <Pressable
                                style={[styles.instructionsButton, { marginTop: 15 }]}
                                onPress={() => setShowInstructions(true)}
                            >
                                <RNText style={styles.instructionsButtonText}>HOW TO PLAY</RNText>
                            </Pressable>
                        </View>
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
                    {/* Continue Modal */}
                    {gameState.showContinue && (
                        <View style={styles.gameOverContainer}>
                            <RNText style={styles.gameOverTitle}>STAGE CLEAR</RNText>
                            <RNText style={styles.gameOverScore}>Next Stage Ready</RNText>
                            <Pressable
                                style={[styles.restartButton, styles.startButton, nextMusicPercent < 100 && styles.buttonWaiting]}
                                onPress={nextMusicPercent < 100 ? undefined : onContinue}
                            >
                                <RNText style={[styles.restartButtonText, styles.startButtonText]}>
                                    {nextMusicPercent < 100 ? `LOADING MUSIC ${nextMusicPercent}%` : 'CONTINUE?'}
                                </RNText>
                            </Pressable>
                        </View>
                    )}
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
    stageBanner: {
        position: 'absolute',
        top: '24%',
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'none',
    },
    stageBannerNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 6,
        color: '#00ffff',
        textShadowColor: '#00ffff',
        textShadowRadius: 8,
        textShadowOffset: { width: 0, height: 0 },
    },
    stageBannerName: {
        marginTop: 4,
        fontSize: 34,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: 4,
        color: '#ffffff',
        textShadowColor: '#ff00cc',
        textShadowRadius: 12,
        textShadowOffset: { width: 0, height: 0 },
    },
    hudArea: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'box-none',
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
    countdownOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 12, 41, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    countdownText: {
        fontSize: 28,
        color: '#00ffff',
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    loadingTrack: {
        width: 260,
        height: 8,
        marginTop: 16,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    loadingFill: {
        height: '100%',
        backgroundColor: '#ff00cc',
    },
    buttonWaiting: {
        opacity: 0.5,
    },
    gameOverContainer: {
        backgroundColor: 'rgba(15, 12, 41, 0.95)', // Deep Purple
        paddingVertical: 30, // Reduced from 40
        paddingHorizontal: 40, // Reduced from 60
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ff00cc', // Neon Pink Border
        shadowColor: "#ff00cc",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    gameOverTitle: {
        color: '#ff00cc', // Neon Pink
        fontSize: 36, // Reduced from 48
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 4,
        textShadowColor: '#ff00cc',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
        fontStyle: 'italic',
    },
    gameOverScore: {
        color: '#00ffff', // Cyan
        fontSize: 24, // Reduced from 32
        fontWeight: 'bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    // Win screen: tighter than Game Over, so the score table fits the 350px-high view.
    finishContainer: {
        paddingVertical: 16,
        paddingHorizontal: 36,
    },
    finishTitle: {
        color: '#ffd700',
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: 4,
        fontStyle: 'italic',
        textShadowColor: '#ffd700',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    finishSubtitle: {
        color: '#ff00cc',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 6,
    },
    finishScore: {
        color: '#00ffff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    tableHeading: {
        color: '#ffdd55',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 3,
        marginBottom: 4,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 19,
    },
    tableCell: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tableRank: { width: 22, textAlign: 'left' },
    tableScore: { width: 56, textAlign: 'right' },
    tableDate: { width: 70, textAlign: 'right' },
    tableMark: { width: 22, textAlign: 'right', color: '#ffd700' },
    /** The run that just ended. */
    tableNew: { color: '#00ffff' },
    tableEmpty: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        marginVertical: 6,
    },
    finishButton: {
        marginTop: 10,
    },
    highScoreText: {
        color: '#ffdd55', // Sun Yellow
        fontSize: 16, // Reduced from 20
        fontWeight: 'bold',
        marginBottom: 20, // Reduced from 30
        letterSpacing: 2,
    },
    restartButton: {
        backgroundColor: '#FF1493', // Deep Pink
        paddingVertical: 12, // Reduced from 15
        paddingHorizontal: 30, // Reduced from 50
        borderRadius: 30,
        marginTop: 10,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: "#FF1493",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 8,
    },
    startButton: {
        backgroundColor: '#00ffff', // Cyan
        borderColor: '#fff',
        shadowColor: "#00ffff",
    },
    startButtonText: {
        color: '#0f0c29', // Deep Purple (Background color)
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0, // Remove shadow or make it glow
    },
    restartButtonText: {
        color: 'white',
        fontSize: 20, // Reduced from 24
        fontWeight: '900',
        letterSpacing: 3,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    startScreenContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 12, 41, 0.8)',
        padding: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 204, 0.3)',
    },
    titleText: {
        fontSize: 64,
        fontWeight: '900',
        color: '#00ffff', // Cyan
        letterSpacing: 6,
        fontStyle: 'italic',
        textShadowColor: '#00ffff',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    titleSubText: {
        fontSize: 64,
        fontWeight: '900',
        color: '#ff00cc', // Pink
        letterSpacing: 6,
        fontStyle: 'italic',
        marginBottom: 50,
        textShadowColor: '#ff00cc',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    startText: {
        fontSize: 28,
        color: 'white',
        fontWeight: 'bold',
        opacity: 1,
        letterSpacing: 2,
        textTransform: 'uppercase',
        textShadowColor: '#fff',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    instructionsButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#00ffff',
    },
    instructionsButtonText: {
        color: '#00ffff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    instructionsContainer: {
        position: 'absolute',
        backgroundColor: 'rgba(15, 12, 41, 0.98)',
        paddingVertical: 18,
        paddingHorizontal: 28,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#00ffff',
        alignItems: 'center',
        zIndex: 50,
        shadowColor: "#00ffff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    instructionsTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#00ffff',
        marginBottom: 12,
        letterSpacing: 4,
        fontStyle: 'italic',
        textShadowColor: '#00ffff',
        textShadowRadius: 10,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 7,
        width: '100%',
    },
    instructionDot: {
        width: 11,
        height: 11,
        borderRadius: 6,
        marginRight: 12,
        shadowColor: "white",
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    instructionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    closeButton: {
        marginTop: 12,
        backgroundColor: '#FF1493',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'white',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 2,
    }
});
