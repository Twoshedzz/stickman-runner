/** The HUD during a run: health, energy, score and stage, and the pause button when a pause is allowed. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EnergyBar } from '../../components/ui/EnergyBar';
import { HealthBar } from '../../components/ui/HealthBar';
import { PauseButton } from '../../components/ui/PauseButton';
import { ScoreDisplay } from '../../components/ui/ScoreDisplay';
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
    </View>
);

const styles = StyleSheet.create({
    hudArea: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'box-none',
    },
});
