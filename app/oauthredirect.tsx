import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Fallback route. When Chrome's Custom Tab catches the redirect and returns
// to the pending auth session, this route is never hit. It only renders if
// Android routed the redirect to a fresh app instance; in that case we
// complete the session (in case it is resumable) and bounce back to the
// Drive spike so the user can try again without seeing expo-router's
// "Unmatched Route" page.
export default function OAuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    router.replace('/spike/drive');
  }, [router]);
  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
