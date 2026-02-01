import React, { Suspense, useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
    const { gameState, onJump, tick, highScore } = useGameLoop();
    const { playMusic, stopMusic, musicStatus } = useBackgroundMusic();

    const handleInteraction = useCallback(() => {
        playMusic();
        onJump();
    }, [playMusic, onJump]);

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
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    handleInteraction();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleInteraction]);

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
                <View style={styles.uiLayer}>
                    {/* Start Screen */}
                    {!gameState.gameStarted && !gameState.gameOver && (
                        <View style={styles.startScreenContainer}>
                            <Text style={styles.titleText}>STICKMAN</Text>
                            <Text style={styles.titleSubText}>RUNNER</Text>
                            <Text style={styles.startText}>Tap to Start</Text>
                            <Text style={{ color: 'white', marginTop: 20, fontSize: 12 }}>Music: {musicStatus}</Text>
                        </View>
                    )}

                    {/* HUD - Only show if playing or Game Over */}
                    {(gameState.gameStarted || gameState.gameOver) && (
                        <React.Fragment>
                            <HealthBar health={gameState.player.health} maxHealth={gameState.player.maxHealth} />
                            <ScoreDisplay score={gameState.score} />
                        </React.Fragment>
                    )}

                    {/* Game Over Modal */}
                    {gameState.gameOver && (
                        <View style={styles.gameOverContainer}>
                            <Text style={styles.gameOverTitle}>GAME OVER</Text>
                            <Text style={styles.gameOverScore}>Final Score: {gameState.score}</Text>
                            <Text style={styles.highScoreText}>Best: {highScore}</Text>
                            <Text style={styles.restartText}>Tap anywhere to restart</Text>
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
        pointerEvents: 'none',
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameOverContainer: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingVertical: 30,
        paddingHorizontal: 50,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    gameOverTitle: {
        color: '#ff4444',
        fontSize: 42,
        fontWeight: '900',
        marginBottom: 10,
        letterSpacing: 2,
    },
    gameOverScore: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    highScoreText: {
        color: '#FFD700', // Gold color
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        letterSpacing: 1,
    },
    restartText: {
        color: '#aaa',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    startScreenContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#333',
        letterSpacing: 4,
        fontStyle: 'italic',
    },
    titleSubText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#ff4444',
        letterSpacing: 4,
        fontStyle: 'italic',
        marginBottom: 40,
    },
    startText: {
        fontSize: 24,
        color: '#333',
        fontWeight: 'bold',
        opacity: 0.8,
    }
});
