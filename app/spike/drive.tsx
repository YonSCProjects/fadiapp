import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  downloadFileText,
  ensureRootFolder,
  getUserInfo,
  listFiles,
  uploadJson,
  type UserInfo,
} from '@/sync/drive';
import { clearToken, loadToken, saveToken } from '@/sync/tokenStore';
import { he } from '@/i18n/he';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/drive.file',
];

const extra = (Constants.expoConfig?.extra ?? {}) as {
  googleClientIdAndroid?: string;
  googleClientIdIos?: string;
  googleClientIdWeb?: string;
};

export default function DriveSpike() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: extra.googleClientIdWeb,
    iosClientId: extra.googleClientIdIos,
    androidClientId: extra.googleClientIdAndroid,
    scopes: SCOPES,
  });

  useEffect(() => {
    loadToken().then((t) => {
      if (t) {
        setToken(t);
        getUserInfo(t).then(setUser).catch(() => clearToken().then(() => setToken(null)));
      }
    });
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      const t = response.authentication.accessToken;
      saveToken(t).then(() => setToken(t));
      getUserInfo(t).then(setUser).catch((e) => append(`userinfo error: ${e}`));
    } else if (response?.type === 'error') {
      append(`auth error: ${response.error?.description ?? response.error?.code ?? 'unknown'}`);
    }
  }, [response]);

  const append = (line: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${line}`]);

  async function doRoundTrip() {
    if (!token) return;
    setBusy(true);
    try {
      const folderId = await ensureRootFolder(token);
      append(`folder: ${folderId}`);

      const payload = {
        kind: 'spike',
        ts: new Date().toISOString(),
        note: 'בדיקת כתיבה וקריאה לתיקיית FadiApp',
      };
      const written = await uploadJson(token, `spike-${Date.now()}.json`, payload, folderId);
      append(`wrote: ${written.name} (${written.id})`);

      const files = await listFiles(
        token,
        `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
      );
      append(`listed: ${files.length} json file(s)`);

      const text = await downloadFileText(token, written.id);
      const ok = JSON.parse(text).note === payload.note;
      append(`read-back ${ok ? 'OK' : 'MISMATCH'}`);
    } catch (e) {
      append(`error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await clearToken();
    setToken(null);
    setUser(null);
    setLog([]);
  }

  const clientConfigured =
    extra.googleClientIdWeb && !extra.googleClientIdWeb.startsWith('REPLACE');

  return (
    <>
      <Stack.Screen options={{ title: he.driveSpike.title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.explainer}>{he.driveSpike.explainer}</Text>

        {!clientConfigured && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>
              עדיין לא הוגדרו Google OAuth client IDs ב-app.json. עיין ב-extra.googleClientId*.
            </Text>
          </View>
        )}

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>{he.driveSpike.signedInAs}</Text>
          <Text style={styles.statusValue}>
            {user ? `${user.name} (${user.email})` : he.driveSpike.notSignedIn}
          </Text>
        </View>

        <View style={styles.controls}>
          {!token ? (
            <Btn
              label={he.driveSpike.signIn}
              primary
              disabled={!request || !clientConfigured}
              onPress={() => promptAsync()}
            />
          ) : (
            <>
              <Btn
                label={busy ? '...' : `${he.driveSpike.write} → ${he.driveSpike.read}`}
                primary
                disabled={busy}
                onPress={doRoundTrip}
              />
              <Btn label={he.driveSpike.signOut} onPress={signOut} />
            </>
          )}
        </View>

        {busy && <ActivityIndicator color="#3b82f6" />}

        {log.length > 0 && (
          <View style={styles.logBox}>
            {log.map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function Btn({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, primary && styles.btnPrimary, disabled && styles.btnDisabled]}
    >
      <Text style={[styles.btnLabel, primary && styles.btnLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  explainer: { color: '#a0a0a8', lineHeight: 20 },
  warn: { backgroundColor: '#3a2a18', padding: 12, borderRadius: 8 },
  warnText: { color: '#f5d094' },
  statusBox: { backgroundColor: '#23232a', padding: 12, borderRadius: 8 },
  statusLabel: { color: '#a0a0a8', fontSize: 12 },
  statusValue: { color: '#f5f5f5', fontSize: 16, marginTop: 4 },
  controls: { gap: 8 },
  btn: { backgroundColor: '#23232a', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#3b82f6' },
  btnDisabled: { opacity: 0.5 },
  btnLabel: { color: '#f5f5f5', fontSize: 16, fontWeight: '600' },
  btnLabelPrimary: { color: '#fff' },
  logBox: { backgroundColor: '#0a0a10', padding: 12, borderRadius: 8, gap: 4 },
  logLine: { color: '#a0e0a0', fontFamily: 'Courier', fontSize: 12 },
});
