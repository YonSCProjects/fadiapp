import * as FileSystem from 'expo-file-system';
import type { RunnerState } from './wallClock';

const FILE = `${FileSystem.documentDirectory}runner-spike.json`;

export async function saveRunner(state: RunnerState): Promise<void> {
  await FileSystem.writeAsStringAsync(FILE, JSON.stringify(state));
}

export async function loadRunner(): Promise<RunnerState | null> {
  const info = await FileSystem.getInfoAsync(FILE);
  if (!info.exists) return null;
  try {
    const raw = await FileSystem.readAsStringAsync(FILE);
    return JSON.parse(raw) as RunnerState;
  } catch {
    return null;
  }
}

export async function clearRunner(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FILE);
  if (info.exists) await FileSystem.deleteAsync(FILE);
}
