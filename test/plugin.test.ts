import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { buildConfig, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { browse, browseCacheSize, browseGroup, CACHE_MAX, clearBrowseCache, groupCheck, groupsOverview, nestedDocsBrowser, presentChildren, type BrowserOptions } from '../src/index.js'
import { cached } from '../src/browse.js'

/**
 * A made-up slice of a reptile taxonomy, shaped like a real one: a materialized path, a rank, and an
 * `extant` flag where fossils are "extinct". Mosasauridae is a fossil family; Adocidae has no species.
 */
let payload: Payload
let mongo: MongoMemoryReplSet
const opts: BrowserOptions = {
  collection: 'taxa',
  leaf: { field: 'rank', equals: 'species' },
  hideByDefault: { field: 'extant', equals: 'extinct', label: 'fossil' },
  describe: (d) => ({ name: String(d.name), everyday: (d.common as string) ?? null }),
  href: (p) => `/taxa/${p}`,
  rootLabel: 'Reptiles',
  groups: { access: { create: () => true, update: () => true, delete: () => true } },
}
const ids: Record<string, string> = {}
const T = [
  ['reptilia', 'Reptilia', 'class'],
  ['reptilia/squamata', 'Squamata', 'order'],
  ['reptilia/squamata/agamidae', 'Agamidae', 'family', 'Agamas'],
  ['reptilia/squamata/agamidae/pogona', 'Pogona', 'genus'],
  ['reptilia/squamata/agamidae/pogona/vitticeps', 'Pogona vitticeps', 'species', 'Central bearded dragon'],
  ['reptilia/squamata/agamidae/pogona/barbata', 'Pogona barbata', 'species'],
  ['reptilia/squamata/colubridae', 'Colubridae', 'family', 'Colubrids'],
  ['reptilia/squamata/colubridae/pantherophis', 'Pantherophis', 'genus'],
  ['reptilia/squamata/colubridae/pantherophis/guttatus', 'Pantherophis guttatus', 'species', 'Corn snake'],
  ['reptilia/squamata/gekkonidae', 'Gekkonidae', 'family'],
  ['reptilia/squamata/gekkonidae/gekko', 'Gekko', 'genus'],
  ['reptilia/squamata/gekkonidae/gekko/gecko', 'Gekko gecko', 'species', 'Tokay'],
  ['reptilia/squamata/dibamidae', 'Dibamidae', 'family'],
  ['reptilia/squamata/dibamidae/dibamus', 'Dibamus', 'genus'],
  ['reptilia/squamata/dibamidae/dibamus/novaeguineae', 'Dibamus novaeguineae', 'species'],
  ['reptilia/squamata/mosasauridae', 'Mosasauridae', 'family'],
  ['reptilia/squamata/mosasauridae/mosasaurus', 'Mosasaurus', 'genus'],
  ['reptilia/squamata/mosasauridae/mosasaurus/hoffmannii', 'Mosasaurus hoffmannii', 'species', null, 'extinct'],
  ['reptilia/squamata/adocidae', 'Adocidae', 'family'],
  ['reptilia/testudines', 'Testudines', 'order'],
  ['reptilia/testudines/testudinidae', 'Testudinidae', 'family', 'Tortoises'],
  ['reptilia/testudines/testudinidae/chelonoidis', 'Chelonoidis', 'genus'],
  ['reptilia/testudines/testudinidae/chelonoidis/carbonarius', 'Chelonoidis carbonarius', 'species', 'Red-footed tortoise'],
] as const

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
  payload = await getPayload({
    config: await buildConfig({
      secret: 'test-secret-not-for-production',
      telemetry: false,
      typescript: { autoGenerate: false },
      db: mongooseAdapter({ url: mongo.getUri('ndb'), ensureIndexes: true }),
      collections: [
        { slug: 'users', auth: true, fields: [] },
        {
          slug: 'taxa',
          access: { read: () => true },
          fields: [
            { name: 'name', type: 'text' },
            { name: 'common', type: 'text' },
            { name: 'rank', type: 'text' },
            { name: 'path', type: 'text', index: true },
            { name: 'extant', type: 'text' },
          ],
        },
      ],
      plugins: [nestedDocsBrowser(opts)],
    }),
  })
  for (const [path, name, rank, common, extant] of T) ids[path] = String((await payload.create({ collection: 'taxa', data: { path, name, rank, common: common ?? null, extant: extant ?? 'living' } as never })).id)
  const g = (name: string, order: number, include: string[], exclude: string[] = []) => payload.create({ collection: 'nested-groups' as never, data: { name, order, include: include.map((p) => ids[p]), exclude: exclude.map((p) => ids[p]) } as never })
  await g('Snakes', 1, ['reptilia/squamata/colubridae'])
  await g('Lizards', 2, ['reptilia/squamata'], ['reptilia/squamata/colubridae', 'reptilia/squamata/gekkonidae', 'reptilia/squamata/dibamidae'])
  await g('Geckos', 3, ['reptilia/squamata/gekkonidae'])
  await g('Tortoises', 4, ['reptilia/testudines/testudinidae'])
}, 120_000)

afterAll(async () => {
  await payload?.destroy()
  await mongo?.stop()
})

describe('one level of the tree', () => {
  it('lists the children with live counts from one aggregation, the breadcrumb and everyday names', async () => {
    const r = await browse(payload, opts, 'reptilia/squamata')
    expect(r.node).toMatchObject({ name: 'Squamata', path: 'reptilia/squamata' })
    expect(r.ancestors).toEqual([{ path: 'reptilia', name: 'Reptilia', everyday: null, image: null, href: '/taxa/reptilia' }])
    const by = Object.fromEntries(r.children.map((c) => [c.name, c]))
    expect(by.Agamidae).toMatchObject({ everyday: 'Agamas', leaves: 2, hiddenLeaves: 0, hidden: false, href: '/taxa/reptilia/squamata/agamidae' })
    expect(by.Colubridae!.leaves).toBe(1)
    // A family of fossils only is hidden by default; a family with no species shows as empty.
    expect(by.Mosasauridae).toMatchObject({ leaves: 0, hiddenLeaves: 1, hidden: true })
    expect(by.Adocidae).toMatchObject({ leaves: 0, hiddenLeaves: 0, hidden: false })
    const p = presentChildren(r.children)
    expect([...p.first, ...p.rest].map((c) => c.name)).toEqual(['Agamidae', 'Colubridae', 'Dibamidae', 'Gekkonidae'])
    expect(p.empty.map((c) => c.name)).toEqual(['Adocidae'])
    expect(p.hidden.map((c) => c.name)).toEqual(['Mosasauridae'])
  })

  it('marks species as leaves, a fossil species as hidden, and answers the top and unknown paths', async () => {
    const genus = await browse(payload, opts, 'reptilia/squamata/mosasauridae/mosasaurus')
    expect(genus.children).toEqual([expect.objectContaining({ name: 'Mosasaurus hoffmannii', isLeaf: true, leaves: 0, hiddenLeaves: 1, hidden: true })])
    const top = await browse(payload, opts, '')
    expect(top.node).toMatchObject({ name: 'Reptiles', path: '' })
    expect(top.children.map((c) => [c.name, c.leaves])).toEqual([['Reptilia', 6]])
    expect((await browse(payload, opts, 'reptilia/nothing-here')).node).toBeNull()
  })

  it('never caches a miss, and holds at most CACHE_MAX entries', async () => {
    clearBrowseCache()
    for (let i = 0; i < 50; i++) await browse(payload, opts, `made-up/${i}/${'x'.repeat(200)}`)
    expect(await browseGroup(payload, opts, 'no-such-group')).toBeNull()
    expect(browseCacheSize()).toBe(0)
    await browse(payload, opts, 'reptilia')
    expect(browseCacheSize()).toBe(1)
    for (let i = 0; i < CACHE_MAX + 25; i++) await cached(`k${i}`, 60_000, async () => i)
    expect(browseCacheSize()).toBe(CACHE_MAX)
    // The oldest went first: the newest key is still there.
    expect(await cached(`k${CACHE_MAX + 24}`, 60_000, async () => -1)).toBe(CACHE_MAX + 24)
    clearBrowseCache()
  })
})

describe('everyday groups', () => {
  it('counts each group live: included branches minus excluded ones, fossils counted apart', async () => {
    const all = await groupsOverview(payload, opts)
    expect(all.map((g) => [g.name, g.leaves, g.hiddenLeaves])).toEqual([
      ['Snakes', 1, 0],
      ['Lizards', 2, 1], // Squamata minus snakes, geckos and Dibamidae: the two Pogona, and the fossil mosasaur
      ['Geckos', 1, 0],
      ['Tortoises', 1, 0],
    ])
  })

  it("shows a group's children without the excluded branches", async () => {
    const lizards = (await groupsOverview(payload, opts)).find((g) => g.name === 'Lizards')!
    const r = await browseGroup(payload, opts, lizards.id)
    expect(r!.children.map((c) => c.name).sort()).toEqual(['Adocidae', 'Agamidae', 'Mosasauridae'])
  })

  it('lists species in no group and species in two, for curators', async () => {
    const check = await groupCheck(payload, opts, 'reptilia/squamata')
    expect(check.checked).toBe(6)
    expect(check.none).toEqual(['reptilia/squamata/dibamidae/dibamus/novaeguineae'])
    expect(check.several).toEqual([])
  })
})

describe('showing only what is confirmed (notEquals)', () => {
  it('hides everything without the value, including unknown and missing, and counts it apart', async () => {
    const only: BrowserOptions = { ...opts, hideByDefault: { field: 'extant', notEquals: 'living' }, cacheMs: 0 }
    // One bearded dragon marked unknown: under "only living" it moves behind the switch, like the fossil.
    await payload.update({ collection: 'taxa', id: ids['reptilia/squamata/agamidae/pogona/barbata']!, data: { extant: 'unknown' } as never })
    const r = await browse(payload, only, 'reptilia/squamata')
    const by = Object.fromEntries(r.children.map((c) => [c.name, c]))
    expect(by.Agamidae).toMatchObject({ leaves: 1, hiddenLeaves: 1 })
    expect(by.Mosasauridae).toMatchObject({ leaves: 0, hiddenLeaves: 1, hidden: true })
    // Family records aren't marked living themselves, but a family with living species is never hidden.
    expect(by.Agamidae!.hidden).toBe(false)
    expect(by.Colubridae).toMatchObject({ leaves: 1, hidden: false })
    // A family with no species at all is empty, not hidden, so it's still listed in its own fold.
    expect(by.Adocidae).toMatchObject({ leaves: 0, hiddenLeaves: 0 })
    await payload.update({ collection: 'taxa', id: ids['reptilia/squamata/agamidae/pogona/barbata']!, data: { extant: 'living' } as never })
  })
})

describe('the endpoints and the cache', () => {
  const get = (path: string) => fetchEndpoint(path)
  async function fetchEndpoint(path: string): Promise<Response> {
    const url = new URL(`http://test.local/api${path}`)
    const ep = payload.config.endpoints.find((e) => {
      const pattern = new RegExp(`^${e.path.replace(/:[a-z]+/g, '[^/]+')}$`)
      return e.method === 'get' && pattern.test(url.pathname.slice(4))
    })!
    const id = /groups\/([^/]+)$/.exec(url.pathname)?.[1]
    return ep.handler({ url: url.toString(), payload, routeParams: id ? { id } : {} } as never) as Promise<Response>
  }

  it('answers a level, a missing level, the groups and a group', async () => {
    const level = await get('/nested-docs-browser/taxa?path=reptilia/testudines')
    expect(level.status).toBe(200)
    expect(((await level.json()) as { children: { name: string }[] }).children.map((c) => c.name)).toEqual(['Testudinidae'])
    expect((await get('/nested-docs-browser/taxa?path=reptilia/none')).status).toBe(404)
    const groups = (await (await get('/nested-docs-browser/taxa/groups')).json()) as { groups: { id: string; name: string }[] }
    expect(groups.groups).toHaveLength(4)
    expect((await get(`/nested-docs-browser/taxa/groups/${groups.groups[0]!.id}`)).status).toBe(200)
  })

  it('refuses the curator check without permission, and refreshes counts when the tree changes', async () => {
    // A plugin instance whose groups can't be changed by anyone refuses the check.
    const strict = (await nestedDocsBrowser({ ...opts, groups: {} })({ collections: [{ slug: 'taxa', fields: [] }] } as never)) as { endpoints: { path: string; handler: (req: unknown) => Promise<Response> }[] }
    const check = strict.endpoints.find((e) => e.path.endsWith('groups-check'))!
    expect((await check.handler({ url: 'http://x/api', payload })).status).toBe(403)

    const before = (await browse(payload, opts, 'reptilia/testudines')).children[0]!.leaves
    await payload.create({ collection: 'taxa', data: { path: 'reptilia/testudines/testudinidae/chelonoidis/denticulatus', name: 'Chelonoidis denticulatus', rank: 'species', extant: 'living' } as never })
    expect((await browse(payload, opts, 'reptilia/testudines')).children[0]!.leaves).toBe(before + 1)
  })
})

describe('only an exact true, or a query that is applied', () => {
  type Built = { endpoints: { path: string; handler: (req: unknown) => Promise<Response> }[] }
  const build = (o: BrowserOptions) => nestedDocsBrowser(o)({ collections: [{ slug: 'taxa', fields: [] }] } as never) as unknown as Built
  const handler = (b: Built, end: string) => b.endpoints.find((e) => e.path.endsWith(end))!.handler
  const NOT_TRUE: [string, () => unknown][] = [
    ['1', () => 1],
    ["'yes'", () => 'yes'],
    ['an object', () => ({ ok: false })],
    ['a resolved object', async () => ({})],
    ['a thrown error', () => {
      throw new Error('rules store down')
    }],
    ['a rejected promise', async () => {
      throw new Error('rules store down')
    }],
  ]

  it('opens the browse endpoints only when access answers exactly true, and refuses a throw with 403', async () => {
    const groupsId = (await groupsOverview(payload, opts))[0]!.id
    const calls = (b: Built) => [
      handler(b, '/taxa')({ url: 'http://x/api/nested-docs-browser/taxa?path=reptilia', payload, routeParams: {} }),
      handler(b, '/groups')({ url: 'http://x/api/nested-docs-browser/taxa/groups', payload, routeParams: {} }),
      handler(b, '/groups/:id')({ url: `http://x/api/nested-docs-browser/taxa/groups/${groupsId}`, payload, routeParams: { id: groupsId } }),
    ]
    for (const [what, answer] of NOT_TRUE)
      for (const res of await Promise.all(calls(build({ ...opts, access: answer as never })))) expect(res.status, what).toBe(403)
    for (const res of await Promise.all(calls(build({ ...opts, access: () => true })))) expect(res.status).toBe(200)
  })

  it('refuses the curator check on a truthy or failing update rule, and limits it to the groups a query matches', async () => {
    const check = async (update: unknown) => {
      const b = build({ ...opts, groups: { access: { update: update as never } } })
      return handler(b, 'groups-check')({ url: 'http://x/api/nested-docs-browser/taxa/groups-check?scope=reptilia/squamata', payload, routeParams: {} })
    }
    for (const [what, answer] of NOT_TRUE) expect((await check(answer)).status, what).toBe(403)

    // A query: only the groups it matches count. Here only Snakes, so every squamate but the corn snake is in none.
    const scoped = await check(() => ({ name: { equals: 'Snakes' } }))
    expect(scoped.status).toBe(200)
    const s = (await scoped.json()) as { groups: number; checked: number; none: string[]; several: string[] }
    expect(s.groups).toBe(1)
    expect(s.none).toHaveLength(s.checked - 1)
    expect(s.none).not.toContain('reptilia/squamata/colubridae/pantherophis/guttatus')

    // A query Payload can't run on the groups is refused, never widened to every group.
    expect((await check(() => ({ notAField: { equals: true } }))).status).toBe(403)
    // A malformed one, which Payload would quietly skip and so match every group, is refused too.
    expect((await check(() => ({ name: false }))).status).toBe(403)
    expect((await check(() => ({ or: [] }))).status).toBe(403)

    const all = (await (await check(() => true)).json()) as { groups: number; none: string[] }
    expect(all.groups).toBe(4)
    expect(all.none).toEqual(['reptilia/squamata/dibamidae/dibamus/novaeguineae'])
  })
})
