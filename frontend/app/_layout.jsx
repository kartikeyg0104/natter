/**
 * Root layout: loads the fonts and the saved session, keeps the splash screen
 * up until both are ready, matches the system background to the theme and
 * guards the routes: signed out -> sign in; signed in -> the app.
 * The banner and the Diagnostics layer sit above every screen.
 */
// One import per weight, so only these font files are bundled.
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiagnosticsLayer } from '../src/components/diagnostics/DiagnosticsLayer';
import { Banner } from '../src/components/alerts/Banner';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { restoreSession, sessionStore } from '../src/store/sessionStore';
import { restoreSettings } from '../src/store/settingsStore';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useInboxChecker } from '../src/hooks/useInboxChecker';
import { useSocialSync } from '../src/hooks/useSocialSync';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const status = useStore(sessionStore, (state) => state.status);
  useInboxChecker();
  useSocialSync();
  const isSignedIn = status === 'signedIn';
  const isReady = (fontsLoaded || Boolean(fontError)) && status !== 'restoring';

  useEffect(() => {
    restoreSettings();
    restoreSession();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        {/* every animation follows the phone's "reduce motion" setting */}
        <ReducedMotionConfig mode={ReduceMotion.System} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
            </Stack.Protected>
            <Stack.Protected guard={isSignedIn}>
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="new-group" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="chat-info/[id]" />
              <Stack.Screen name="contact-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="profile-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="forward" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="add-members" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="starred" />
              <Stack.Screen name="archived" />
              <Stack.Screen name="blocked" />
              <Stack.Screen name="avatar-picker" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="snap" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="snap-view/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="status-new" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="status/[userId]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen
                name="image/[id]"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            </Stack.Protected>
          </Stack>
          <Banner />
          <DiagnosticsLayer />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
