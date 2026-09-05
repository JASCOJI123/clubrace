/** Cursor pagination helper (spec §53). Returns { items, nextCursor }. */
export interface Pageable<T> {
  items: T[]
  nextCursor: string | null
}

/**
 * Calls `fn(cursor, take)` with LIMIT take+1 to detect a next page.
 * Cursor looks like `v1:<base64url>` so it survives JSON round-trips.
 */
export async function page<T>(opts: {
  cursor?: string
  take: number
  fetch: (cursor: string | null, take: number) => Promise<T[]>
  cursorOf: (item: T) => string
}): Promise<Pageable<T>> {
  const take = Math.max(1, Math.min(50, opts.take))
  const cursor = decodeCursor(opts.cursor)
  const rows = await opts.fetch(cursor, take + 1)
  const hasMore = rows.length > take
  const items = hasMore ? rows.slice(0, take) : rows
  const nextCursor = hasMore ? encodeCursor(opts.cursorOf(items[items.length - 1]!)) : null
  return { items, nextCursor }
}

function encodeCursor(value: string): string {
  return `v1:${Buffer.from(value).toString('base64url')}`
}

export function decodeCursor(cursor?: string): string | null {
  if (!cursor) return null
  const [, payload] = cursor.split(':')
  if (!payload) return null
  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}