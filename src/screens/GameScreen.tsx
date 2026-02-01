import React, { Suspense, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../game/constants';
import { useGameLoop } from '../game/loop/useGameLoop';

// Lazy load GameCanvas to ensure Skia is initialized before import (on Web)
const GameCanvas = React.lazy(() =>
    import('../components/GameCanvas').then(module => ({ default: module.GameCanvas }))
);

export const GameScreen = () => {
    const { gameState, onJump, tick, highScore } = useGameLoop();

    // Web Keyboard Support
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    onJump();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [onJump]);

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
                <Pressable style={styles.inputLayer} onPress={onJump} />

                {/* 3. UI Overlay */}
                <View style={styles.uiLayer}>
                    {/* Health Bar */}
                    <View style={styles.healthContainer}>
                        <View style={styles.healthBarBackground}>
                            <View
                                style={[
                                    styles.healthBarFill,
                                    { width: `${(gameState.player.health / gameState.player.maxHealth) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.healthText}>HP</Text>
                    </View>

                    {/* Score HUD */}
                    <View style={styles.scoreContainer}>
                        <Text style={styles.scoreLabel}>SCORE</Text>
                        <Text style={styles.scoreValue}>{gameState.score}</Text>
                    </View>

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
    scoreContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        alignItems: 'flex-end',
    },
    scoreLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#333',
        letterSpacing: 2,
    },
    scoreValue: {
        fontSize: 32,
        fontWeight: '900',
        color: '#333',
    },
    healthContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    healthBarBackground: {
        width: 150,
        height: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    healthBarFill: {
        height: '100%',
        backgroundColor: '#ff4444',
    },
    healthText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ff4444',
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
});
