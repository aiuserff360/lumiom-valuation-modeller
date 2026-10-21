// Tiny immutable path helpers. Paths are dot-separated, e.g. "revenue.newCustomers.3".

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const clone = (node: unknown, depth: number): unknown => {
    if (depth === keys.length) return value
    const key = keys[depth]
    if (Array.isArray(node)) {
      const next = node.slice()
      next[Number(key)] = clone(node[Number(key)], depth + 1)
      return next
    }
    const src = (node ?? {}) as Record<string, unknown>
    return { ...src, [key]: clone(src[key], depth + 1) }
  }
  return clone(obj, 0) as T
}
