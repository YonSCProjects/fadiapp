import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';

const RTL_LOCALES = ['he', 'ar', 'fa', 'ur'];

export function isRtlLocale(locale: string): boolean {
  const lang = locale.toLowerCase().split(/[-_]/)[0] ?? '';
  return RTL_LOCALES.includes(lang);
}

export async function ensureRtl(locale: string): Promise<void> {
  const wantRtl = isRtlLocale(locale);
  if (I18nManager.isRTL === wantRtl) return;

  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);

  if (Platform.OS === 'android') {
    try {
      await Updates.reloadAsync();
    } catch {
    }
  }
}
