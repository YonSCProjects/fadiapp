import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Returns a safe paddingBottom value for ScrollView contentContainerStyle,
// accounting for the system nav bar / home indicator. The `extra` param is
// breathing room on top of the raw inset. 40 is roughly the height of a
// gesture-nav indicator plus a comfortable tap buffer.
export function useBottomInset(extra = 40): { paddingBottom: number } {
  const { bottom } = useSafeAreaInsets();
  return { paddingBottom: bottom + extra };
}
