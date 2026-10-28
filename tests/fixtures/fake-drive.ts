/**
 * In-memory stand-in for the Google Drive app folder, shared by unit tests
 * (as a fetch function) and browser tests (behind page.route).
 */
export interface FakeFile {
  id: string
  name: string
  type: string
  bytes: Uint8Array
  modifiedTime: string
}

export interface FakeResponse {
  status: number
  headers: Record<string, string>
  body: Uint8Array | string
}

const latin1 = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
const bytesOf = (text: string) =>
  Uint8Array.from(text, (char) => char.charCodeAt(0))

export class FakeDrive {
  files = new Map<string, FakeFile>()
  token = 'test-token'
  requests: string[] = []
  private next = 1

  byName(name: string) {
    return [...this.files.values()].find((file) => file.name === name)
  }

  handle(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: Uint8Array,
  ): FakeResponse {
    const json = (status: number, value: unknown): FakeResponse => ({
      status,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    })
    this.requests.push(`${method} ${url}`)
    const auth = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === 'authorization',
    )?.[1]
    if (auth !== `Bearer ${this.token}`) return json(401, { error: 'auth' })
    const { pathname, searchParams } = new URL(url)
    const id = /\/files\/([^/]+)$/.exec(pathname)?.[1]
    if (method === 'GET' && pathname === '/drive/v3/files')
      return json(200, {
        files: [...this.files.values()].map(({ id, name, modifiedTime }) => ({
          id,
          name,
          modifiedTime,
        })),
      })
    if (method === 'GET' && id && searchParams.get('alt') === 'media') {
      const file = this.files.get(decodeURIComponent(id))
      return file
        ? {
            status: 200,
            headers: { 'content-type': file.type },
            body: file.bytes,
          }
        : json(404, { error: 'missing' })
    }
    if (method === 'DELETE' && id) {
      this.files.delete(decodeURIComponent(id))
      return { status: 204, headers: {}, body: '' }
    }
    if (method === 'PATCH' && id) {
      const file = this.files.get(decodeURIComponent(id))
      if (!file) return json(404, { error: 'missing' })
      file.bytes = body
      file.modifiedTime = new Date().toISOString()
      return json(200, { id: file.id })
    }
    if (method === 'POST' && searchParams.get('uploadType') === 'multipart') {
      const type = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === 'content-type',
      )?.[1]
      const boundary = /boundary=(.+)$/.exec(type ?? '')?.[1]
      const text = latin1(body)
      const parts = text.split(`--${boundary}`)
      const meta = JSON.parse(parts[1].split('\r\n\r\n')[1].trim())
      const [head, ...rest] = parts[2].split('\r\n\r\n')
      const content = rest.join('\r\n\r\n').replace(/\r\n$/, '')
      const file: FakeFile = {
        id: `f${this.next++}`,
        name: meta.name,
        type: /Content-Type: (.+)/.exec(head)?.[1]?.trim() ?? '',
        bytes: bytesOf(content),
        modifiedTime: new Date().toISOString(),
      }
      this.files.set(file.id, file)
      return json(200, { id: file.id })
    }
    return json(400, { error: `unexpected ${method} ${url}` })
  }

  /** A fetch function for unit tests. */
  fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const body = init.body
      ? new Uint8Array(await new Response(init.body as BodyInit).arrayBuffer())
      : new Uint8Array()
    const response = this.handle(
      init.method ?? 'GET',
      url,
      (init.headers ?? {}) as Record<string, string>,
      body,
    )
    return new Response(
      response.status === 204 ? null : (response.body as BodyInit),
      { status: response.status, headers: response.headers },
    )
  }) as typeof fetch
}
