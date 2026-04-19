import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — generated at build time by drizzle-kit; loaded via babel-plugin-inline-import
import migrations from '../../drizzle/migrations';
import * as schema from './schema';

const DB_NAME = 'fadiapp.db';

const expo = openDatabaseSync(DB_NAME, { enableChangeListener: false });
expo.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expo, { schema, logger: __DEV__ });

export function useDbMigrations() {
  return useMigrations(db, migrations);
}

export type DB = typeof db;
