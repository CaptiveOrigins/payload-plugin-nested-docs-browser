import type { Where } from 'payload'
import { validOperatorSet } from 'payload/shared'

/**
 * Only an answer of exactly `true` passes. Anything else is a no: `false`, a truthy value such as `1`, `'yes'` or an
 * object, and an error thrown or rejected (so a broken check refuses with a 403, never a 500).
 */
export async function exactlyTrue(check: () => unknown): Promise<boolean> {
  try {
    return (await check()) === true
  } catch {
    return false
  }
}

const plain = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0

/**
 * A well-formed, non-empty Payload query: every key is `and`/`or` with a list of queries, or a field with an object
 * of known operators. Payload quietly skips a malformed constraint (`{ field: false }`), which would match every row,
 * so anything else is not a query.
 */
export function isWhere(w: unknown): w is Where {
  if (!plain(w)) return false
  return Object.entries(w).every(([key, value]) =>
    key === 'and' || key === 'or'
      ? Array.isArray(value) && value.length > 0 && value.every(isWhere)
      : plain(value) && Object.keys(value).every((op) => validOperatorSet.has(op as never)),
  )
}

/**
 * A Payload access answer read strictly: exactly `true`, a well-formed query (which the caller must apply), or
 * `false` for everything else, a thrown error included. An empty or malformed object is a no: it would match every row.
 */
export async function trueOrWhere(check: () => unknown): Promise<true | Where | false> {
  try {
    const answer = await check()
    if (answer === true) return true
    if (isWhere(answer)) return answer
    return false
  } catch {
    return false
  }
}
