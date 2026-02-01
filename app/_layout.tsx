import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SkiaWrapper } from '../src/components/SkiaWrapper';

import { useColorScheme } from '@/hooks/use-color-scheme';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <SkiaWrapper>
      <RootLayoutContent />
    </SkiaWrapper>
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
