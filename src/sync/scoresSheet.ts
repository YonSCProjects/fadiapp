// Orchestrator for the "ניקוד תוכנית התנהגותית" Google Sheets file.
// One spreadsheet per teacher; one tab per class; one row per scored student
// per session. Append-only — never deletes. Tab is auto-created on first write
// for that class. Anyone-with-link reader permission set on first creation.

import { ensureRootFolder } from './drive';
import {
  addTab,
  appendRows,
  batchUpdate,
  createSpreadsheetInFolder,
  deleteTab,
  getSpreadsheet,
  grantAnyoneReader,
  shareUrlForSpreadsheet,
  writeRange,
} from './sheets';
import { getCurrentTeacher, setScoresSheetId } from '@/db/repos/teachers';

export const SHEET_TITLE_HE = 'ניקוד תוכנית התנהגותית';

// Column order is right-to-left visually, but the API takes left-to-right
// arrays. The `rightToLeft: true` sheet property handles the visual flip;
// the values themselves stay in this logical order.
export const HEADERS_HE = [
  'תאריך',
  'שם',
  "מס' שיעור",
  'כניסה',
  'שהייה',
  'ביצוע',
  'אווירה',
  'מטרה אישית',
  'בונוס',
  'סה"כ',
] as const;

export type ScoreSheetRow = {
  date: string;        // YYYY-MM-DD
  studentLabel: string;
  period: number;      // 1-5
  entry: number;
  attendance: number;
  execution: number;
  atmosphere: number;
  personal_goal: number;
  bonus: number;
};

function rowToValues(r: ScoreSheetRow): (string | number)[] {
  const total =
    r.entry + r.attendance + r.execution + r.atmosphere + r.personal_goal + r.bonus;
  return [
    r.date,
    r.studentLabel,
    r.period,
    r.entry,
    r.attendance,
    r.execution,
    r.atmosphere,
    r.personal_goal,
    r.bonus,
    total,
  ];
}

// Find or create the spreadsheet. Caches the id on the teacher row so we
// don't hit Drive every send. Returns the spreadsheet id.
export async function ensureScoresSheet(token: string): Promise<string> {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error('ensureScoresSheet: no teacher row');

  if (teacher.scores_sheet_id) {
    // Sanity-check the cached id; if Drive 404s, fall through to creation.
    try {
      await getSpreadsheet(token, teacher.scores_sheet_id);
      return teacher.scores_sheet_id;
    } catch (err) {
      // Stale cache — likely the user deleted the sheet manually. Recreate.
      if (!String(err).includes('404')) throw err;
    }
  }

  const folderId = await ensureRootFolder(token);
  const spreadsheetId = await createSpreadsheetInFolder(token, SHEET_TITLE_HE, folderId);

  // Brand-new spreadsheet ships with one default tab "Sheet1" that we don't
  // want. Find its id and queue a deletion alongside the share-permission set.
  const meta = await getSpreadsheet(token, spreadsheetId);
  const defaultTab = meta.sheets[0]?.properties;
  if (defaultTab) {
    // Can't delete the only tab in a spreadsheet — defer until at least one
    // class tab is added (we delete it inside ensureClassTab on first call).
    // Here we just mark that the default needs cleanup by leaving it.
  }

  await grantAnyoneReader(token, spreadsheetId);
  await setScoresSheetId(teacher.id, spreadsheetId);
  return spreadsheetId;
}

// Ensure a tab exists for the given class name. Creates with RTL + headers if
// missing. Also retires the default "Sheet1" the first time we add a real tab.
export async function ensureClassTab(
  token: string,
  spreadsheetId: string,
  className: string,
): Promise<void> {
  const meta = await getSpreadsheet(token, spreadsheetId);
  const existing = meta.sheets.find((s) => s.properties.title === className);
  if (existing) return;

  await addTab(token, spreadsheetId, className);
  await writeRange(token, spreadsheetId, className, 'A1:J1', [
    HEADERS_HE.slice() as unknown as string[],
  ]);

  // After we have at least one real tab, sweep away the default Sheet1
  // if it's still hanging around.
  const fresh = await getSpreadsheet(token, spreadsheetId);
  const defaultTab = fresh.sheets.find((s) => s.properties.title === 'Sheet1');
  if (defaultTab && fresh.sheets.length > 1) {
    await deleteTab(token, spreadsheetId, defaultTab.properties.sheetId);
  }

  // Bold the header row + freeze it so it stays visible while scrolling.
  const tab = fresh.sheets.find((s) => s.properties.title === className);
  if (tab) {
    await batchUpdate(token, spreadsheetId, [
      {
        repeatCell: {
          range: {
            sheetId: tab.properties.sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      },
      {
        updateSheetProperties: {
          properties: {
            sheetId: tab.properties.sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      },
    ]);
  }
}

export async function pushSessionRows(
  token: string,
  spreadsheetId: string,
  className: string,
  rows: ScoreSheetRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await ensureClassTab(token, spreadsheetId, className);
  await appendRows(
    token,
    spreadsheetId,
    className,
    rows.map(rowToValues),
  );
}

export function getShareUrl(spreadsheetId: string): string {
  return shareUrlForSpreadsheet(spreadsheetId);
}
