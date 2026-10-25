/** The stage number and name, shown at the start of each stage and then faded out. */
// Left out of the React Compiler, like the rest of the game screen: see GameScreen.tsx.
'use no memo';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FONT, glow, NEON } from '../../components/menu/menuStyle';
import { RNText } from '../../components/RNText';
import { stageById } from '../../game/stages';
import { stageNumber } from './stageInfo';
import { STAGE_BANNER_FADE_SEC, STAGE_BANNER_SEC } from './whichScreen';

export const StageBanner = ({ stageId, elapsedSec }: { stageId: string; elapsedSec: number }) => (
    <View
        style={[
            styles.stageBanner,
            {
                opacity: Math.min(1, Math.max(0,
                    (STAGE_BANNER_SEC + STAGE_BANNER_FADE_SEC - elapsedSec) / STAGE_BANNER_FADE_SEC
                )),
            },
        ]}
    >
        <RNText style={styles.stageBannerNumber}>
            STAGE {stageNumber(stageId)}
        </RNText>
        <RNText style={styles.stageBannerName}>
            {stageById(stageId).name}
        </RNText>
    </View>
);

const styles = StyleSheet.create({
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
});
