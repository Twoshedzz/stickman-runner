import React, { Suspense, useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
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

const LOGICAL_WIDTH = SCREEN_WIDTH;   // 600 – game logic (spawn, player, focus) stays in this width
const LOGICAL_HEIGHT = SCREEN_HEIGHT; // 350

/** Web: fixed size for preview/feedback; no filling the browser. */
const WEB_VIEWPORT = { width: 600, height: 350 };

export const GameScreen = () => {
    const windowDim = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const viewportWidth = isWeb ? WEB_VIEWPORT.width : windowDim.width;
    const viewportHeight = isWeb ? WEB_VIEWPORT.height : windowDim.height;

    const { gameState, gameMetrics, onJump, restartGame, tick, highScore, toggleDebugMode, onContinue } = useGameLoop();
    const { playMusic, stopMusic } = useBackgroundMusic();
    const [showInstructions, setShowInstructions] = React.useState(false);

    // View width: on mobile when viewport is wide, draw wider so obstacles have longer run-in; focus stays left 600.
    const viewWidth = isWeb ? LOGICAL_WIDTH : Math.max(LOGICAL_WIDTH, LOGICAL_HEIGHT * (viewportWidth / viewportHeight));
    const viewHeight = LOGICAL_HEIGHT;

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

    const handleInteraction = useCallback(() => {
        if (gameState.gameOver) return;
        if (gameState.showContinue) return;
        onJump();
    }, [onJump, gameState.gameOver, gameState.showContinue]);

    // Web Keyboard: capture phase so we handle Space/Up before React (no synthetic click on Pressable)
    const gameStateRef = React.useRef(gameState);
    gameStateRef.current = gameState;
    const onJumpRef = React.useRef(onJump);
    const playMusicRef = React.useRef(playMusic);
    const restartGameRef = React.useRef(restartGame);
    onJumpRef.current = onJump;
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
                if (state.gameOver && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
                    const stage = STAGES.find(s => s.id === state.stageId) || STAGES[0];
                    playMusicRef.current(stage.audio?.musicTrack || 'music_city');
                    restartGameRef.current();
                }
            };
            window.addEventListener('keydown', handleKeyDown, true);
            return () => window.removeEventListener('keydown', handleKeyDown, true);
        }
    }, []);

    return (
        <View style={[styles.container, isWeb && styles.containerWeb]}>
            <View
                style={[
                    styles.scaledGameWrapper,
                    {
                        width: viewWidth,
                        height: viewHeight,
                        transform: isWeb ? undefined : [
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
                        <GameCanvas gameState={gameState} tick={tick} viewWidth={viewWidth} />
                    </Suspense>
                </View>

                {/* 2. Input Layer - Transparent; no tap when Continue modal is showing so music doesn’t restart */}
                <Pressable
                    style={styles.inputLayer}
                    onPress={handleInteraction}
                    pointerEvents={gameState.showContinue ? 'none' : 'auto'}
                />

                {/* 3. UI Overlay */}
                <View style={styles.uiLayer} pointerEvents="box-none">
                    {/* Start Screen */}
                    {!gameState.gameStarted && !gameState.gameOver && !showInstructions && (
                        <View style={styles.startScreenContainer}>
                            <Text style={styles.titleText}>STICKMAN</Text>
                            <Text style={styles.titleSubText}>RUNNER</Text>
                            <Pressable
                                style={[styles.restartButton, styles.startButton]}
                                onPress={handleInteraction}
                            >
                                <Text style={[styles.restartButtonText, styles.startButtonText]}>START GAME</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.instructionsButton]}
                                onPress={() => setShowInstructions(true)}
                            >
                                <Text style={styles.instructionsButtonText}>HOW TO PLAY</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* HUD - Only show if playing or Game Over */}
                    {(gameState.gameStarted || gameState.gameOver) && (
                        <React.Fragment>
                            <HealthBar health={gameMetrics.health} maxHealth={gameMetrics.maxHealth} />
                            <EnergyBar energy={gameMetrics.energy} />
                            <ScoreDisplay
                                score={gameMetrics.score}
                                stageNumber={STAGES.findIndex(s => s.id === gameState.stageId) + 1}
                            />
                        </React.Fragment>
                    )}

                    {/* Game Over Modal */}
                    {gameState.gameOver && !showInstructions && (
                        <View style={styles.gameOverContainer}>
                            <Text style={styles.gameOverTitle}>GAME OVER</Text>
                            <Text style={styles.gameOverScore}>Final Score: {gameState.score}</Text>
                            <Text style={styles.highScoreText}>Best: {highScore}</Text>

                            <Pressable
                                style={styles.restartButton}
                                onPress={() => {
                                    const currentStage = STAGES.find(s => s.id === gameState.stageId) || STAGES[0];
                                    playMusic(currentStage.audio?.musicTrack || 'music_city');
                                    restartGame();
                                }}
                            >
                                <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.instructionsButton, { marginTop: 15 }]}
                                onPress={() => setShowInstructions(true)}
                            >
                                <Text style={styles.instructionsButtonText}>HOW TO PLAY</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Instructions Modal */}
                    {showInstructions && (
                        <View style={styles.instructionsContainer}>
                            <Text style={styles.instructionsTitle}>HOW TO PLAY</Text>

                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionDot, { backgroundColor: '#ffff00' }]} />
                                <Text style={styles.instructionText}>AVOID YELLOW OBSTACLES ⚠️</Text>
                            </View>

                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionDot, { backgroundColor: '#FF1493' }]} />
                                <Text style={styles.instructionText}>PINK HEARTS = HEALTH ❤️</Text>
                            </View>

                            <View style={styles.instructionRow}>
                                <View style={[styles.instructionDot, { backgroundColor: '#00ffff' }]} />
                                <Text style={styles.instructionText}>DOUBLE JUMP USES ENERGY ⚡</Text>
                            </View>

                            <Pressable
                                style={styles.closeButton}
                                onPress={() => setShowInstructions(false)}
                            >
                                <Text style={styles.closeButtonText}>GOT IT</Text>
                            </Pressable>
                        </View>
                    )}
                    {/* DEBUG HUD */}
                    {gameState.debugMode && (
                        <View style={{ position: 'absolute', top: 100, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10 }}>
                            <Text style={{ color: 'white' }}>Status: {gameState.stageStatus}</Text>
                            <Text style={{ color: 'white' }}>Score: {gameState.score}</Text>
                            <Text style={{ color: 'white' }}>Metrics Score: {gameMetrics.score}</Text>
                            <Text style={{ color: 'white' }}>Obs: {gameState.obstacles.length}</Text>
                            <Text style={{ color: 'white' }}>Started: {String(gameState.gameStarted)}</Text>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Distance: {Math.floor(gameState.distance)}</Text>
                            <Text style={{ color: 'white' }}>Segment: {Math.min(6, 1 + Math.floor(gameState.distance / 7200))} (30s each)</Text>
                            <Text style={{ color: 'white', opacity: 0.8 }}>tick: {tick}</Text>
                        </View>
                    )}
                    {/* Debug Toggle */}
                    {DEBUG_ENABLED && (
                        <View style={{ position: 'absolute', top: 50, left: 20, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: 'bold', marginRight: 10, textShadowColor: 'black', textShadowRadius: 2 }}>DEBUG</Text>
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
                            <Text style={styles.gameOverTitle}>STAGE CLEAR</Text>
                            <Text style={styles.gameOverScore}>Next Stage Ready</Text>
                            <Pressable
                                style={[styles.restartButton, styles.startButton]}
                                onPress={onContinue}
                            >
                                <Text style={[styles.restartButtonText, styles.startButtonText]}>CONTINUE?</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
                </View>
            </View>
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
    scaledGameWrapper: {
        position: 'absolute',
        left: 0,
        top: 0,
    },
    gameContainer: {
        backgroundColor: '#fff',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#444',
    },
    renderLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    inputLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    uiLayer: {
        ...StyleSheet.absoluteFillObject,
        // pointerEvents removed from style, used as prop instead
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 30,
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
        fontSize: 32,
        fontWeight: '900',
        color: '#00ffff',
        marginBottom: 25,
        letterSpacing: 4,
        fontStyle: 'italic',
        textShadowColor: '#00ffff',
        textShadowRadius: 10,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        width: '100%',
    },
    instructionDot: {
        width: 15,
        height: 15,
        borderRadius: 8,
        marginRight: 15,
        shadowColor: "white",
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    instructionText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    closeButton: {
        marginTop: 25,
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
