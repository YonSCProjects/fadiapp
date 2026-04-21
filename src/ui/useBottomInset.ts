import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Returns a safe paddingBottom value for ScrollView contentContainerStyle,
// accounting for the system nav bar / home indicator. The `extra` param is
// breathing room on top of the raw inset.
export function useBottomInset(extra = 24): { paddingBottom: number } {
  const { bottom } = useSafeAreaInsets();
  return { paddingBottom: bottom + extra };
}
