import type { Payload } from 'payload'

import { groupMembership, inGroup, type Child, type GroupRule } from './core/index.js'
import type { BrowserOptions, Described } from './types.js'

type Lean = Record<string, unknown> & { _id: unknown }
type Model = {
  find: (q: object, projection?: object) => { lean: () => Promise<Lean[]> }
  findOne: (q: object) => { lean: () => Promise<Lean | null> }
  aggregate: (pipeline: object[]) => Promise<{ _id: string; n: number }[]>
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const depthOf = (path: string) => (path ? path.split('/').length : 0)

/** The collection's raw model: one aggregation counts every child's leaves at once (MongoDB adapter). */
function modelOf(payload: Payload, slug: string): Model {
  const model = (payload.db as unknown as { collections?: Record<string, Model> }).collections?.[slug]
  if (!model) throw new Error(`Nested Docs Browser needs the MongoDB adapter and a collection "${slug}".`)
  return model
}

/**
 * Small per-process cache; cleared when the collection or the groups change. It holds at most `CACHE_MAX` entries
 * (the oldest goes first) and never keeps a miss, so requests for made-up paths can't make it grow.
 */
export const CACHE_MAX = 500
const cache = new Map<string, { at: number; value: unknown }>()
export const clearBrowseCache = () => cache.clear()
/** How many entries the cache holds now (for tests and monitoring). */
export const browseCacheSize = () => cache.size
export async function cached<T>(key: string, ttlMs: number, make: () => Promise<T>, keep: (value: T) => boolean = () => true): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T
  const value = await make()
  cache.delete(key)
  if (!keep(value)) return value
  while (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
  cache.set(key, { at: Date.now(), value })
  return value
}

const describe = (o: BrowserOptions, doc: Lean): Described => {
  const d = o.describe?.(doc) ?? {}
  return { name: d.name ?? String(doc[o.labelField ?? 'name'] ?? ''), everyday: d.everyday ?? null, image: d.image ?? null, imageAlt: d.imageAlt ?? null, imageMask: Boolean(d.imageMask) }
}

const hides = (o: BrowserOptions) => Boolean(o.hideByDefault && ('notEquals' in o.hideByDefault || 'equals' in o.hideByDefault))
/** Is a document hidden by default? With `notEquals`, anything without the value (missing included) is hidden. */
const isHidden = (o: BrowserOptions, doc: Lean) => {
  const h = o.hideByDefault
  if (!h) return false
  return 'notEquals' in h ? doc[h.field] !== h.notEquals : doc[h.field] === h.equals
}
/** The same test inside an aggregation. */
const hiddenExpr = (o: BrowserOptions) => {
  const h = o.hideByDefault!
  const field = '$' + h.field
  return 'notEquals' in h ? { $ne: [{ $ifNull: [field, null] }, h.notEquals] } : { $eq: [field, h.equals] }
}
const isLeaf = (o: BrowserOptions, doc: Lean) => doc[o.leaf.field] === o.leaf.equals

/**
 * Leaves under each child of `root`, split into shown-by-default and hidden-by-default, leaving out
 * anything under an `exclude` path. One aggregation.
 */
async function leafCounts(o: BrowserOptions, model: Model, root: string, exclude: string[]): Promise<{ shown: Map<string, number>; hidden: Map<string, number> }> {
  const pf = o.pathField ?? 'path'
  const segment = depthOf(root) // index of the child segment in the split path
  const match: Record<string, unknown> = {
    ...(o.filter ?? {}),
    [o.leaf.field]: o.leaf.equals,
    [pf]: root ? { $regex: `^${escape(root)}/` } : { $exists: true },
  }
  const notUnder = exclude.map((e) => ({ [pf]: { $not: new RegExp(`^${escape(e)}(/|$)`) } }))
  const rows = await model.aggregate([
    { $match: notUnder.length ? { $and: [match, ...notUnder] } : match },
    { $project: { child: { $arrayElemAt: [{ $split: [`$${pf}`, '/'] }, segment] }, hidden: hides(o) ? hiddenExpr(o) : { $literal: false } } },
    { $group: { _id: { child: '$child', hidden: '$hidden' }, n: { $sum: 1 } } },
  ] as object[])
  const shown = new Map<string, number>()
  const hidden = new Map<string, number>()
  for (const r of rows as unknown as { _id: { child: string; hidden: boolean }; n: number }[]) (r._id.hidden ? hidden : shown).set(r._id.child, r.n)
  return { shown, hidden }
}

/** The direct children of `root` as `Child` records, with their leaf counts. */
async function childrenUnder(payload: Payload, o: BrowserOptions, root: string, exclude: string[] = []): Promise<Child[]> {
  const model = modelOf(payload, o.collection)
  const pf = o.pathField ?? 'path'
  const docs = await model.find({ ...(o.filter ?? {}), [pf]: { $regex: root ? `^${escape(root)}/[^/]+$` : '^[^/]+$' } }).lean()
  const { shown, hidden } = await leafCounts(o, model, root, exclude)
  const seg = depthOf(root)
  return docs
    .filter((d) => !exclude.some((e) => inGroup(String(d[pf]), { include: [e] })))
    .map((d) => {
      const path = String(d[pf])
      const key = path.split('/')[seg]!
      const leaf = isLeaf(o, d)
      const doc = describe(o, d)
      return {
        id: String(d._id),
        name: doc.name,
        everyday: doc.everyday,
        image: doc.image,
        imageAlt: doc.imageAlt,
        imageMask: doc.imageMask,
        path,
        href: o.href ? o.href(path) : null,
        isLeaf: leaf,
        // A leaf counts itself; anything else counts the leaves under it.
        leaves: leaf ? (isHidden(o, d) ? 0 : 1) : (shown.get(key) ?? 0),
        hiddenLeaves: leaf ? (isHidden(o, d) ? 1 : 0) : (hidden.get(key) ?? 0),
        // A leaf follows its own flag. A branch is hidden only when it shows no leaves and is flagged itself or
        // holds only hidden leaves; a branch with leaves to show is never hidden, whatever its own flag says.
        hidden: leaf ? isHidden(o, d) : (shown.get(key) ?? 0) === 0 && (isHidden(o, d) || (hidden.get(key) ?? 0) > 0),
      }
    })
}

export type BrowseResult = {
  node: { path: string; name: string; everyday: string | null; image: string | null } | null
  ancestors: { path: string; name: string; everyday: string | null; href: string | null }[]
  children: Child[]
}

/** One level of the tree: the node, its ancestors (for the breadcrumb) and its children with counts. */
export function browse(payload: Payload, o: BrowserOptions, path: string): Promise<BrowseResult> {
  const clean = path.replace(/^\/+|\/+$/g, '')
  return cached(`node:${o.collection}:${clean}`, o.cacheMs ?? 300_000, async () => {
    const model = modelOf(payload, o.collection)
    const pf = o.pathField ?? 'path'
    const parts = clean ? clean.split('/') : []
    const prefixes = parts.map((_, i) => parts.slice(0, i + 1).join('/'))
    const docs = prefixes.length ? await model.find({ ...(o.filter ?? {}), [pf]: { $in: prefixes } }).lean() : []
    const byPath = new Map(docs.map((d) => [String(d[pf]), d]))
    const self = clean ? byPath.get(clean) : undefined
    if (clean && !self) return { node: null, ancestors: [], children: [] }
    return {
      node: self ? { path: clean, ...describe(o, self) } : { path: '', name: o.rootLabel ?? 'All', everyday: null, image: null },
      ancestors: prefixes.slice(0, -1).flatMap((p) => {
        const d = byPath.get(p)
        if (!d) return []
        const { name, everyday, image } = describe(o, d)
        return [{ path: p, name, everyday, image, href: o.href ? o.href(p) : null }]
      }),
      children: await childrenUnder(payload, o, clean),
    }
  }, (r) => r.node !== null)
}

export type Group = { id: string; name: string; description: string | null; image: string | null; order: number; rule: GroupRule }

/** The saved everyday groups, with their rules as paths. */
export async function groups(payload: Payload, o: BrowserOptions): Promise<Group[]> {
  const slug = (o.groups && o.groups.slug) || 'nested-groups'
  const pf = o.pathField ?? 'path'
  const { docs } = await payload.find({ collection: slug as never, depth: 1, limit: 500, sort: 'order', overrideAccess: true, pagination: false })
  const pathOf = (v: unknown) => (v && typeof v === 'object' ? String((v as Record<string, unknown>)[pf] ?? '') : '')
  return (docs as unknown as Record<string, unknown>[]).map((g) => ({
    id: String(g.id),
    name: String(g.name ?? ''),
    description: (g.description as string | null) ?? null,
    image: (g.image && typeof g.image === 'object' ? ((g.image as { url?: string }).url ?? null) : (g.imageUrl as string | null)) ?? null,
    order: Number(g.order ?? 0),
    rule: { include: ((g.include as unknown[]) ?? []).map(pathOf).filter(Boolean), exclude: ((g.exclude as unknown[]) ?? []).map(pathOf).filter(Boolean) },
  }))
}

/** Every group with its leaf counts, for the landing page. */
export function groupsOverview(payload: Payload, o: BrowserOptions): Promise<(Group & { leaves: number; hiddenLeaves: number })[]> {
  return cached(`groups:${o.collection}`, o.cacheMs ?? 300_000, async () => {
    const model = modelOf(payload, o.collection)
    const out = []
    for (const g of await groups(payload, o)) {
      let leaves = 0
      let hiddenLeaves = 0
      for (const root of g.rule.include) {
        const { shown, hidden } = await leafCounts(o, model, root.split('/').slice(0, -1).join('/'), g.rule.exclude ?? [])
        const key = root.split('/').at(-1)!
        leaves += shown.get(key) ?? 0
        hiddenLeaves += hidden.get(key) ?? 0
      }
      out.push({ ...g, leaves, hiddenLeaves })
    }
    return out
  })
}

/** A group's page: the children of each included branch, minus excluded branches, merged. */
export function browseGroup(payload: Payload, o: BrowserOptions, id: string): Promise<{ group: Group; children: Child[] } | null> {
  return cached(`group:${o.collection}:${id}`, o.cacheMs ?? 300_000, async () => {
    const group = (await groups(payload, o)).find((g) => g.id === id)
    if (!group) return null
    const children: Child[] = []
    for (const root of group.rule.include) children.push(...(await childrenUnder(payload, o, root, group.rule.exclude ?? [])))
    return { group, children }
  }, (r) => r !== null)
}

/** For curators: leaves under `scope` that are in no group, or in more than one. */
export async function groupCheck(payload: Payload, o: BrowserOptions, scope?: string) {
  const model = modelOf(payload, o.collection)
  const pf = o.pathField ?? 'path'
  const leaves = await model.find({ ...(o.filter ?? {}), [o.leaf.field]: o.leaf.equals, ...(scope ? { [pf]: { $regex: `^${escape(scope)}/` } } : {}) }, { [pf]: 1 }).lean()
  const gs = await groups(payload, o)
  const m = groupMembership(leaves.map((l) => String(l[pf])), gs, scope)
  return { checked: leaves.length, none: m.none, several: m.several }
}
