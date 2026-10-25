// Left out of the React Compiler (on for the app in app.json). The game screen and its pieces in
// ./game/ read the game state object while drawing, and that object changes every frame without
// React being told, so they must run in full each frame; the compiler would reuse old output
// whenever the object itself is the same one, and the screen would show stale state.
'use no memo';

import React, { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';
import { HowToPlayScreen } from '../components/menu/HowToPlayScreen';
import { InitialsScreen } from '../components/menu/InitialsScreen';
import { LoadingScreen } from '../components/menu/LoadingScreen';
import { PausedScreen } from '../components/menu/PausedScreen';
import { FinishedScreen, GameOverScreen, StageClearScreen } from '../components/menu/ResultScreens';
import { TitleScreen } from '../components/menu/TitleScreen';
import { WorldScoresScreen } from '../components/menu/WorldScoresScreen';
import { useGameLoop } from '../game/loop/useGameLoop';
import { stageById } from '../game/stages';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { DebugPanel } from './game/DebugPanel';
import { GameHud } from './game/GameHud';
import { ResumeCountdown } from './game/ResumeCountdown';
import { RotatePrompt } from './game/RotatePrompt';
import { RunInputLayer } from './game/RunInputLayer';
import { StageBanner } from './game/StageBanner';
import { nextStage, stageNumber } from './game/stageInfo';
import { useGameLoading } from './game/useGameLoading';
import { usePauseControls } from './game/usePauseControls';
import { useRunInput } from './game/useRunInput';
import { useStageMusic } from './game/useStageMusic';
import { isTouchWeb, useViewport } from './game/useViewport';
import { useWebKeyboard } from './game/useWebKeyboard';
import { useWorldScoreFlow } from './game/useWorldScoreFlow';
import { Screen, whichScreens } from './game/whichScreen';

// Lazy load GameCanvas to ensure Skia is initialized before import (on Web)
const GameCanvas = React.lazy(() =>
    import('../components/GameCanvas').then(module => ({ default: module.GameCanvas }))
);

/**
 * The game: the canvas, the layer that takes taps and swipes, and the screens over it. Each
 * job lives in its own piece in ./game/; this file puts them together. The order the hooks
 * are called in is the order their effects run, so keep it.
 */
export const GameScreen = () => {
    const { fixedPreview, needsRotate, viewWidth, viewHeight, scale, translateX, translateY, hudInsets } = useViewport();
    const { gameState, gameMetrics, onJump, onDuck, onDuckRelease, restartGame, tick, highScore, scoreTable, newScoreIndex, toggleDebugMode, onContinue, jumpToStage, pauseGame, resumeGame, quitToTitle, setMusicClock } = useGameLoop();
    const { playMusic, stopMusic, pauseMusic, resumeMusic, musicPosition, preloadTrack } = useBackgroundMusic();
    const [showInstructions, setShowInstructions] = React.useState(false);

    const { pauseRun, resumeRun } = usePauseControls({ gameState, pauseGame, resumeGame, setMusicClock, pauseMusic, resumeMusic, musicPosition });
    const { world, enterInitials, worldResult, worldScreen, myPlace, ownKeysOpenRef, submitInitials, skipInitials, browseWorld, closeWorld } = useWorldScoreFlow(gameState);
    const { readyToStart, musicReady, musicPercent, nextMusicPercent, onAssetsReady } = useGameLoading({ stageId: gameState.stageId, showContinue: gameState.showContinue, preloadTrack });
    const { handleInteraction, duckGesture, touchHandlers } = useRunInput({ gameState, onJump, onDuck, onDuckRelease });
    const { quitRun, playAgain, startGame, continueToNextStage, jumpToStageWithMusic } = useStageMusic({ gameState, playMusic, stopMusic, restartGame, quitToTitle, onContinue, jumpToStage, setShowInstructions, handleInteraction });
    useWebKeyboard({ gameState, onJump, onDuck, onDuckRelease, pauseRun, resumeRun, playAgain, showInstructions, ownKeysOpenRef });

    const screens = whichScreens(gameState, { readyToStart, showInstructions, enteringInitials: enterInitials !== null, worldScreen });
    const shows = (screen: Screen) => screens.includes(screen);
    const openHowToPlay = () => setShowInstructions(true);
    const stage = stageById(gameState.stageId);
    const stageNo = stageNumber(gameState.stageId);

    return (
        <View style={[styles.container, fixedPreview && styles.containerWeb]}>
            <View
                style={[
                    styles.scaledGameWrapper,
                    {
                        width: viewWidth,
                        height: viewHeight,
                        transform: fixedPreview ? undefined : [
                            { translateX },
                            { translateY },
                            { scale },
                        ],
                    },
                ]}
            >
                <View style={[styles.gameContainer, { width: viewWidth, height: viewHeight }]}>
                {/* 1. Rendering Layer */}
                <View style={styles.renderLayer}>
                    <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#87CEEB' }} />}>
                        <GameCanvas gameState={gameState} tick={tick} viewWidth={viewWidth} onAssetsReady={onAssetsReady} />
                    </Suspense>
                </View>

                {/* 2. Input Layer - Transparent; no tap when Continue modal is showing so music doesn’t restart */}
                <RunInputLayer
                    touchWeb={isTouchWeb}
                    disabled={gameState.showContinue}
                    duckGesture={duckGesture}
                    onTap={handleInteraction}
                    touchHandlers={touchHandlers}
                />

                {/* 3. UI Overlay: the screens that show (see whichScreen.ts), later ones on top */}
                <View style={styles.uiLayer}>
                    {shows('loading') && (
                        <LoadingScreen
                            label={musicReady ? 'GET READY...' : `LOADING MUSIC ${musicPercent}%`}
                            percent={musicReady ? undefined : musicPercent}
                        />
                    )}
                    {shows('title') && (
                        <TitleScreen
                            hiScore={highScore}
                            scoreTable={scoreTable}
                            worldEntries={world.available ? world.entries : null}
                            onStart={startGame}
                            onHowToPlay={openHowToPlay}
                            onWorldScores={browseWorld}
                        />
                    )}
                    {/* The world top 10, with this run's entry lit up if it's on there */}
                    {shows('worldScores') && (
                        <WorldScoresScreen
                            entries={world.entries}
                            highlight={myPlace}
                            world={worldScreen === 'entered' ? worldResult : null}
                            offline={world.status === 'offline'}
                            doneLabel={worldScreen === 'entered' ? 'CONTINUE' : 'BACK'}
                            onDone={closeWorld}
                        />
                    )}
                    {shows('stageBanner') && <StageBanner stageId={gameState.stageId} elapsedSec={gameState.elapsedSecInStage} />}
                    {shows('hud') && <GameHud gameState={gameState} gameMetrics={gameMetrics} hudInsets={hudInsets} onPause={pauseRun} />}
                    {shows('countdown') && <ResumeCountdown gameState={gameState} />}
                    {shows('paused') && (
                        <PausedScreen
                            stageNumber={stageNo}
                            stageName={stage.name}
                            score={gameState.score}
                            onResume={resumeRun}
                            onHowToPlay={openHowToPlay}
                            onQuit={quitRun}
                        />
                    )}
                    {/* Made the world top 10: initials first, then the end screen */}
                    {shows('initials') && enterInitials && (
                        <InitialsScreen
                            score={enterInitials.score}
                            initials={world.lastInitials}
                            keyboard={fixedPreview}
                            onSubmit={submitInitials}
                            onSkip={skipInitials}
                        />
                    )}
                    {shows('finished') && (
                        <FinishedScreen
                            score={gameState.score}
                            scoreTable={scoreTable}
                            newScoreIndex={newScoreIndex}
                            world={worldResult}
                            onPlayAgain={playAgain}
                        />
                    )}
                    {shows('gameOver') && (
                        <GameOverScreen
                            score={gameState.score}
                            hiScore={highScore}
                            newHiScore={gameState.score > 0 && newScoreIndex === 0}
                            world={worldResult}
                            onPlayAgain={playAgain}
                            onHowToPlay={openHowToPlay}
                            onWorldScores={browseWorld}
                        />
                    )}
                    {shows('howToPlay') && <HowToPlayScreen keyboard={fixedPreview} onBack={() => setShowInstructions(false)} />}
                    <DebugPanel
                        gameState={gameState}
                        metricsScore={gameMetrics.score}
                        tick={tick}
                        showStats={shows('debug')}
                        onJumpToStage={jumpToStageWithMusic}
                        onToggle={toggleDebugMode}
                    />
                    {shows('stageClear') && (
                        <StageClearScreen
                            stageNumber={stageNo}
                            score={gameState.score}
                            nextStageNumber={stageNo + 1}
                            nextStageName={(nextStage(gameState.stageId) ?? stage).name}
                            nextMusicPercent={nextMusicPercent}
                            onContinue={continueToNextStage}
                        />
                    )}
                </View>
                </View>
            </View>
            {needsRotate && <RotatePrompt />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
        overflow: 'hidden',
    },
    containerWeb: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scaledGameWrapper: {
        position: 'absolute',
        left: 0,
        top: 0,
    },
    gameContainer: {
        backgroundColor: '#000',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#444',
    },
    renderLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
        backgroundColor: '#000',
    },
    uiLayer: {
        ...StyleSheet.absoluteFillObject,
        // Taps pass through to the jump layer except on buttons. This has to live here in the
        // stylesheet: on web, 'box-none' written inline is silently dropped, and the overlay
        // then swallows every tap, so tapping never jumped.
        pointerEvents: 'box-none',
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
