import '@/polyfills';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ensureRtl } from '@/i18n/rtl';
import { useDbMigrations } from '@/db/client';
import { importSeedKb } from '@/kb/importer';
import { ensureDefaultTeacherAndClass } from '@/db/repos/classes';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Must run at module load, before expo-router mounts, so that when the OAuth
// redirect reopens the app it lands back in the pending auth session instead
// of routing to /oauthredirect.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const theme = useTheme();
  const [rtlReady, setRtlReady] = useState(false);
  const [kbReady, setKbReady] = useState(false);
  const [kbError, setKbError] = useState<Error | null>(null);
  const { success: migrationsReady, error: migrationsError } = useDbMigrations();

  useEffect(() => {
    ensureRtl('he-IL').then(() => setRtlReady(true));
  }, []);

  useEffect(() => {
    if (!migrationsReady) return;
    (async () => {
      try {
        await ensureDefaultTeacherAndClass();
        const result = await importSeedKb();
        if (__DEV__) console.log('[kb] imported:', result);
        setKbReady(true);
      } catch (e) {
        setKbError(e as Error);
      }
    })();
  }, [migrationsReady]);

  if (migrationsError || kbError) {
    const err = migrationsError ?? kbError;
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: theme.bg.app,
        }}
      >
        <Text style={{ color: theme.status.danger }}>שגיאת טעינה: {String(err)}</Text>
      </View>
    );
  }

  if (!rtlReady || !migrationsReady || !kbReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.bg.app,
        }}
      >
        <ActivityIndicator color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.header.bg },
        headerTintColor: theme.header.tint,
        contentStyle: { backgroundColor: theme.bg.app },
      }}
    />
  );
}
