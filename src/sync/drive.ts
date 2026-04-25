// Minimal Google Drive v3 REST wrapper, scoped to drive.file (app-created files only).
// Auth token is the teacher's OAuth access token, kept on-device only.

import { randomUUID } from 'expo-crypto';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const USERINFO = 'https://www.googleapis.com/oauth2/v2/userinfo';

export type UserInfo = { id: string; email: string; name: string };

export type DriveFile = {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType: string;
};

async function authed<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`drive ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function getUserInfo(token: string): Promise<UserInfo> {
  return authed<UserInfo>(token, USERINFO);
}

export async function listFiles(token: string, query: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,modifiedTime,mimeType)',
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
  });
  const res = await authed<{ files: DriveFile[] }>(token, `${DRIVE}/files?${params}`);
  return res.files;
}

export async function uploadJson(
  token: string,
  filename: string,
  data: unknown,
  parentFolderId?: string,
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name: filename,
    mimeType: 'application/json',
  };
  if (parentFolderId) metadata.parents = [parentFolderId];

  const boundary = `----fadiapp${randomUUID()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(data, null, 2)}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    `${UPLOAD}/files?uploadType=multipart&fields=id,name,modifiedTime,mimeType`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) {
    throw new Error(`drive upload ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as DriveFile;
}

// Fetches a file's metadata. Returns null if the file is gone (404). Includes
// the `trashed` flag — a trashed file still resolves via the Sheets API, so
// callers must check this rather than relying on a 404 to detect deletion.
export async function getFileMeta(
  token: string,
  fileId: string,
): Promise<(DriveFile & { trashed: boolean }) | null> {
  const res = await fetch(
    `${DRIVE}/files/${fileId}?fields=id,name,modifiedTime,mimeType,trashed`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`drive meta ${res.status}: ${await res.text()}`);
  return (await res.json()) as DriveFile & { trashed: boolean };
}

export async function downloadFileText(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE}/files/${fileId}?alt=media`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`drive download ${res.status}: ${await res.text()}`);
  return res.text();
}

export async function ensureRootFolder(token: string, name = 'FadiApp'): Promise<string> {
  const existing = await listFiles(
    token,
    `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
  );
  if (existing.length > 0) return existing[0]!.id;

  const created = await fetch(`${DRIVE}/files?fields=id`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!created.ok) throw new Error(`drive folder create ${created.status}`);
  const folder = (await created.json()) as { id: string };
  return folder.id;
}
