// Minimal Google Sheets v4 + Drive v3 wrapper for the scores spreadsheet.
// Operates on app-created files only (drive.file scope is sufficient).

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE = 'https://www.googleapis.com/drive/v3';

async function authedJson<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`sheets ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type SheetTab = { sheetId: number; title: string };

export type SpreadsheetMeta = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheets: { properties: SheetTab }[];
};

// Creates a Google Sheets file in the given Drive folder via the Drive API.
// Returns the new spreadsheet's id; caller can then call getSpreadsheet for
// metadata or directly use the id with the Sheets API.
export async function createSpreadsheetInFolder(
  token: string,
  name: string,
  parentFolderId: string,
): Promise<string> {
  const res = await fetch(`${DRIVE}/files?fields=id`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [parentFolderId],
    }),
  });
  if (!res.ok) throw new Error(`sheets create ${res.status}: ${await res.text()}`);
  const file = (await res.json()) as { id: string };
  return file.id;
}

export async function getSpreadsheet(
  token: string,
  spreadsheetId: string,
): Promise<SpreadsheetMeta> {
  return authedJson<SpreadsheetMeta>(
    token,
    `${SHEETS}/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,sheets.properties(sheetId,title)`,
  );
}

// batchUpdate is the workhorse for sheet structure changes (add tabs, set RTL,
// rename, delete the default Sheet1, etc.). Pass an array of request objects
// per the Sheets API spec.
export async function batchUpdate(
  token: string,
  spreadsheetId: string,
  requests: object[],
): Promise<void> {
  await authedJson<unknown>(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

// Adds a new tab with a Hebrew title and rightToLeft layout. Returns the new
// tab's sheetId (numeric, used for further mutations).
export async function addTab(
  token: string,
  spreadsheetId: string,
  title: string,
): Promise<number> {
  const res = await authedJson<{
    replies: Array<{ addSheet?: { properties: { sheetId: number; title: string } } }>;
  }>(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: { title, rightToLeft: true },
          },
        },
      ],
    }),
  });
  const sheetId = res.replies[0]?.addSheet?.properties.sheetId;
  if (sheetId === undefined) throw new Error('addTab: missing sheetId in response');
  return sheetId;
}

export async function deleteTab(
  token: string,
  spreadsheetId: string,
  sheetId: number,
): Promise<void> {
  await batchUpdate(token, spreadsheetId, [{ deleteSheet: { sheetId } }]);
}

// Writes the header row (A1:J1) of the given tab. Caller passes the tab
// title (sheet name); the Sheets values API resolves it to a range.
export async function writeRange(
  token: string,
  spreadsheetId: string,
  tabTitle: string,
  range: string, // e.g. "A1:J1"
  values: (string | number)[][],
): Promise<void> {
  const escapedTitle = encodeURIComponent(`'${tabTitle.replace(/'/g, "''")}'`);
  const fullRange = encodeURIComponent(`!${range}`);
  const url =
    `${SHEETS}/${spreadsheetId}/values/${escapedTitle}${fullRange}` +
    `?valueInputOption=USER_ENTERED`;
  await authedJson<unknown>(token, url, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  });
}

export async function appendRows(
  token: string,
  spreadsheetId: string,
  tabTitle: string,
  values: (string | number)[][],
): Promise<void> {
  const escapedTitle = encodeURIComponent(`'${tabTitle.replace(/'/g, "''")}'`);
  const url =
    `${SHEETS}/${spreadsheetId}/values/${escapedTitle}!A1:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await authedJson<unknown>(token, url, {
    method: 'POST',
    body: JSON.stringify({ values }),
  });
}

// Grants "anyone with the link can view" permission on the file. Idempotent —
// if the permission already exists Google returns 200 with the existing one.
export async function grantAnyoneReader(token: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ type: 'anyone', role: 'reader' }),
  });
  if (!res.ok) {
    throw new Error(`sheets grant ${res.status}: ${await res.text()}`);
  }
}

export function shareUrlForSpreadsheet(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;
}
