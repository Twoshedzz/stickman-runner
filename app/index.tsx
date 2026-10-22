import Head from 'expo-router/head';

import { GameScreen } from '../src/screens/GameScreen';

export default function HomeScreen() {
    return (
        <>
            {/* The browser tab's title on web; does nothing in the phone app. */}
            <Head>
                <title>Stickman Runner</title>
            </Head>
            <GameScreen />
        </>
    );
}
