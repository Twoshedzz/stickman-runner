/** The HUD during a run: health, energy, score and stage, and the pause button when a pause is allowed. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { fillParent } from '../../components/fillParent';
import { FONT } from '../../components/menu/menuStyle';
import { RNText } from '../../components/RNText';
import { EnergyBar } from '../../components/ui/EnergyBar';
import { HealthBar } from '../../components/ui/HealthBar';
import { PauseButton } from '../../components/ui/PauseButton';
import { ScoreDisplay } from '../../components/ui/ScoreDisplay';
import { paceAt } from '../../game/pace';
import { canPause } from '../../game/pause';
import { stageById } from '../../game/stages';
import { GameState } from '../../game/state';
import { stageNumber } from './stageInfo';

interface Props {
    gameState: GameState;
    gameMetrics: { score: number; health: number; maxHealth: number; energy: number; streak: number };
    /** Room left for the notch and rounded corners, or null for none. */
    hudInsets: { left: number; right: number } | null;
    onPause: () => void;
}

export const GameHud = ({ gameState, gameMetrics, hudInsets, onPause }: Props) => (
    <View style={[styles.hudArea, hudInsets]}>
        <HealthBar health={gameMetrics.health} maxHealth={gameMetrics.maxHealth} />
        <EnergyBar energy={gameMetrics.energy} />
        <ScoreDisplay
            score={gameMetrics.score}
            stageNumber={stageNumber(gameState.stageId)}
            streak={gameMetrics.streak}
            colour={stageById(gameState.stageId).theme.pickupColors.glow}
        />
        {canPause(gameState) && <PauseButton onPress={onPause} />}
        <RNText style={styles.paceTag}>
            {gameState.paceOption} {'·'} {paceAt(gameState.paceOption, stageById(gameState.stageId), gameState.stageProgress).toFixed(2)}×
        </RNText>
    </View>
);

const styles = StyleSheet.create({
    hudArea: {
        ...fillParent,
        pointerEvents: 'box-none',
    },
    // The test build's option and pace: small, down on the floor, clear of everything you dodge.
    paceTag: {
        position: 'absolute',
        bottom: 5,
        right: 20,
        fontFamily: FONT.bold,
        fontSize: 11,
        letterSpacing: 1,
        color: 'rgba(255, 255, 255, 0.6)',
        pointerEvents: 'none',
    },
});
