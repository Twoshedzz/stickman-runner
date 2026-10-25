/** Development builds only: the DEBUG switch, and with it on, the game's numbers and jump-to-stage buttons. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { RNText } from '../../components/RNText';
import { DEBUG_ENABLED } from '../../game/constants';
import { STAGES } from '../../game/stages';
import { GameState } from '../../game/state';

interface Props {
    gameState: GameState;
    metricsScore: number;
    tick: number;
    /** Debug mode is on: show the numbers and stage buttons. */
    showStats: boolean;
    onJumpToStage: (stageId: string) => void;
    onToggle: () => void;
}

export const DebugPanel = ({ gameState, metricsScore, tick, showStats, onJumpToStage, onToggle }: Props) => (
    <>
        {/* DEBUG HUD */}
        {showStats && (
            <View style={{ position: 'absolute', top: 100, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10 }}>
                <RNText style={{ color: 'white' }}>Status: {gameState.stageStatus}</RNText>
                <RNText style={{ color: 'white' }}>Score: {gameState.score}</RNText>
                <RNText style={{ color: 'white' }}>Metrics Score: {metricsScore}</RNText>
                <RNText style={{ color: 'white' }}>Obs: {gameState.obstacles.length}</RNText>
                <RNText style={{ color: 'white' }}>Started: {String(gameState.gameStarted)}</RNText>
                <RNText style={{ color: 'white', fontWeight: 'bold' }}>Distance: {Math.floor(gameState.distance)}</RNText>
                <RNText style={{ color: 'white' }}>Stage time: {Math.floor(gameState.elapsedSecInStage)}s</RNText>
                <RNText style={{ color: 'white', opacity: 0.8 }}>tick: {tick}</RNText>
                {/* Jump to a stage, so stages 2-4 can be checked without playing through. */}
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {STAGES.map((stage, i) => (
                        <Pressable
                            key={stage.id}
                            onPress={() => onJumpToStage(stage.id)}
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
                    onValueChange={onToggle}
                    trackColor={{ false: "#767577", true: "#ff00cc" }}
                    thumbColor={gameState.debugMode ? "#00ffff" : "#f4f3f4"}
                />
            </View>
        )}
    </>
);
