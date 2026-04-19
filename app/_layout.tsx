import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ensureRtl } from '@/i18n/rtl';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureRtl('he-IL').then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#f5f5f5',
        contentStyle: { backgroundColor: '#0f0f10' },
      }}
    />
  );
}
