import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The web page around the game (web only; the phone app doesn't use this).
 *
 * Mostly about saving the game to a phone's home screen: the icon, the name under it,
 * opening full screen without the browser bars, and stopping the page itself from zooming,
 * scrolling or bouncing when you tap and swipe to play.
 */
export default function Root({ children }: PropsWithChildren) {
    // Since SDK 58 the page's own scripts and styles come from here, and must be placed below:
    // without them the page is only its "Loading…" shell and the game never starts.
    const { htmlAttributes, headNodes, bodyAttributes, bodyNodes } = useServerDocumentContext();
    return (
        <html lang="en" {...htmlAttributes}>
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
                />
                {/* viewport-fit=cover: run edge to edge on iPhones, instead of leaving bars either
                    side of the notch. The score and health bars are kept clear of it (src/screens/game/useViewport.ts). */}
                <title>Stickman Runner</title>

                {/* Home screen: icon, name, and opening full screen like an app */}
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                <meta name="apple-mobile-web-app-title" content="Stickman Runner" />
                <meta name="theme-color" content="#0f0c29" />

                <ScrollViewStyleReset />
                <style dangerouslySetInnerHTML={{ __html: pageStyle }} />
                {headNodes}
            </head>
            <body {...bodyAttributes}>
                {children}
                {bodyNodes}
            </body>
        </html>
    );
}

/** Stop taps and swipes from zooming, scrolling, selecting text or bouncing the page. */
const pageStyle = `
html, body {
    background-color: #0f0c29;
    overscroll-behavior: none;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
}`;
