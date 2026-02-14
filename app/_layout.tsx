import '../src/skiaWasmPreload';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SkiaWrapper } from '../src/components/SkiaWrapper';
import { WasmGate } from '../src/components/WasmGate';

import { useColorScheme } from '@/hooks/use-color-scheme';

// On web, WasmGate waits for __SKIA_WASM_BINARY__ before rendering so no worklet/chunk
// can run before the main thread has the binary (avoids CanvasKit Aborted at ~segment 5).
export default function RootLayout() {
  return (
    <WasmGate>
      <SkiaWrapper>
        <RootLayoutContent />
      </SkiaWrapper>
    </WasmGate>
  );
}

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
