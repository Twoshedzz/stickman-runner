import '../src/skiaWasmPreload';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { RNText } from '../src/components/RNText';
import { WasmGate } from '../src/components/WasmGate';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Lazy load SkiaWrapper so the CanvasKit chunk is only requested after WASM is ready (avoids Aborted in segment 4/5).
const SkiaWrapper = React.lazy(() =>
  import('../src/components/SkiaWrapper').then((m) => ({ default: m.SkiaWrapper }))
);

// On web, do not mount the app until __SKIA_WASM_PROMISE__ has resolved so no chunk eval runs before the binary is set.
function useWasmWarm() {
  const [warm, setWarm] = React.useState(false);
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      setWarm(true);
      return;
    }
    const g = globalThis as { __SKIA_WASM_BINARY__?: Uint8Array; __SKIA_WASM_PROMISE__?: Promise<Uint8Array> };
    if (g.__SKIA_WASM_BINARY__) {
      setWarm(true);
      return;
    }
    const p = g.__SKIA_WASM_PROMISE__;
    if (p) p.then(() => setWarm(true)).catch(() => setWarm(true));
    else setWarm(true);
  }, []);
  return warm;
}

export default function RootLayout() {
  const warm = useWasmWarm();
  if (!warm) return <MinimalLoading />;
  return (
    <WasmGate>
      <React.Suspense fallback={<MinimalLoading />}>
        <SkiaWrapper>
          <RootLayoutContent />
        </SkiaWrapper>
      </React.Suspense>
    </WasmGate>
  );
}

function MinimalLoading() {
  return (
    <View style={styles.minimalLoading}>
      <RNText style={styles.minimalLoadingText}>Loading…</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  minimalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  minimalLoadingText: {
    color: '#fff',
    fontFamily: 'system-ui',
  },
});

function RootLayoutContent() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <>
        <StatusBar style="dark" hidden={true} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </>
    </ThemeProvider>
  );
}
