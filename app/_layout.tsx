import '@/polyfills';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ensureRtl } from '@/i18n/rtl';
import { useDbMigrations } from '@/db/client';
import { importSeedKb } from '@/kb/importer';

// Must run at module load, before expo-router mounts, so that when the OAuth
// redirect reopens the app it lands back in the pending auth session instead
// of routing to /oauthredirect.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [rtlReady, setRtlReady] = useState(false);
  const [kbReady, setKbReady] = useState(false);
  const [kbError, setKbError] = useState<Error | null>(null);
  const { success: migrationsReady, error: migrationsError } = useDbMigrations();

  useEffect(() => {
    ensureRtl('he-IL').then(() => setRtlReady(true));
  }, []);

  useEffect(() => {
    if (!migrationsReady) return;
    importSeedKb()
      .then((result) => {
        if (__DEV__) console.log('[kb] imported:', result);
        setKbReady(true);
      })
      .catch((e: unknown) => setKbError(e as Error));
  }, [migrationsReady]);

  if (migrationsError || kbError) {
    const err = migrationsError ?? kbError;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#ff8a8a' }}>שגיאת טעינה: {String(err)}</Text>
      </View>
    );
  }

  if (!rtlReady || !migrationsReady || !kbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#f5f5f5',
          contentStyle: { backgroundColor: '#0f0f10' },
        }}
      />
    </SafeAreaProvider>
  );
}
