/**
 * Minimal Google Drive REST client for the hidden app folder
 * („appDataFolder“): only this app can see its files there.
 */

export const DRIVE_API = 'https://www.googleapis.com/drive/v3'
export const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

export class DriveAuthError extends Error {}

export interface DriveFile {
  id: string
  name: string
  modifiedTime: string
}

async function call(
  token: string,
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  let response: Response
  try {
    response = await fetcher(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error(
      'Google Drive ist gerade nicht erreichbar. Prüfe die Internetverbindung.',
    )
  }
  if (response.status === 401)
    throw new DriveAuthError('Die Google-Anmeldung ist abgelaufen.')
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      /storageQuotaExceeded|quota/i.test(text) && response.status === 403
        ? 'Dein Google-Drive-Speicher ist voll. Der Abgleich ist pausiert.'
        : `Google Drive hat den Abgleich abgelehnt (${response.status}). Bitte später erneut versuchen.`,
    )
  }
  return response
}

export async function listAppFiles(
  token: string,
  fetcher?: typeof fetch,
): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let page = ''
  do {
    const params = new URLSearchParams({
      spaces: 'appDataFolder',
      pageSize: '1000',
      fields: 'nextPageToken,files(id,name,modifiedTime)',
      ...(page ? { pageToken: page } : {}),
    })
    const data = await (
      await call(token, `${DRIVE_API}/files?${params}`, {}, fetcher)
    ).json()
    files.push(...(data.files ?? []))
    page = data.nextPageToken ?? ''
  } while (page)
  return files
}

export async function downloadFile(
  token: string,
  id: string,
  fetcher?: typeof fetch,
): Promise<Blob> {
  return (
    await call(
      token,
      `${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media`,
      {},
      fetcher,
    )
  ).blob()
}

/** Creates a file in the app folder or replaces the content of `id`. */
export async function uploadFile(
  token: string,
  name: string,
  blob: Blob,
  id?: string,
  fetcher?: typeof fetch,
): Promise<string> {
  const type = blob.type || 'application/octet-stream'
  // Simple uploads are limited to 5 MB; larger files use a resumable session.
  if (blob.size > 4 * 1024 * 1024) {
    const session = await call(
      token,
      id
        ? `${DRIVE_UPLOAD}/files/${encodeURIComponent(id)}?uploadType=resumable`
        : `${DRIVE_UPLOAD}/files?uploadType=resumable&fields=id`,
      {
        method: id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': type,
        },
        body: JSON.stringify(id ? {} : { name, parents: ['appDataFolder'] }),
      },
      fetcher,
    )
    const location = session.headers.get('Location')
    if (!location)
      throw new Error('Google Drive hat den Upload nicht gestartet.')
    const data = await (
      await call(
        token,
        location,
        { method: 'PUT', headers: { 'Content-Type': type }, body: blob },
        fetcher,
      )
    ).json()
    return id ?? data.id
  }
  if (id) {
    await call(
      token,
      `${DRIVE_UPLOAD}/files/${encodeURIComponent(id)}?uploadType=media`,
      { method: 'PATCH', headers: { 'Content-Type': type }, body: blob },
      fetcher,
    )
    return id
  }
  const boundary = `mystyle-${crypto.randomUUID()}`
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({ name, parents: ['appDataFolder'] }),
    `\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ])
  const data = await (
    await call(
      token,
      `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      },
      fetcher,
    )
  ).json()
  return data.id
}

export async function deleteFile(
  token: string,
  id: string,
  fetcher?: typeof fetch,
): Promise<void> {
  await call(
    token,
    `${DRIVE_API}/files/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    fetcher,
  )
}
