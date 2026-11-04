import React from 'react';
import { Platform } from 'react-native';
import { saveBeforeCrash } from '../game/loop/crashSave';
import { CrashScreen, reloadPage } from './CrashScreen';

const isWeb = Platform.OS === 'web';

/**
 * Anything that breaks while the game draws ends here, on the web and in the phone app, rather
 * than in a blank screen. The high score is saved first. A web page can reload itself; the phone
 * app has no way to, so it builds the game afresh.
 */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError = () => ({ hasError: true });
    componentDidCatch(error: unknown) {
        console.warn('The game crashed:', error);
        saveBeforeCrash();
    }
    /** For a crash React doesn't see for itself. */
    trip() {
        saveBeforeCrash();
        this.setState({ hasError: true });
    }
    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <CrashScreen
                title="THE GAME STOPPED"
                message="SOMETHING WENT WRONG AND THE GAME HAD TO STOP. YOUR HIGH SCORE IS SAVED."
                buttonLabel={isWeb ? 'RELOAD' : 'TRY AGAIN'}
                onPress={isWeb ? reloadPage : () => this.setState({ hasError: false })}
            />
        );
    }
}
