/**
 * Nested Docs Browser core: plain TypeScript, no Payload, no React. Decides how a level of a large
 * hierarchy is shown, without ever hiding part of it.
 */

/** One child of the node being shown. */
export type Child = {
  id: string
  /** Scientific or system name; always present. */
  name: string
  /** Everyday name, shown above `name` when there is one. */
  everyday?: string | null
  /** Materialized path of this child, e.g. `animalia/chordata/reptilia/squamata`. */
  path: string
  /** Leaves below it (for a taxonomy: species), counting only those shown by default. */
  leaves: number
  /** Leaves hidden by default below it (for example fossils). */
  hiddenLeaves?: number
  /** This child itself is hidden by default (for example a fossil family). */
  hidden?: boolean
  /** The child is itself a leaf (a species under a genus). */
  isLeaf?: boolean
  image?: string | null
  /** Words for the image ("No photo yet (tortoise)"); without them it's decorative. */
  imageAlt?: string | null
  /** Draw the image as a mask in the theme's image color (one-color icons, silhouettes) instead of as a picture. */
  imageMask?: boolean
  href?: string | null
}

export type Layout = 'gallery' | 'sections' | 'cards' | 'index' | 'leaves'

export type Thresholds = {
  /** Up to this many children: large gallery cards. */
  gallery: number
  /** Up to this many children: a card grid. Above it: sections (if defined) or an index. */
  cards: number
  /** How many children a card grid or index shows before "Show all". */
  firstShown: number
  /** Fewer than this many children: richer cards. */
  sparse: number
}

export const DEFAULT_THRESHOLDS: Thresholds = { gallery: 6, cards: 40, firstShown: 12, sparse: 4 }

/** The layout for a level, from what will actually be shown (after hiding and empties). */
export function chooseLayout(children: Child[], opts: { hasSections?: boolean; thresholds?: Partial<Thresholds> } = {}): Layout {
  const t = { ...DEFAULT_THRESHOLDS, ...opts.thresholds }
  const shown = children.filter((c) => !c.hidden && (c.isLeaf || c.leaves > 0))
  if (shown.length > 0 && shown.every((c) => c.isLeaf)) return 'leaves'
  if (shown.length <= t.gallery) return 'gallery'
  if (shown.length <= t.cards) return 'cards'
  return opts.hasSections ? 'sections' : 'index'
}

export type Presented = {
  /** Shown straight away, largest first. */
  first: Child[]
  /** Behind "Show all" (still visible children, beyond the first ones). */
  rest: Child[]
  /** No leaves at all: listed in their own fold, never dropped. */
  empty: Child[]
  /** Hidden by default (for example fossils): shown when the switch is on. */
  hidden: Child[]
  /** Everything, for the counts ("showing 12 of 58"). */
  total: number
}

/** Leaves a child shows: those shown by default, plus the hidden ones when the switch is on. */
export const leavesOf = (c: Child, showHidden = false) => c.leaves + (showHidden ? (c.hiddenLeaves ?? 0) : 0)

/**
 * Splits a level into what's shown first, what's behind "Show all", what's empty and what's hidden
 * by default. Every child lands in exactly one of the four, so nothing is ever lost.
 */
export function presentChildren(children: Child[], opts: { showHidden?: boolean; firstShown?: number } = {}): Presented {
  const firstShown = opts.firstShown ?? DEFAULT_THRESHOLDS.firstShown
  const show = Boolean(opts.showHidden)
  const size = (a: Child, b: Child) => leavesOf(b, show) - leavesOf(a, show) || a.name.localeCompare(b.name)
  const hidden: Child[] = []
  const empty: Child[] = []
  const visible: Child[] = []
  for (const c of children) {
    if (c.hidden && !show) hidden.push(c)
    else if (!c.isLeaf && leavesOf(c, show) === 0) empty.push(c)
    else visible.push(c)
  }
  visible.sort(size)
  empty.sort((a, b) => a.name.localeCompare(b.name))
  hidden.sort(size)
  return { first: visible.slice(0, firstShown), rest: visible.slice(firstShown), empty, hidden, total: children.length }
}

/**
 * Skips levels with a single child: given a chain of levels (each a node's children), returns how many
 * levels to descend so the page never shows one lone card. Stops at leaves.
 */
export function collapseSingleChild(levels: Child[][]): number {
  let skip = 0
  for (const level of levels) {
    const shown = level.filter((c) => !c.hidden && (c.isLeaf || c.leaves > 0))
    if (shown.length === 1 && !shown[0]!.isLeaf) skip++
    else break
  }
  return skip
}

/** The A–Z bar: letters with how many children start with each, in order. */
export function letterIndex(children: Child[]): { letter: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of children) {
    const letter = c.name.trim().charAt(0).toUpperCase() || '#'
    counts.set(/[A-Z]/.test(letter) ? letter : '#', (counts.get(/[A-Z]/.test(letter) ? letter : '#') ?? 0) + 1)
  }
  return [...counts].map(([letter, count]) => ({ letter, count })).sort((a, b) => (a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter.localeCompare(b.letter)))
}

/** A saved everyday group: whatever is under any `include` path, minus whatever is under any `exclude` path. */
export type GroupRule = { include: string[]; exclude?: string[] }

const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`)

/** Is this path in the group? */
export function inGroup(path: string, rule: GroupRule): boolean {
  return rule.include.some((r) => under(path, r)) && !(rule.exclude ?? []).some((r) => under(path, r))
}

/**
 * Which group each path belongs to, and which paths are in no group or in more than one, so a
 * curator can fix the rules. Only paths under `scope` are checked.
 */
export function groupMembership(paths: string[], groups: { id: string; rule: GroupRule }[], scope?: string): { byGroup: Record<string, string[]>; none: string[]; several: { path: string; groups: string[] }[] } {
  const byGroup: Record<string, string[]> = Object.fromEntries(groups.map((g) => [g.id, []]))
  const none: string[] = []
  const several: { path: string; groups: string[] }[] = []
  for (const p of paths) {
    if (scope && !under(p, scope)) continue
    const hits = groups.filter((g) => inGroup(p, g.rule)).map((g) => g.id)
    for (const h of hits) byGroup[h]!.push(p)
    if (hits.length === 0) none.push(p)
    else if (hits.length > 1) several.push({ path: p, groups: hits })
  }
  return { byGroup, none, several }
}

/** "Showing 12 of 58 families" style counts. */
export function showingLine(p: Presented, noun: string): string {
  const shown = p.first.length
  const of = p.first.length + p.rest.length
  return of > shown ? `Showing the ${shown} largest of ${of} ${noun}` : `${of} ${noun}`
}
