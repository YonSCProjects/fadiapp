import { I18nManager } from 'react-native';

const RTL_LOCALES = ['he', 'ar', 'fa', 'ur'];

export function isRtlLocale(locale: string): boolean {
  const lang = locale.toLowerCase().split(/[-_]/)[0] ?? '';
  return RTL_LOCALES.includes(lang);
}

// On Android, a first-launch switch from LTR → RTL (or back) only takes visual
// effect after the app is closed and reopened. For the Week 0 spike this is
// acceptable; when we add OTA updates (expo-updates / EAS Update) we can call
// Updates.reloadAsync() here to make it seamless.
export async function ensureRtl(locale: string): Promise<{ reloadRequired: boolean }> {
  const wantRtl = isRtlLocale(locale);
  if (I18nManager.isRTL === wantRtl) return { reloadRequired: false };

  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);
  return { reloadRequired: true };
}
