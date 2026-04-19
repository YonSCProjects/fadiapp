import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { activities, type ActivityCategory, type ActivityEnvironment } from '@/db/schema';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const activitiesSeed = require('../../assets/kb/activities_seed.json') as ActivitiesSeedFile;

export type ActivitiesSeedFile = {
  version: number;
  activities: Array<{
    source_ref: string;
    name_he: string;
    name_en?: string;
    category: ActivityCategory;
    environment: ActivityEnvironment;
    equipment_json: string[];
    min_space_m2: number;
    tags_json: string[];
    difficulty: number;
    cues_he?: string;
    safety_he?: string;
  }>;
};

// Idempotent: uses source_ref as the unique key. Safe to re-run after every
// app launch; new seed entries added to the JSON appear on next boot, existing
// ones get their mutable fields refreshed (name_he, cues, difficulty).
export async function importSeedKb(): Promise<{ inserted: number; updated: number }> {
  const existingRows = await db
    .select({ source_ref: activities.source_ref })
    .from(activities);
  const existing = new Set(
    existingRows.map((r) => r.source_ref).filter((x): x is string => !!x),
  );

  let inserted = 0;
  let updated = 0;

  await db.transaction(async (tx) => {
    for (const a of activitiesSeed.activities) {
      if (existing.has(a.source_ref)) {
        await tx
          .update(activities)
          .set({
            name_he: a.name_he,
            name_en: a.name_en,
            category: a.category,
            environment: a.environment,
            equipment_json: a.equipment_json,
            min_space_m2: a.min_space_m2,
            tags_json: a.tags_json,
            difficulty: a.difficulty,
            cues_he: a.cues_he,
            safety_he: a.safety_he,
            updated_at: new Date(),
            sync_rev: sql`${activities.sync_rev} + 1`,
          })
          .where(sql`${activities.source_ref} = ${a.source_ref}`);
        updated += 1;
      } else {
        await tx.insert(activities).values({
          source_ref: a.source_ref,
          name_he: a.name_he,
          name_en: a.name_en,
          category: a.category,
          environment: a.environment,
          equipment_json: a.equipment_json,
          min_space_m2: a.min_space_m2,
          tags_json: a.tags_json,
          difficulty: a.difficulty,
          cues_he: a.cues_he,
          safety_he: a.safety_he,
        });
        inserted += 1;
      }
    }
  });

  return { inserted, updated };
}
