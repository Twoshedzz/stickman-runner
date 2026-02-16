/**
 * Re-export of React Native's Text, captured at module load time.
 * Use this instead of Text from 'react-native' in UI that can render after
 * Skia/CanvasKit loads on web, to avoid "Failed to construct 'Text'" when
 * the global Text is shadowed by the DOM constructor.
 */
import { Text } from 'react-native';
export const RNText = Text;
