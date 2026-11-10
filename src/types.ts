import type { Access, PayloadRequest } from 'payload'

import type { Thresholds } from './core/index.js'

/** What a node shows as: its name, its everyday name and an image. */
export type Described = { name: string; everyday: string | null; image: string | null }

export type BrowserOptions = {
  /** The hierarchy collection (one per plugin instance). */
  collection: string
  /** Field holding the materialized path, e.g. `animalia/chordata/reptilia`. Default `path`. */
  pathField?: string
  /** Field naming each document (used when `describe` doesn't). Default `name`. */
  labelField?: string
  /** What counts as a leaf (for a taxonomy: `{ field: 'rank', equals: 'species' }`). */
  leaf: { field: string; equals: unknown }
  /**
   * Leaves and nodes hidden by default, behind a switch (for a taxonomy: fossils). Either `equals` (hide what
   * has this value) or `notEquals` (show only what has this value, for example only confirmed living species).
   */
  hideByDefault?: { field: string; equals?: unknown; notEquals?: unknown; label?: string }
  /** Equality filters every query applies (for example `{ _status: 'published' }`). */
  filter?: Record<string, unknown>
  /** Name, everyday name and image from a raw document. */
  describe?: (doc: Record<string, unknown>) => Partial<{ name: string; everyday: string | null; image: string | null }>
  /** Link for a node's page, from its path. */
  href?: (path: string) => string
  /** Name of the top of the tree. Default "All". */
  rootLabel?: string
  thresholds?: Partial<Thresholds>
  /** Cache lifetime for counts, in ms. Default five minutes; cleared when the collection changes. */
  cacheMs?: number
  /** Saved everyday groups over the tree. Set `false` to leave them out. */
  groups?:
    | false
    | {
        slug?: string
        /** An upload collection for group images; without one, groups take an image URL. */
        imageCollection?: string
        /** Who may change groups. Default: nobody through the API (seed them with the Local API). */
        access?: { create?: Access; update?: Access; delete?: Access }
        adminGroup?: string
      }
  /** Who may use the browse endpoints. Default: everyone (the tree is meant to be public). */
  access?: (req: PayloadRequest) => boolean | Promise<boolean>
}
