/** Small lookups about stages that the screen's pieces share: numbers, the next one, its music. */
import { DEFAULT_TRACK } from '../../hooks/musicTracks';
import { StageConfig, STAGES } from '../../game/stages';

/** 1 for the first stage (0 for an unknown id). */
export const stageNumber = (stageId: string) => STAGES.findIndex((s) => s.id === stageId) + 1;

/** The stage after this one, or undefined after the last. */
export const nextStage = (stageId: string): StageConfig | undefined => STAGES[stageNumber(stageId)];

/** The music for a stage. */
export const stageTrack = (stage: StageConfig) => stage.audio?.musicTrack || DEFAULT_TRACK;
