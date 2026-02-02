import React, { Suspense, useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { EnergyBar } from '../components/ui/EnergyBar';
import { HealthBar } from '../components/ui/HealthBar';
import { ScoreDisplay } from '../components/ui/ScoreDisplay';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../game/constants';
import { useGameLoop } from '../game/loop/useGameLoop';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

// Lazy load GameCanvas to ensure Skia is initialized before import (on Web)
const GameCanvas = React.lazy(() =>
    import('../components/GameCanvas').then(module => ({ default: module.GameCanvas }))
);

export const GameScreen = () => {
    const { gameState, gameMetrics, onJump, restartGame, tick, highScore } = useGameLoop();
    const { playMusic, stopMusic } = useBackgroundMusic();
    const [showInstructions, setShowInstructions] = React.useState(false);

    const handleInteraction = useCallback(() => {
        if (gameState.gameOver) return; // Prevent restart on generic tap
        playMusic();
        onJump();
    }, [playMusic, onJump, gameState.gameOver]);

    // Watch for Game Over to stop music
    useEffect(() => {
        if (gameState.gameOver) {
            stopMusic();
        }
    }, [gameState.gameOver, stopMusic]);

    // Web Keyboard Support
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (!gameState.gameOver && (e.code === 'Space' || e.code === 'ArrowUp')) {
                    handleInteraction();
                }
                if (gameState.gameOver && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
                    restartGame();
                    playMusic();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleInteraction, gameState.gameOver, restartGame, playMusic]);

    return (
        <View style={styles.container}>
            <View style={[styles.gameContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
                {/* 1. Rendering Layer */}
                <View style={styles.renderLayer}>
                    <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#87CEEB' }} />}>
                        <GameCanvas gameState={gameState} tick={tick} />
                    </Suspense>
                </View>

                {/* 2. Input Layer - Transparent Absolute Overlay */}
                <Pressable style={styles.inputLayer} onPress={handleInteraction} />

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
                            <ScoreDisplay score={gameMetrics.score} />
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
                                    playMusic();
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
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
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
