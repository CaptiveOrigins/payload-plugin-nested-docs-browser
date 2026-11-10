'use client'

import { useId, useMemo, useState, type ReactNode } from 'react'

import { chooseLayout, letterIndex, leavesOf, presentChildren, type Child, type Layout, type Thresholds } from '../core/index.js'
import { NDB_STYLES } from './styles.js'

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

/** Every element that can be styled, by slot name. Pass `classNames` to add your own classes to any of them. */
export type Slot =
  | 'root' | 'crumbs' | 'crumbsList' | 'crumb' | 'crumbLink' | 'title' | 'systemName' | 'summary' | 'switch' | 'switchInput' | 'switchCount'
  | 'showing' | 'grid' | 'card' | 'cardImage' | 'cardName' | 'cardSystemName' | 'cardCount' | 'cardBar' | 'cardBarFill'
  | 'button' | 'showAll' | 'showAllButton' | 'compact' | 'compactTools' | 'compactSort' | 'compactList' | 'compactRow' | 'compactName' | 'compactCount'
  | 'compactEmpty' | 'compactEmptySummary' | 'letters' | 'lettersButton' | 'lettersCount' | 'section' | 'sectionTitle' | 'sectionCount' | 'sectionImage' | 'nothing'
export type ClassNames = Partial<Record<Slot, string>>

const BASE: Record<Slot, string> = {
  root: 'ndb', crumbs: 'ndb__crumbs', crumbsList: 'ndb__crumbs-list', crumb: 'ndb__crumb', crumbLink: 'ndb__crumb-link', title: 'ndb__title',
  systemName: 'ndb__system-name', summary: 'ndb__summary', switch: 'ndb__switch', switchInput: 'ndb__switch-input', switchCount: 'ndb__switch-count',
  showing: 'ndb__showing', grid: 'ndb__grid', card: 'ndb-card', cardImage: 'ndb-card__image', cardName: 'ndb-card__name', cardSystemName: 'ndb-card__system-name',
  cardCount: 'ndb-card__count', cardBar: 'ndb-card__bar', cardBarFill: 'ndb-card__bar-fill', button: 'ndb-button', showAll: 'ndb-showall', showAllButton: 'ndb-showall__button',
  compact: 'ndb-compact', compactTools: 'ndb-compact__tools', compactSort: 'ndb-compact__sort', compactList: 'ndb-compact__list', compactRow: 'ndb-compact__row',
  compactName: 'ndb-compact__name', compactCount: 'ndb-compact__count', compactEmpty: 'ndb-compact__empty', compactEmptySummary: 'ndb-compact__empty-summary',
  letters: 'ndb-letters', lettersButton: 'ndb-letters__button', lettersCount: 'ndb-letters__count', section: 'ndb-section', sectionTitle: 'ndb-section__title',
  sectionCount: 'ndb-section__count', sectionImage: 'ndb-section__image', nothing: 'ndb__nothing',
}

/** Class names for a slot: its stable `ndb-*` class (left out when unstyled), plus any the site passed. */
type Cx = (slot: Slot, ...extra: (string | false | null | undefined)[]) => string
const makeCx =
  (classNames: ClassNames = {}, unstyled = false): Cx =>
  (slot, ...extra) =>
    [unstyled ? null : BASE[slot], classNames[slot], ...extra].filter(Boolean).join(' ')

/** The share bucket a count falls in, for styling by size (`data-share="large"`). */
const shareOf = (n: number, of: number) => (of <= 0 ? 'none' : n / of >= 0.25 ? 'large' : n / of >= 0.05 ? 'medium' : 'small')

export type LinkLike = (props: { href: string; children: ReactNode; className?: string }) => ReactNode
const DefaultLink: LinkLike = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
)

/**
 * The default stylesheet, rendered once per page. Leave it out with `unstyled` (and style the `ndb-*`
 * classes or your own `classNames` yourself), or import the same CSS from `…/client/styles.css`.
 */
export function NestedDocsBrowserStyles({ nonce }: { nonce?: string }) {
  return <style nonce={nonce} data-ndb-styles="">{NDB_STYLES}</style>
}

type Common = { text: BrowserText; Link: LinkLike; cx: Cx; showHidden: boolean; unstyled: boolean }

/**
 * An image: a picture, or (with `mask`) a one-color icon drawn as a mask in `--ndb-color-image`, so it follows the
 * theme and dark mode. Unstyled, a mask falls back to a plain picture. With `alt` it's announced; without, decorative.
 */
function NodeImage({ src, alt, mask, size, className, unstyled }: { src: string; alt?: string | null; mask?: boolean; size: number; className?: string; unstyled: boolean }) {
  if (!mask || unstyled) return <img className={className} src={src} alt={alt ?? ''} width={size} height={size} />
  const url = `url(${JSON.stringify(src)})`
  const a11y = alt ? { role: 'img' as const, 'aria-label': alt } : { 'aria-hidden': true as const }
  return (
    <span
      {...a11y}
      className={className}
      data-mask=""
      style={{ display: 'inline-block', width: size, height: size, backgroundColor: 'var(--ndb-color-image)', maskImage: url, WebkitMaskImage: url, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }}
    />
  )
}

/** One child as a card: image, everyday name over the system name, count and a share bar. */
function ChildCard({ c, of, text, Link, cx, showHidden, unstyled }: Common & { c: Child; of: number }) {
  const n = leavesOf(c, showHidden)
  const pct = of > 0 ? Math.max(1.5, Math.round((n / of) * 100)) : 0
  const data = { 'data-leaf': c.isLeaf ? '' : undefined, 'data-hidden': c.hidden ? '' : undefined, 'data-empty': !c.isLeaf && n === 0 ? '' : undefined, 'data-share': c.isLeaf ? undefined : shareOf(n, of) }
  const body = (
    <>
      {c.image ? <NodeImage className={cx('cardImage')} src={c.image} alt={c.imageAlt} mask={c.imageMask} size={48} unstyled={unstyled} /> : null}
      <span className={cx('cardName')}>{c.everyday || c.name}</span>
      {c.everyday ? <span className={cx('cardSystemName')}>{c.name}</span> : null}
      {!c.isLeaf ? (
        <>
          <span className={cx('cardCount')}>
            {fmt(n)} {n === 1 ? text.leaf : text.leaves}
          </span>
          {of > 0 ? (
            <span className={cx('cardBar')} aria-hidden="true">
              <span className={cx('cardBarFill')} style={{ width: `${pct}%` }} />
            </span>
          ) : null}
        </>
      ) : null}
    </>
  )
  return c.href ? (
    <span style={{ display: 'contents' }} {...data}>
      <Link href={c.href} className={cx('card')}>
        {body}
      </Link>
    </span>
  ) : (
    <div className={cx('card')} {...data}>
      {body}
    </div>
  )
}

/** The compact list behind "Show all": several columns, sorted by size or A–Z, with empty records folded. */
export function CompactList({ items, empty = [], text: textIn, Link, showHidden = false, defaultSort = 'size', classNames, unstyled }: { items: Child[]; empty?: Child[]; text?: Partial<BrowserText>; Link?: LinkLike; showHidden?: boolean; defaultSort?: 'size' | 'az'; classNames?: ClassNames; unstyled?: boolean }) {
  const text = { ...DEFAULT_TEXT, ...textIn }
  const cx = makeCx(classNames, unstyled)
  const [sort, setSort] = useState(defaultSort)
  const L = Link ?? DefaultLink
  const sorted = useMemo(() => [...items].sort(sort === 'az' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => leavesOf(b, showHidden) - leavesOf(a, showHidden) || a.name.localeCompare(b.name)), [items, sort, showHidden])
  const row = (c: Child) => {
    const label = c.everyday ? `${c.everyday} (${c.name})` : c.name
    return (
      <li key={c.id} className={cx('compactRow')} data-leaf={c.isLeaf ? '' : undefined} data-hidden={c.hidden ? '' : undefined}>
        {c.href ? (
          <L href={c.href} className={cx('compactName')}>
            {label}
          </L>
        ) : (
          <span className={cx('compactName')}>{label}</span>
        )}
        <span className={cx('compactCount')}>{c.isLeaf ? '' : fmt(leavesOf(c, showHidden))}</span>
      </li>
    )
  }
  return (
    <div className={cx('compact')} data-sort={sort}>
      <div role="group" aria-label={text.sortLabel} className={cx('compactTools')}>
        {text.sortLabel}:
        {(['size', 'az'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={cx('button', cx('compactSort'))}>
            {k === 'size' ? text.sortLargest : text.sortAz}
          </button>
        ))}
        <span>{fill(text.withLeaves, { n: fmt(items.length) })}</span>
      </div>
      <ul className={cx('compactList')}>{sorted.map(row)}</ul>
      {empty.length ? (
        <details className={cx('compactEmpty')}>
          <summary className={cx('compactEmptySummary')}>{fill(text.emptyFold, { n: fmt(empty.length) })}</summary>
          <ul className={cx('compactList')}>{empty.map(row)}</ul>
        </details>
      ) : null}
    </div>
  )
}

/** "Show all": a button that opens the compact list in place. */
export function ShowAll({ items, empty, noun, text: textIn, Link, showHidden, label, classNames, unstyled }: { items: Child[]; empty?: Child[]; noun: string; text?: Partial<BrowserText>; Link?: LinkLike; showHidden?: boolean; label?: string; classNames?: ClassNames; unstyled?: boolean }) {
  const text = { ...DEFAULT_TEXT, ...textIn }
  const cx = makeCx(classNames, unstyled)
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={cx('showAll')} data-open={open ? '' : undefined}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={cx('button', cx('showAllButton'))}>
        {open ? text.showFewer : (label ?? fill(text.showAll, { of: fmt(items.length + (empty?.length ?? 0)), noun }))}
      </button>
      <div id={id} hidden={!open}>
        {open ? <CompactList items={items} empty={empty} text={text} Link={Link} showHidden={showHidden} classNames={classNames} unstyled={unstyled} /> : null}
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
  sections?: { id: string; title: string; image?: string | null; imageAlt?: string | null; imageMask?: boolean; paths: string[] }[]
  /** The site's link component (for example Next's), so links keep the site's routing. */
  Link?: LinkLike
  /** Force a layout (otherwise it's chosen from the counts). */
  layout?: Layout
  /** Heading level for the node's name. */
  headingLevel?: 1 | 2
  /** Extra classes per element, added to the stable `ndb-*` ones. */
  classNames?: ClassNames
  /** Leave out the default stylesheet and the `ndb-*` classes, for a site that styles everything itself. */
  unstyled?: boolean
  /** Render the default stylesheet here (default true unless unstyled). Turn off if the page imports styles.css. */
  includeStyles?: boolean
  /** CSP nonce for the inline stylesheet. */
  nonce?: string
}

/**
 * One level of a large tree, laid out to suit how much is inside: a gallery for a few, a card grid for a
 * moderate number, sections or an A–Z index for many, and cards for leaves. Every shortened view has
 * "Show all", empty records are listed in their own fold, and hidden-by-default ones are behind a switch.
 *
 * Styling: every element has a stable `ndb-*` class and state is in data attributes; colors, gaps, radii
 * and sizes are `--ndb-*` variables that fall back to `--palette-*` theme tokens. `classNames` adds classes
 * per element; `unstyled` leaves everything to the site.
 */
export function NestedDocsBrowser({ data, noun, text: textIn, thresholds, sections, Link: LinkIn, layout: forced, headingLevel = 1, classNames, unstyled = false, includeStyles, nonce }: BrowserProps) {
  const text = { ...DEFAULT_TEXT, ...textIn }
  const Link = LinkIn ?? DefaultLink
  const cx = makeCx(classNames, unstyled)
  const [showHidden, setShowHidden] = useState(false)
  const [letter, setLetter] = useState<string | null>(null)
  const layout = forced ?? chooseLayout(data.children, { hasSections: Boolean(sections?.length), thresholds })
  const firstShown = layout === 'leaves' || layout === 'gallery' ? 1000 : (thresholds?.firstShown ?? 12)
  const p = presentChildren(data.children, { showHidden, firstShown })
  const visible = [...p.first, ...p.rest]
  const total = visible.reduce((n, c) => n + leavesOf(c, showHidden), 0)
  const hiddenLeaves = data.children.reduce((n, c) => n + (c.hiddenLeaves ?? 0), 0)
  const H = headingLevel === 1 ? 'h1' : 'h2'
  const common: Common = { text, Link, cx, showHidden, unstyled }
  const passOn = { text, Link, showHidden, classNames, unstyled }
  const cards = (items: Child[]) => (
    <div className={cx('grid')}>
      {items.map((c) => (
        <ChildCard key={c.id} c={c} of={total} {...common} />
      ))}
    </div>
  )
  const byPath = new Map(visible.map((c) => [c.path, c]))

  return (
    <section className={cx('root')} data-layout={layout} data-show-hidden={showHidden ? '' : undefined}>
      {(includeStyles ?? !unstyled) ? <NestedDocsBrowserStyles nonce={nonce} /> : null}
      {data.ancestors.length ? (
        <nav aria-label={text.where} className={cx('crumbs')}>
          <ol className={cx('crumbsList')}>
            {data.ancestors.map((a, i) => (
              <li key={i} className={cx('crumb')}>
                {i > 0 ? <span aria-hidden="true">›</span> : null}
                {a.href ? (
                  <Link href={a.href} className={cx('crumbLink')}>
                    {a.everyday || a.name}
                  </Link>
                ) : (
                  a.everyday || a.name
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {data.node ? (
        <>
          <H className={cx('title')}>{data.node.everyday || data.node.name}</H>
          {data.node.everyday ? <p className={cx('systemName')}>{data.node.name}</p> : null}
        </>
      ) : null}
      <p className={cx('summary')}>
        {fmt(total)} {total === 1 ? text.leaf : text.leaves}
        {layout !== 'leaves' ? ` · ${fill(text.allOf, { of: fmt(visible.length), noun })}` : ''}
      </p>
      {hiddenLeaves > 0 ? (
        <label className={cx('switch')}>
          <input type="checkbox" className={cx('switchInput')} checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          {text.includeHidden} <span className={cx('switchCount')}>({fmt(hiddenLeaves)})</span>
        </label>
      ) : null}

      {visible.length === 0 ? <p className={cx('nothing')}>{text.nothing}</p> : null}

      {layout === 'gallery' || layout === 'leaves' ? cards(visible) : null}

      {layout === 'cards' ? (
        <>
          {cards(p.first)}
          {p.rest.length ? <p className={cx('showing')}>{fill(text.showingLargest, { n: fmt(p.first.length), of: fmt(visible.length), noun })}</p> : null}
          {p.rest.length || p.empty.length ? <ShowAll items={visible} empty={p.empty} noun={noun} {...passOn} /> : null}
        </>
      ) : null}

      {layout === 'sections' && sections ? (
        <>
          {sections.map((s) => {
            const items = s.paths.map((path) => byPath.get(path)).filter((c): c is Child => Boolean(c))
            if (!items.length) return null
            const sp = presentChildren(items, { showHidden, firstShown: 8 })
            return (
              <div key={s.id} className={cx('section')} data-section={s.id}>
                <h2 className={cx('sectionTitle')}>
                  {s.image ? <NodeImage className={cx('sectionImage')} src={s.image} alt={s.imageAlt} mask={s.imageMask} size={40} unstyled={unstyled} /> : null}
                  {s.title}
                  <span className={cx('sectionCount')}>
                    {fmt(items.reduce((n, c) => n + leavesOf(c, showHidden), 0))} {text.leaves}
                  </span>
                </h2>
                {cards(sp.first)}
                {sp.rest.length ? <ShowAll items={[...sp.first, ...sp.rest]} noun={noun} {...passOn} /> : null}
              </div>
            )
          })}
          <div className={cx('section')}>
            <ShowAll items={visible} empty={p.empty} noun={noun} {...passOn} />
          </div>
        </>
      ) : null}

      {layout === 'index' || (layout === 'sections' && !sections) ? (
        <>
          {cards(p.first)}
          <p className={cx('showing')}>{fill(text.showingLargest, { n: fmt(p.first.length), of: fmt(visible.length), noun })}</p>
          <nav aria-label={text.letters} className={cx('letters')}>
            {letterIndex([...visible, ...p.empty]).map(({ letter: l, count }) => (
              <button key={l} type="button" aria-pressed={letter === l} aria-label={fill(text.lettersFor, { letter: l, n: count })} onClick={() => setLetter(letter === l ? null : l)} className={cx('button', cx('lettersButton'))}>
                {l}
                <small className={cx('lettersCount')}>{count}</small>
              </button>
            ))}
          </nav>
          {letter ? (
            <div aria-live="polite">
              <CompactList
                key={letter}
                items={visible.filter((c) => (c.name[0] ?? '').toUpperCase() === letter || (letter === '#' && !/[A-Z]/i.test(c.name[0] ?? '')))}
                empty={p.empty.filter((c) => (c.name[0] ?? '').toUpperCase() === letter)}
                defaultSort="az"
                {...passOn}
              />
            </div>
          ) : null}
          <ShowAll items={visible} empty={p.empty} noun={noun} {...passOn} />
        </>
      ) : null}

      {(layout === 'gallery' || layout === 'leaves') && p.empty.length ? <ShowAll items={[]} empty={p.empty} noun={noun} label={fill(text.emptyFold, { n: fmt(p.empty.length) })} {...passOn} /> : null}
    </section>
  )
}
