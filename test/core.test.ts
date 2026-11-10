import { describe, expect, it } from 'vitest'

import { chooseLayout, collapseSingleChild, groupMembership, inGroup, letterIndex, presentChildren, showingLine, type Child } from '../src/core/index.js'

// Shapes taken from a real reptile taxonomy (species counts per child), names kept, ids made up.
const kid = (name: string, leaves: number, extra: Partial<Child> = {}): Child => ({ id: name.toLowerCase(), name, path: `r/${name.toLowerCase()}`, leaves, ...extra })
const orders = [kid('Squamata', 13531), kid('Testudines', 652), kid('Crocodylia', 131)]
const turtleFamilies = [
  ...['Chelidae', 'Geoemydidae', 'Testudinidae', 'Emydidae', 'Trionychidae', 'Kinosternidae', 'Pelomedusidae', 'Podocnemididae', 'Chelydridae', 'Cheloniidae', 'Carettochelyidae', 'Dermochelyidae', 'Platysternidae', 'Dermatemydidae'].map((n, i) => kid(n, 110 - i * 7)),
  kid('Bothremydidae', 0, { hidden: true, hiddenLeaves: 12 }), // a fossil family
  kid('Adocidae', 0), // a record with no species
]
const genera = Array.from({ length: 519 }, (_, i) => kid(`G${String(i).padStart(3, '0')}`, i < 283 ? 300 - i : 0))

describe('choosing a layout from what will be shown', () => {
  it('gallery for a few groups, cards for a moderate level, sections or an index for a big one, species cards at the bottom', () => {
    expect(chooseLayout(orders)).toBe('gallery')
    expect(chooseLayout(turtleFamilies)).toBe('cards') // 14 shown; the fossil and the empty record don't count
    expect(chooseLayout(genera)).toBe('index')
    expect(chooseLayout(genera, { hasSections: true })).toBe('sections')
    expect(chooseLayout([kid('C. carbonarius', 1, { isLeaf: true }), kid('C. denticulatus', 1, { isLeaf: true })])).toBe('leaves')
    expect(chooseLayout(turtleFamilies, { thresholds: { cards: 10 } })).toBe('index')
  })
})

describe('never hidden', () => {
  it('puts every child in exactly one place: first, behind Show all, empty, or hidden by default', () => {
    for (const level of [orders, turtleFamilies, genera]) {
      const p = presentChildren(level)
      const all = [...p.first, ...p.rest, ...p.empty, ...p.hidden].map((c) => c.id).sort()
      expect(all).toEqual(level.map((c) => c.id).sort())
      expect(p.total).toBe(level.length)
    }
  })

  it('shows the largest first, lists empty records in their own fold, and hides fossils until asked', () => {
    const p = presentChildren(turtleFamilies, { firstShown: 10 })
    expect(p.first.map((c) => c.name).slice(0, 2)).toEqual(['Chelidae', 'Geoemydidae'])
    expect(p.first).toHaveLength(10)
    expect(p.rest).toHaveLength(4)
    expect(p.empty.map((c) => c.name)).toEqual(['Adocidae'])
    expect(p.hidden.map((c) => c.name)).toEqual(['Bothremydidae'])
    expect(showingLine(p, 'families')).toBe('Showing the 10 largest of 14 families')
    // With the switch on, the fossil family counts its fossil species and joins the visible ones.
    const on = presentChildren(turtleFamilies, { showHidden: true, firstShown: 20 })
    expect(on.hidden).toEqual([])
    expect(on.first.map((c) => c.name)).toContain('Bothremydidae')
  })

  it('a big index keeps all 519 genera reachable: 283 with species, 236 empty', () => {
    const p = presentChildren(genera)
    expect(p.first.length + p.rest.length).toBe(283)
    expect(p.empty).toHaveLength(236)
    expect(letterIndex(genera)).toEqual([{ letter: 'G', count: 519 }])
  })
})

describe('never bare', () => {
  it('skips levels with a single child, but never past a level of leaves', () => {
    const familyWithOneGenus = [kid('Carettochelys', 1)]
    const species = [kid('C. insculpta', 1, { isLeaf: true })]
    expect(collapseSingleChild([familyWithOneGenus, species])).toBe(1)
    expect(collapseSingleChild([orders])).toBe(0)
    // A lone child with only a fossil sibling still counts as alone.
    expect(collapseSingleChild([[kid('Living', 5), kid('Fossil', 0, { hidden: true })], species])).toBe(1)
  })

  it('builds the A–Z bar with unusual first letters grouped under #', () => {
    expect(letterIndex([kid('apple', 1), kid('Banana', 1), kid('1st', 1), kid('Avocado', 1)])).toEqual([
      { letter: 'A', count: 2 },
      { letter: 'B', count: 1 },
      { letter: '#', count: 1 },
    ])
  })
})

describe('everyday groups as rules over the tree', () => {
  const lizards = { include: ['r/squamata'], exclude: ['r/squamata/serpentes', 'r/squamata/gekkonidae'] }
  it('includes a branch minus excluded branches, matching whole path segments only', () => {
    expect(inGroup('r/squamata/agamidae/pogona/vitticeps', lizards)).toBe(true)
    expect(inGroup('r/squamata/serpentes/colubridae/pantherophis/guttatus', lizards)).toBe(false)
    expect(inGroup('r/squamata/gekkonidae', lizards)).toBe(false)
    expect(inGroup('r/squamatax/agamidae', lizards)).toBe(false) // a lookalike prefix isn't inside
    expect(inGroup('r/testudines/testudinidae', lizards)).toBe(false)
  })

  it('lists paths in no group and paths in two, for a curator', () => {
    const groups = [
      { id: 'snakes', rule: { include: ['r/squamata/serpentes'] } },
      { id: 'lizards', rule: lizards },
      { id: 'geckos', rule: { include: ['r/squamata/gekkonidae'] } },
      { id: 'overlap', rule: { include: ['r/squamata/agamidae'] } },
    ]
    const paths = ['r/squamata/serpentes/boidae', 'r/squamata/agamidae', 'r/squamata/gekkonidae/x', 'r/testudines/x', 'r/crocodylia/y']
    const m = groupMembership(paths, groups, 'r/squamata')
    expect(m.byGroup.snakes).toEqual(['r/squamata/serpentes/boidae'])
    expect(m.none).toEqual([]) // only Squamata is in scope
    expect(m.several).toEqual([{ path: 'r/squamata/agamidae', groups: ['lizards', 'overlap'] }])
    expect(groupMembership(paths, groups).none).toEqual(['r/testudines/x', 'r/crocodylia/y'])
  })
})
