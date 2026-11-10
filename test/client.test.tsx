// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NestedDocsBrowser } from '../src/client/index.js'
import type { Child } from '../src/core/index.js'

afterEach(cleanup)

const kid = (name: string, leaves: number, extra: Partial<Child> = {}): Child => ({ id: name, name, path: `r/${name.toLowerCase()}`, href: `/t/${name.toLowerCase()}`, leaves, ...extra })
const data = (children: Child[]) => ({ node: { name: 'Colubridae', everyday: 'Colubrids', path: 'r' }, ancestors: [{ name: 'Squamata', everyday: null, href: '/t/squamata' }], children })
// 60 genera with species, 5 empty records, 2 fossil-only genera.
const genera = [
  ...Array.from({ length: 60 }, (_, i) => kid(`${String.fromCharCode(65 + (i % 26))}genus${i}`, 100 - i)),
  ...Array.from({ length: 5 }, (_, i) => kid(`Zempty${i}`, 0)),
  kid('Fossilia', 0, { hidden: true, hiddenLeaves: 3 }),
  kid('Petrosaurus', 0, { hidden: true, hiddenLeaves: 2 }),
]

describe('the browser never hides part of the tree', () => {
  it('a big level gets the index: the largest dozen, how many are shown, and Show all reveals every one', () => {
    render(<NestedDocsBrowser data={data(genera)} noun="genera" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Colubrids' })).toBeTruthy()
    expect(screen.getByText('Showing the 12 largest of 60 genera')).toBeTruthy()
    const button = screen.getByRole('button', { name: 'Show all 65 genera' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const list = document.getElementById(button.getAttribute('aria-controls')!)!
    // All 60 with species are listed, and the 5 empty records are in their own fold.
    expect(within(list).getAllByRole('listitem')).toHaveLength(65)
    expect(within(list).getByText('5 with no species recorded')).toBeTruthy()
    expect(within(list).getByRole('link', { name: 'Agenus0' }).getAttribute('href')).toBe('/t/agenus0')
  })

  it('the A–Z bar opens one letter in place', () => {
    render(<NestedDocsBrowser data={data(genera)} noun="genera" />)
    fireEvent.click(screen.getByRole('button', { name: 'Starting with B: 3' }))
    expect(screen.getByRole('link', { name: 'Bgenus1' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Bgenus27' })).toBeTruthy()
  })

  it('fossil-only children sit behind a switch that says how many', () => {
    render(<NestedDocsBrowser data={data(genera)} noun="genera" />)
    const sw = screen.getByRole('checkbox', { name: /Include fossils/ })
    expect(screen.getByText('(5)')).toBeTruthy()
    expect(screen.queryByText('Fossilia')).toBeNull()
    fireEvent.click(sw)
    fireEvent.click(screen.getByRole('button', { name: /Show all/ }))
    expect(screen.getAllByText('Fossilia').length).toBeGreaterThan(0)
  })

  it('a moderate level gets cards, a small one a gallery, and leaves get cards with no counts', () => {
    const { unmount } = render(<NestedDocsBrowser data={data(genera.slice(0, 20))} noun="genera" />)
    expect(screen.getByText('Showing the 12 largest of 20 genera')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Jump to a letter' })).toBeNull()
    unmount()
    const { unmount: u2 } = render(<NestedDocsBrowser data={data(genera.slice(0, 3))} noun="genera" />)
    expect(screen.queryByText(/Showing the/)).toBeNull()
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/t/') && a.textContent?.includes('genus'))).toHaveLength(3)
    u2()
    render(<NestedDocsBrowser data={data([kid('Chelonoidis carbonarius', 1, { isLeaf: true, everyday: 'Red-footed tortoise' })])} noun="species" />)
    expect(screen.getByText('Red-footed tortoise')).toBeTruthy()
    expect(screen.getByText('Chelonoidis carbonarius')).toBeTruthy()
  })

  it('curated sections each show their children, with every child still in Show all at the end', () => {
    const fams = [kid('Agamidae', 730), kid('Anolidae', 428), kid('Scincidae', 2168), ...Array.from({ length: 45 }, (_, i) => kid(`Fam${i}`, 5))]
    render(<NestedDocsBrowser data={data(fams)} noun="families" sections={[{ id: 'iguania', title: 'Iguanas and agamas', paths: ['r/agamidae', 'r/anolidae'] }, { id: 'skinks', title: 'Skinks', paths: ['r/scincidae'] }]} />)
    expect(screen.getByRole('heading', { level: 2, name: /Iguanas and agamas/ })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: /Skinks/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show all 48 families' }))
    expect(screen.getAllByText('Fam44').length).toBeGreaterThan(0)
  })

  it('every word can be replaced, for translation', () => {
    render(<NestedDocsBrowser data={data(genera)} noun="Gattungen" text={{ showingLargest: 'Die {n} größten von {of} {noun}', showAll: 'Alle {of} {noun} zeigen', includeHidden: 'Fossilien einbeziehen' }} />)
    expect(screen.getByText('Die 12 größten von 60 Gattungen')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Alle 65 Gattungen zeigen' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Fossilien einbeziehen/ })).toBeTruthy()
  })
})

describe('styling hooks', () => {
  it('gives every part a stable class and puts state in data attributes', () => {
    const { container } = render(<NestedDocsBrowser data={data(genera)} noun="genera" />)
    const root = container.querySelector('.ndb')!
    expect(root.getAttribute('data-layout')).toBe('index')
    for (const cls of ['ndb__title', 'ndb__summary', 'ndb__switch', 'ndb__grid', 'ndb-card', 'ndb-card__name', 'ndb-card__count', 'ndb-card__bar-fill', 'ndb-letters', 'ndb-letters__button', 'ndb-showall__button']) expect(container.querySelector(`.${cls}`), cls).toBeTruthy()
    expect(container.querySelector('[data-share="small"], [data-share="medium"], [data-share="large"]')).toBeTruthy()
    // The default stylesheet is rendered once, and every color in it is a variable that falls back to a theme token.
    const style = container.querySelector('style[data-ndb-styles]')!
    expect(style.textContent).toContain('--ndb-color-accent: var(--palette-primary')
    expect(style.textContent).not.toMatch(/:\s*#[0-9a-f]{3,6};\s*$/im) // no bare hex outside a var() fallback
  })

  it('adds a site’s classes per element, and leaves everything to the site when unstyled', () => {
    const { container, unmount } = render(<NestedDocsBrowser data={data(genera)} noun="genera" classNames={{ root: 'taxa', card: 'taxa-card', cardName: 'font-display' }} />)
    expect(container.querySelector('.ndb.taxa')).toBeTruthy()
    expect(container.querySelector('.ndb-card.taxa-card')).toBeTruthy()
    expect(container.querySelector('.ndb-card__name.font-display')).toBeTruthy()
    unmount()
    const bare = render(<NestedDocsBrowser data={data(genera)} noun="genera" unstyled classNames={{ card: 'taxa-card' }} />).container
    expect(bare.querySelector('style[data-ndb-styles]')).toBeNull()
    expect(bare.querySelector('[class*="ndb"]')).toBeNull()
    expect(bare.querySelector('.taxa-card')).toBeTruthy()
    // Unstyled still works: Show all still reveals everything.
    fireEvent.click(within(bare as HTMLElement).getByRole('button', { name: 'Show all 65 genera' }))
    expect(within(bare as HTMLElement).getAllByRole('listitem').length).toBeGreaterThanOrEqual(65)
  })
})

describe('mask images (one-color icons and silhouettes)', () => {
  const families = [
    kid('Testudinidae', 47, { image: '/s/tortoise.svg', imageAlt: 'No photo yet (tortoise)', imageMask: true }),
    kid('Emydidae', 58, { image: '/s/turtle.svg', imageMask: true }),
    kid('Chelidae', 66, { image: '/photo.jpg', imageAlt: 'A snake-necked turtle' }),
  ]
  it('draws a mask in the theme’s image color, announced by its alt text, or decorative without one', () => {
    const { container } = render(<NestedDocsBrowser data={data(families)} noun="families" />)
    const tortoise = screen.getByRole('img', { name: 'No photo yet (tortoise)' })
    expect(tortoise.tagName).toBe('SPAN')
    expect(tortoise.getAttribute('data-mask')).toBe('')
    expect(tortoise.style.backgroundColor).toBe('var(--ndb-color-image)')
    expect(tortoise.style.maskImage || tortoise.style.getPropertyValue('-webkit-mask-image')).toContain('/s/tortoise.svg')
    const turtle = container.querySelector('[data-mask][aria-hidden="true"]')
    expect(turtle).toBeTruthy()
    // A picture stays a picture, with its alt text.
    expect(screen.getByRole('img', { name: 'A snake-necked turtle' }).tagName).toBe('IMG')
  })

  it('unstyled, a mask falls back to a plain picture with its alt text', () => {
    render(<NestedDocsBrowser data={data(families)} noun="families" unstyled />)
    const tortoise = screen.getByRole('img', { name: 'No photo yet (tortoise)' })
    expect(tortoise.tagName).toBe('IMG')
    expect(tortoise.getAttribute('src')).toBe('/s/tortoise.svg')
  })
})
