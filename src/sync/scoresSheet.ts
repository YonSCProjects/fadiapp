// Orchestrator for the "ניקוד תוכנית התנהגותית" Google Sheets file.
// One spreadsheet per teacher; one tab per class; one row per scored student
// per session. Append-only — never deletes. Tab is auto-created on first write
// for that class. Anyone-with-link reader permission set on first creation.

import { ensureRootFolder, getFileMeta, listFiles } from './drive';
import {
  addTab,
  batchUpdate,
  clearRange,
  createSpreadsheetInFolder,
  deleteTab,
  getRange,
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
//
// Recovery order: cached id → existing-by-name in the FadiApp folder → fresh
// create. Persists the id immediately after creation so a downstream Sheets-
// API failure (e.g., the API not yet enabled) doesn't orphan the file and
// cause a second orphan on the next attempt.
export async function ensureScoresSheet(token: string): Promise<string> {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error('ensureScoresSheet: no teacher row');

  if (teacher.scores_sheet_id) {
    // Use the Drive API (not Sheets) for the validity check: a trashed file
    // still returns 200 from the Sheets API, but Drive flags it via `trashed`.
    // If the file is gone or in the trash, we fall through to recreate.
    const meta = await getFileMeta(token, teacher.scores_sheet_id);
    if (meta && !meta.trashed) {
      return teacher.scores_sheet_id;
    }
  }

  const folderId = await ensureRootFolder(token);

  // Adopt an existing spreadsheet with this name in our folder if one is
  // already there (e.g., from an earlier run that created the file but failed
  // to persist the id). Drive query escapes single quotes by doubling them.
  const escapedTitle = SHEET_TITLE_HE.replace(/'/g, "\\'");
  const existing = await listFiles(
    token,
    `name='${escapedTitle}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`,
  );
  if (existing.length > 0) {
    const adoptedId = existing[0]!.id;
    await setScoresSheetId(teacher.id, adoptedId);
    await grantAnyoneReader(token, adoptedId);
    return adoptedId;
  }

  const spreadsheetId = await createSpreadsheetInFolder(token, SHEET_TITLE_HE, folderId);
  // Persist the id RIGHT AWAY so a Sheets-API failure below doesn't orphan
  // this file and force a fresh create on retry.
  await setScoresSheetId(teacher.id, spreadsheetId);
  await grantAnyoneReader(token, spreadsheetId);
  return spreadsheetId;
}

// Ensure a tab exists for the given class name. Creates with RTL + headers if
// missing. Also retires the default "Sheet1" the first time we add a real tab.
// Returns the numeric sheetId, which downstream batchUpdate calls (borders,
// row inserts) need.
export async function ensureClassTab(
  token: string,
  spreadsheetId: string,
  className: string,
): Promise<number> {
  const meta = await getSpreadsheet(token, spreadsheetId);
  const existing = meta.sheets.find((s) => s.properties.title === className);
  if (existing) return existing.properties.sheetId;

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

  const tab = fresh.sheets.find((s) => s.properties.title === className);
  if (!tab) throw new Error(`ensureClassTab: tab "${className}" missing after create`);

  // Bold the header row + freeze it so it stays visible while scrolling.
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

  return tab.properties.sheetId;
}

// Push a session's rows into the class tab. Edit-on-resend semantics: if rows
// already exist for this (date, period), they're replaced in place — the
// surrounding sessions slide up or down as needed so there are no gaps.
//
// After the write, applies a thick bottom border to the last row of every
// session block so visually distinct sessions are easy to spot in the sheet.
export async function pushSessionRows(
  token: string,
  spreadsheetId: string,
  className: string,
  rows: ScoreSheetRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const sheetId = await ensureClassTab(token, spreadsheetId, className);

  const sessionDate = rows[0]!.date;
  const sessionPeriod = rows[0]!.period;
  const newBlock = rows.map(rowToValues);

  // Read everything below the header row.
  const existing = await getRange(token, spreadsheetId, className, 'A2:J');

  // Locate any existing block for this (date, period). The block is the
  // contiguous run of rows where col A === date AND col C === period; we wrote
  // them in this contiguous shape, and our edit logic preserves that.
  let blockStart = -1;
  let blockEnd = -1;
  for (let i = 0; i < existing.length; i++) {
    const r = existing[i]!;
    if (r[0] === sessionDate && String(r[2]) === String(sessionPeriod)) {
      if (blockStart === -1) blockStart = i;
      blockEnd = i + 1;
    } else if (blockStart !== -1) {
      break;
    }
  }

  // Compose the new body in memory. Replace the matched block (or append if
  // none), then write the whole body back, padding with blank rows when the
  // body shrunk to overwrite stale cells.
  const previousLen = existing.length;
  const nextBody: (string | number)[][] =
    blockStart === -1
      ? [...existing, ...newBlock]
      : [...existing.slice(0, blockStart), ...newBlock, ...existing.slice(blockEnd)];

  // If the body shrank, pad with empties so the previously-occupied tail
  // gets overwritten with blanks (Sheets values.update only writes the rows
  // we send; longer-than-data values get truncated only via clear).
  if (nextBody.length < previousLen) {
    await clearRange(token, spreadsheetId, className, `A2:J${1 + previousLen}`);
  }

  if (nextBody.length > 0) {
    await writeRange(
      token,
      spreadsheetId,
      className,
      `A2:J${1 + nextBody.length}`,
      nextBody,
    );
  }

  await applyBatchSeparators(token, spreadsheetId, sheetId, nextBody);
}

// Walks the body, finds session boundaries (where date or period changes
// from the previous row), and applies a thick bottom border on each batch's
// last row. Clears all body borders first so this stays idempotent across
// edits that shrink, grow, or reorder sessions.
async function applyBatchSeparators(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  body: (string | number)[][],
): Promise<void> {
  const requests: object[] = [];

  // Step 1 — overwrite every border in a generous range (1000 rows) with
  // a thin "gridline-color" border. This wipes any previous thick session
  // separators (style:NONE doesn't reliably do that, and it also kills the
  // default Sheets gridlines for those cells). A thin SOLID border at the
  // gridline color (~#dadce0) looks visually identical to the default
  // gridlines while ensuring our thick separators don't linger after
  // sessions shift up or down.
  const GRIDLINE = { red: 0.855, green: 0.871, blue: 0.89 };
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: 1 + Math.max(body.length, 1000),
        startColumnIndex: 0,
        endColumnIndex: 10,
      },
      cell: {
        userEnteredFormat: {
          borders: {
            top: { style: 'SOLID', color: GRIDLINE },
            bottom: { style: 'SOLID', color: GRIDLINE },
            left: { style: 'SOLID', color: GRIDLINE },
            right: { style: 'SOLID', color: GRIDLINE },
          },
        },
      },
      fields: 'userEnteredFormat.borders',
    },
  });

  if (body.length === 0) {
    await batchUpdate(token, spreadsheetId, requests);
    return;
  }

  // Step 2 — paint a thick gray bottom border on each session-end row.
  for (let i = 0; i < body.length; i++) {
    const isLast = i === body.length - 1;
    const nextDifferent =
      !isLast &&
      (body[i + 1]![0] !== body[i]![0] || String(body[i + 1]![2]) !== String(body[i]![2]));
    if (isLast || nextDifferent) {
      requests.push({
        updateBorders: {
          range: {
            sheetId,
            startRowIndex: 1 + i,
            endRowIndex: 1 + i + 1,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
          bottom: {
            style: 'SOLID_THICK',
            color: { red: 0.3, green: 0.3, blue: 0.3 },
          },
        },
      });
    }
  }

  await batchUpdate(token, spreadsheetId, requests);
}

export function getShareUrl(spreadsheetId: string): string {
  return shareUrlForSpreadsheet(spreadsheetId);
}
