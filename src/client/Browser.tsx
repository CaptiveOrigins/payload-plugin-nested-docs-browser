'use client'

import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

import { chooseLayout, letterIndex, leavesOf, presentChildren, type Child, type Layout, type Thresholds } from '../core/index.js'

/** Every word the browser shows, so a site can translate them. `{n}`, `{of}` and `{noun}` are filled in. */
export const DEFAULT_TEXT = {
  leaves: 'species',
  leaf: 'species',
  children: 'groups',
  showingLargest: 'Showing the {n} largest of {of} {noun}',
  allOf: '{of} {noun}',
  showAll: 'Show all {of} {noun}',
  showFewer: 'Show fewer',
  sortLargest: 'Largest first',
  sortAz: 'A–Z',
  sortLabel: 'Sort',
  withLeaves: '{n} with species',
  emptyFold: '{n} with no species recorded',
  hiddenFold: '{n} hidden by default',
  includeHidden: 'Include fossils',
  hiddenNote: '{n} more {leaves} are hidden; include them with the switch.',
  where: 'Where you are',
  letters: 'Jump to a letter',
  lettersFor: 'Starting with {letter}: {n}',
  nothing: 'Nothing here yet.',
}
export type BrowserText = typeof DEFAULT_TEXT

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k in v ? String(v[k]) : `{${k}}`))
const fmt = (n: number) => new Intl.NumberFormat().format(n)

const S = {
  grid: (min: number): CSSProperties => ({ display: 'grid', gap: 16, gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`, marginTop: 16 }),
  card: { display: 'flex', flexDirection: 'column', gap: 6, padding: 18, border: '1px solid var(--ndb-line, #e5ddd6)', borderRadius: 14, background: 'var(--ndb-card, #fff)', color: 'inherit', textDecoration: 'none' } as CSSProperties,
  muted: { color: 'var(--ndb-muted, #6e5d57)' } as CSSProperties,
  bar: { height: 6, background: 'var(--ndb-track, #f1e9e2)', borderRadius: 3, overflow: 'hidden', marginTop: 4 } as CSSProperties,
  fillBar: (pct: number): CSSProperties => ({ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--ndb-accent, #cf8137)' }),
  pill: { display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', border: '1px solid var(--ndb-line, #e5ddd6)', borderRadius: 999, background: 'var(--ndb-card, #fff)', font: 'inherit', fontWeight: 600, color: 'inherit', cursor: 'pointer' } as CSSProperties,
  compact: { marginTop: 12, padding: '12px 16px', border: '1px solid var(--ndb-line, #e5ddd6)', borderRadius: 12, background: 'var(--ndb-card, #fff)' } as CSSProperties,
  cols: { listStyle: 'none', margin: '8px 0 0', padding: 0, columns: '3 15rem', columnGap: 28 } as CSSProperties,
  row: { breakInside: 'avoid', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--ndb-line-soft, #f1ebe6)', minHeight: 32 } as CSSProperties,
}

export type LinkLike = (props: { href: string; children: ReactNode; style?: CSSProperties; className?: string }) => ReactNode
const DefaultLink: LinkLike = ({ href, children, style, className }) => (
  <a href={href} style={style} className={className}>
    {children}
  </a>
)

/** One child as a card: image, everyday name over the system name, count and a share bar. */
function ChildCard({ c, of, text, Link, showHidden }: { c: Child; of: number; text: BrowserText; Link: LinkLike; showHidden: boolean }) {
  const n = leavesOf(c, showHidden)
  const body = (
    <>
      {c.image ? <img src={c.image} alt="" width={48} height={48} style={{ width: 48, height: 48, objectFit: 'contain' }} /> : null}
      <span style={{ fontWeight: 650 }}>{c.everyday || c.name}</span>
      {c.everyday ? <span style={{ ...S.muted, fontStyle: 'italic', fontSize: '.93em' }}>{c.name}</span> : null}
      {!c.isLeaf ? (
        <>
          <span style={{ ...S.muted, fontSize: '.93em' }}>
            {fmt(n)} {n === 1 ? text.leaf : text.leaves}
          </span>
          {of > 0 ? (
            <span style={S.bar} aria-hidden="true">
              <span style={S.fillBar(Math.max(1.5, Math.round((n / of) * 100)))} />
            </span>
          ) : null}
        </>
      ) : null}
    </>
  )
  return c.href ? (
    <Link href={c.href} style={S.card}>
      {body}
    </Link>
  ) : (
    <div style={S.card}>{body}</div>
  )
}

/** The compact list behind "Show all": several columns, sorted by size or A–Z, with empty records folded. */
export function CompactList({ items, empty = [], text, Link, showHidden = false, defaultSort = 'size' }: { items: Child[]; empty?: Child[]; text: BrowserText; Link?: LinkLike; showHidden?: boolean; defaultSort?: 'size' | 'az' }) {
  const [sort, setSort] = useState(defaultSort)
  const L = Link ?? DefaultLink
  const sorted = useMemo(() => [...items].sort(sort === 'az' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => leavesOf(b, showHidden) - leavesOf(a, showHidden) || a.name.localeCompare(b.name)), [items, sort, showHidden])
  const row = (c: Child) => (
    <li key={c.id} style={S.row}>
      {c.href ? <L href={c.href}>{c.everyday ? `${c.everyday} (${c.name})` : c.name}</L> : <span>{c.everyday ? `${c.everyday} (${c.name})` : c.name}</span>}
      <span style={{ ...S.muted, fontVariantNumeric: 'tabular-nums' }}>{c.isLeaf ? '' : fmt(leavesOf(c, showHidden))}</span>
    </li>
  )
  return (
    <div style={S.compact}>
      <div role="group" aria-label={text.sortLabel} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', ...S.muted, fontSize: '.9em' }}>
        {text.sortLabel}:
        {(['size', 'az'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} style={{ ...S.pill, minHeight: 36, fontWeight: 400, ...(sort === k ? { background: 'var(--ndb-ink, #3b2a26)', color: 'var(--ndb-on-ink, #fff)' } : {}) }}>
            {k === 'size' ? text.sortLargest : text.sortAz}
          </button>
        ))}
        <span>{fill(text.withLeaves, { n: fmt(items.length) })}</span>
      </div>
      <ul style={S.cols}>{sorted.map(row)}</ul>
      {empty.length ? (
        <details style={{ marginTop: 10 }}>
          <summary style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', ...S.muted }}>{fill(text.emptyFold, { n: fmt(empty.length) })}</summary>
          <ul style={S.cols}>{empty.map(row)}</ul>
        </details>
      ) : null}
    </div>
  )
}

/** "Show all": a button that opens the compact list in place. */
export function ShowAll({ items, empty, noun, text, Link, showHidden, label }: { items: Child[]; empty?: Child[]; noun: string; text: BrowserText; Link?: LinkLike; showHidden?: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} style={{ ...S.pill, marginTop: 12 }}>
        {open ? text.showFewer : (label ?? fill(text.showAll, { of: fmt(items.length + (empty?.length ?? 0)), noun }))}
      </button>
      <div id={id} hidden={!open}>
        {open ? <CompactList items={items} empty={empty} text={text} Link={Link} showHidden={showHidden} /> : null}
      </div>
    </div>
  )
}

export type BrowserProps = {
  /** From the browse endpoint or `browse()`: the level to show. */
  data: { node: { name: string; everyday?: string | null; path: string } | null; ancestors: { name: string; everyday?: string | null; href: string | null }[]; children: Child[] }
  /** The word for this level's children ("families", "genera"). */
  noun: string
  text?: Partial<BrowserText>
  thresholds?: Partial<Thresholds>
  /** Curated sections for a big level: a heading and the paths of the children in it. */
  sections?: { id: string; title: string; image?: string | null; paths: string[] }[]
  /** The site's link component (for example Next's), so links keep the site's routing. */
  Link?: LinkLike
  /** Breadcrumb link to the top, if any. */
  rootHref?: string | null
  /** Force a layout (otherwise it's chosen from the counts). */
  layout?: Layout
  /** Heading level for the node's name. */
  headingLevel?: 1 | 2
}

/**
 * One level of a large tree, laid out to suit how much is inside: a gallery for a few, a card grid for a
 * moderate number, sections or an A–Z index for many, and cards for leaves. Every shortened view has
 * "Show all", empty records are listed in their own fold, and hidden-by-default ones are behind a switch.
 */
export function NestedDocsBrowser({ data, noun, text: textIn, thresholds, sections, Link: LinkIn, rootHref, layout: forced, headingLevel = 1 }: BrowserProps) {
  const text = { ...DEFAULT_TEXT, ...textIn }
  const Link = LinkIn ?? DefaultLink
  const [showHidden, setShowHidden] = useState(false)
  const [letter, setLetter] = useState<string | null>(null)
  const layout = forced ?? chooseLayout(data.children, { hasSections: Boolean(sections?.length), thresholds })
  const firstShown = layout === 'leaves' ? 1000 : layout === 'gallery' ? 1000 : (thresholds?.firstShown ?? 12)
  const p = presentChildren(data.children, { showHidden, firstShown })
  const visible = [...p.first, ...p.rest]
  const total = visible.reduce((n, c) => n + leavesOf(c, showHidden), 0)
  const hiddenLeaves = data.children.reduce((n, c) => n + (c.hiddenLeaves ?? 0), 0)
  const H = headingLevel === 1 ? 'h1' : 'h2'
  const crumbs = data.ancestors.length || rootHref ? (
    <nav aria-label={text.where} style={{ ...S.muted, fontSize: '.95em', marginBottom: 8 }}>
      <ol style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6, margin: 0, padding: 0 }}>
        {data.ancestors.map((a, i) => (
          <li key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            {a.href ? (
              <Link href={a.href} style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center', color: 'inherit' }}>
                {a.everyday || a.name}
              </Link>
            ) : (
              a.everyday || a.name
            )}
          </li>
        ))}
      </ol>
    </nav>
  ) : null
  const cards = (items: Child[], min = 230) => (
    <div style={S.grid(min)}>
      {items.map((c) => (
        <ChildCard key={c.id} c={c} of={total} text={text} Link={Link} showHidden={showHidden} />
      ))}
    </div>
  )
  const byPath = new Map(visible.map((c) => [c.path, c]))

  return (
    <section>
      {crumbs}
      {data.node ? (
        <>
          <H style={{ margin: '4px 0 6px' }}>{data.node.everyday || data.node.name}</H>
          {data.node.everyday ? <p style={{ ...S.muted, fontStyle: 'italic', margin: 0 }}>{data.node.name}</p> : null}
        </>
      ) : null}
      <p style={{ ...S.muted, margin: '6px 0 0' }}>
        {fmt(total)} {total === 1 ? text.leaf : text.leaves}
        {layout !== 'leaves' ? ` · ${fill(text.allOf, { of: fmt(visible.length), noun })}` : ''}
      </p>
      {hiddenLeaves > 0 ? (
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', minHeight: 44, marginTop: 8 }}>
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} style={{ width: 20, height: 20 }} />
          {text.includeHidden} <span style={S.muted}>({fmt(hiddenLeaves)})</span>
        </label>
      ) : null}

      {visible.length === 0 ? <p>{text.nothing}</p> : null}

      {layout === 'gallery' || layout === 'leaves' ? cards(visible, layout === 'gallery' ? 280 : 220) : null}

      {layout === 'cards' ? (
        <>
          {cards(p.first)}
          {p.rest.length ? (
            <>
              <p style={{ ...S.muted, marginTop: 10 }}>{fill(text.showingLargest, { n: fmt(p.first.length), of: fmt(visible.length), noun })}</p>
              <ShowAll items={visible} empty={p.empty} noun={noun} text={text} Link={Link} showHidden={showHidden} />
            </>
          ) : p.empty.length ? (
            <ShowAll items={visible} empty={p.empty} noun={noun} text={text} Link={Link} showHidden={showHidden} />
          ) : null}
        </>
      ) : null}

      {layout === 'sections' && sections ? (
        <>
          {sections.map((s) => {
            const items = s.paths.map((path) => byPath.get(path)).filter((c): c is Child => Boolean(c))
            if (!items.length) return null
            const sp = presentChildren(items, { showHidden, firstShown: 8 })
            return (
              <div key={s.id} style={{ marginTop: 36 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.3em' }}>
                  {s.image ? <img src={s.image} alt="" width={40} height={40} /> : null}
                  {s.title}
                  <span style={{ ...S.muted, fontSize: '.75em', fontWeight: 400 }}>
                    {fmt(items.reduce((n, c) => n + leavesOf(c, showHidden), 0))} {text.leaves}
                  </span>
                </h2>
                {cards(sp.first)}
                {sp.rest.length ? <ShowAll items={[...sp.first, ...sp.rest]} noun={noun} text={text} Link={Link} showHidden={showHidden} /> : null}
              </div>
            )
          })}
          <div style={{ marginTop: 36 }}>
            <ShowAll items={visible} empty={p.empty} noun={noun} text={text} Link={Link} showHidden={showHidden} />
          </div>
        </>
      ) : null}

      {layout === 'index' || (layout === 'sections' && !sections) ? (
        <>
          {cards(p.first)}
          <p style={{ ...S.muted, marginTop: 10 }}>{fill(text.showingLargest, { n: fmt(p.first.length), of: fmt(visible.length), noun })}</p>
          <nav aria-label={text.letters} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
            {letterIndex([...visible, ...p.empty]).map(({ letter: l, count }) => (
              <button key={l} type="button" aria-pressed={letter === l} aria-label={fill(text.lettersFor, { letter: l, n: count })} onClick={() => setLetter(letter === l ? null : l)} style={{ ...S.pill, minWidth: 44, padding: '0 10px', borderRadius: 8, flexDirection: 'column', lineHeight: 1.1, ...(letter === l ? { background: 'var(--ndb-ink, #3b2a26)', color: 'var(--ndb-on-ink, #fff)' } : {}) }}>
                {l}
                <small style={{ fontWeight: 400, fontSize: '.72em' }}>{count}</small>
              </button>
            ))}
          </nav>
          {letter ? (
            <div aria-live="polite">
              <CompactList
                key={letter}
                items={visible.filter((c) => (c.name[0] ?? '').toUpperCase() === letter || (letter === '#' && !/[A-Z]/i.test(c.name[0] ?? '')))}
                empty={p.empty.filter((c) => (c.name[0] ?? '').toUpperCase() === letter)}
                text={text}
                Link={Link}
                showHidden={showHidden}
                defaultSort="az"
              />
            </div>
          ) : null}
          <ShowAll items={visible} empty={p.empty} noun={noun} text={text} Link={Link} showHidden={showHidden} />
        </>
      ) : null}

      {(layout === 'gallery' || layout === 'leaves') && p.empty.length ? <ShowAll items={[]} empty={p.empty} noun={noun} text={text} Link={Link} showHidden={showHidden} label={fill(text.emptyFold, { n: fmt(p.empty.length) })} /> : null}
    </section>
  )
}
