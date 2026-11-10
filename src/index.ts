import type { CollectionConfig, Config, Endpoint, Plugin } from 'payload'

import { browse, browseGroup, clearBrowseCache, groupCheck, groupsOverview } from './browse.js'
import type { BrowserOptions } from './types.js'

export { browse, browseCacheSize, browseGroup, CACHE_MAX, clearBrowseCache, groupCheck, groupsOverview, type BrowseResult, type Group } from './browse.js'
export * from './core/index.js'
export type { BrowserOptions, Described } from './types.js'

const nobody = () => false

/** The saved everyday groups: a name, an image, an order and a rule (branches to include, minus branches to exclude). */
function groupsCollection(o: BrowserOptions): CollectionConfig {
  const g = o.groups || {}
  return {
    slug: g.slug ?? 'nested-groups',
    labels: { singular: 'Group', plural: 'Groups' },
    admin: { useAsTitle: 'name', group: g.adminGroup, defaultColumns: ['name', 'order'], description: 'Everyday groups over the tree: everything under the included branches, minus the excluded ones. Counts are live.' },
    access: { read: () => true, create: g.access?.create ?? nobody, update: g.access?.update ?? nobody, delete: g.access?.delete ?? nobody },
    fields: [
      { name: 'name', type: 'text', required: true, localized: true },
      { name: 'description', type: 'textarea', localized: true },
      g.imageCollection ? { name: 'image', type: 'upload', relationTo: g.imageCollection as never } : { name: 'imageUrl', label: 'Image URL', type: 'text' },
      { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
      { name: 'include', type: 'relationship', relationTo: o.collection as never, hasMany: true, required: true, admin: { description: 'Branches whose contents are in the group.' } },
      { name: 'exclude', type: 'relationship', relationTo: o.collection as never, hasMany: true, admin: { description: 'Branches left out, even if they sit under an included one.' } },
    ],
    hooks: { afterChange: [() => clearBrowseCache()], afterDelete: [() => clearBrowseCache()] },
  }
}

/**
 * Nested Docs Browser for Payload: one level of a large tree at a time, with leaf counts from a single
 * aggregation, and saved everyday groups over the tree. The display (layouts, Show all) is in `/client`
 * and `/core`.
 *
 * Endpoints (GET):
 * - `/api/nested-docs-browser/<collection>?path=a/b` one level: node, breadcrumb, children with counts
 * - `/api/nested-docs-browser/<collection>/groups` every group with its counts
 * - `/api/nested-docs-browser/<collection>/groups/<id>` one group's children
 */
export const nestedDocsBrowser =
  (o: BrowserOptions): Plugin =>
  (config: Config): Config => {
    const base = `/nested-docs-browser/${o.collection}`
    const allowed = async (req: Parameters<Endpoint['handler']>[0]) => (o.access ? await o.access(req) : true)
    const refused = () => Response.json({ errors: [{ message: 'Not allowed.' }] }, { status: 403 })
    const endpoints: Endpoint[] = [
      {
        path: base,
        method: 'get',
        handler: async (req) => {
          if (!(await allowed(req))) return refused()
          const path = String(new URL(req.url ?? '', 'http://x').searchParams.get('path') ?? '').slice(0, 1000)
          const result = await browse(req.payload, o, path)
          return result.node ? Response.json(result) : Response.json({ errors: [{ message: 'Not found.' }] }, { status: 404 })
        },
      },
      ...(o.groups === false
        ? []
        : ([
            {
              path: `${base}/groups`,
              method: 'get',
              handler: async (req) => ((await allowed(req)) ? Response.json({ groups: await groupsOverview(req.payload, o) }) : refused()),
            },
            {
              path: `${base}/groups/:id`,
              method: 'get',
              handler: async (req) => {
                if (!(await allowed(req))) return refused()
                const r = await browseGroup(req.payload, o, String(req.routeParams?.id ?? ''))
                return r ? Response.json(r) : Response.json({ errors: [{ message: 'Not found.' }] }, { status: 404 })
              },
            },
            {
              // For curators: leaves in no group or in two. Only for people allowed to change groups.
              path: `${base}/groups-check`,
              method: 'get',
              handler: async (req) => {
                const update = o.groups && o.groups.access?.update
                const ok = update ? await update({ req } as never) : false
                if (!ok) return refused()
                const scope = new URL(req.url ?? '', 'http://x').searchParams.get('scope') ?? undefined
                return Response.json(await groupCheck(req.payload, o, scope || undefined))
              },
            },
          ] satisfies Endpoint[])),
    ]
    const collections = (config.collections ?? []).map((c) =>
      c.slug === o.collection ? { ...c, hooks: { ...c.hooks, afterChange: [...(c.hooks?.afterChange ?? []), () => clearBrowseCache()], afterDelete: [...(c.hooks?.afterDelete ?? []), () => clearBrowseCache()] } } : c,
    )
    return {
      ...config,
      collections: o.groups === false ? collections : [...collections, groupsCollection(o)],
      endpoints: [...(config.endpoints ?? []), ...endpoints],
    }
  }
