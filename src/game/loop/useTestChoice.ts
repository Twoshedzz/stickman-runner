/**
 * The test build's choice on the title screen (step 12): which pace option, and which stage a
 * run starts on. Kept on this phone between runs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { PACE_OPTIONS, PaceOptionId } from '../pace';
import { STAGES } from '../stages';
import { GameState } from '../state';

const CHOICE_KEY = 'TEST_PACE_CHOICE';

export interface TestChoice {
    option: PaceOptionId;
    stageId: string;
}

export const useTestChoice = (stateRef: RefObject<GameState>) => {
    const [choice, setChoice] = useState<TestChoice>({ option: 'A', stageId: STAGES[0].id });
    const choiceRef = useRef(choice);

    /** A run about to start takes the choice. */
    const applyChoice = useCallback((state: GameState) => {
        state.paceOption = choiceRef.current.option;
        state.stageId = choiceRef.current.stageId;
    }, []);

    const change = useCallback((next: TestChoice, save = true) => {
        choiceRef.current = next;
        setChoice(next);
        // The title screen's waiting state takes it straight away.
        if (!stateRef.current.gameStarted) applyChoice(stateRef.current);
        if (save) AsyncStorage.setItem(CHOICE_KEY, JSON.stringify(next)).catch(() => {});
    }, [stateRef, applyChoice]);

    useEffect(() => {
        AsyncStorage.getItem(CHOICE_KEY).then((raw) => {
            if (!raw) return;
            const saved = JSON.parse(raw) as Partial<TestChoice>;
            change({
                option: PACE_OPTIONS.find((o) => o.id === saved.option)?.id ?? 'A',
                stageId: STAGES.find((s) => s.id === saved.stageId)?.id ?? STAGES[0].id,
            }, false);
        }).catch(() => {});
    }, [change]);

    const pickOption = useCallback((option: PaceOptionId) => change({ ...choiceRef.current, option }), [change]);
    const pickStartStage = useCallback((stageId: string) => change({ ...choiceRef.current, stageId }), [change]);

    return { choice, applyChoice, pickOption, pickStartStage };
};
