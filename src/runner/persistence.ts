import { File, Paths } from 'expo-file-system';
import type { RunnerState } from './wallClock';

const FILENAME = 'runner-spike.json';

function runnerFile(): File {
  return new File(Paths.document, FILENAME);
}

export async function saveRunner(state: RunnerState): Promise<void> {
  runnerFile().write(JSON.stringify(state));
}

export async function loadRunner(): Promise<RunnerState | null> {
  const f = runnerFile();
  if (!f.exists) return null;
  try {
    const raw = await f.text();
    return JSON.parse(raw) as RunnerState;
  } catch {
    return null;
  }
}

export async function clearRunner(): Promise<void> {
  const f = runnerFile();
  if (f.exists) f.delete();
}
