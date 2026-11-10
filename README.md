# payload-plugin-nested-docs-browser

Nested Docs Browser for Payload: browse large hierarchies in pages that adapt to how much is inside, with Show all on every shortened view, an A–Z index and saved groups over the tree.

**Status:** early, 0.x.
- **Tested:** 22 tests: the core, the Payload side against a real Payload 3.92 and MongoDB with a made-up reptile slice, and the React views in jsdom.
- **Real data:** tried read-only on a real taxonomy of 23,860 records. A level took 0.25 to 1.2 seconds before caching. In a real browser at 1280 and 375 px, with the lists open, axe found nothing.
- **Not tried yet:** inside a site, or with a screen reader.

## What it does

- **One level at a time, laid out to fit.** A few children get a gallery of large cards. A moderate number get a card grid, biggest first. Many get curated sections, or an index: the largest dozen, an A–Z bar and a compact list. Leaves (for a taxonomy, species) get cards. Thresholds are settings.
- **Nothing is ever hidden.** Every shortened view says how much it shows ("Showing the 12 largest of 276 genera") and has Show all. Show all opens a compact list in place: several columns of names and counts, sorted largest first or A–Z. Records with no leaves are listed in their own fold, never dropped.
- **Hidden by default, behind a switch.** For example fossils (`equals: 'extinct'`), or everything not confirmed (`notEquals: 'living'`). The switch says how many are hidden.
- **Live counts, cheaply.** Every child's leaf count comes from one MongoDB aggregation, so 500 children cost one query, not 500. Results are cached for five minutes, and the cache clears when the collection changes.
- **Everyday groups.** A `nested-groups` collection saves groups people know, each "these branches minus those". For example, "lizards" is Squamata minus snakes minus geckos. Groups are views: they never change the tree, and their counts are live. A curator check lists leaves that fall in no group, or in two.
- **Your words and your look.** Every word in the views can be replaced, for translation. The views use plain HTML and inherit your theme through `--ndb-*` CSS variables, and take your own link component.

It needs the MongoDB adapter, and a collection that stores each document's path, like `animalia/chordata/reptilia` or a Nested Docs breadcrumb URL.

## Install

```bash
npm install @captiveorigins/payload-plugin-nested-docs-browser
```

Needs Payload 3.80 or later, React 19 and Node 22 or later.

## Use

```ts
import { nestedDocsBrowser } from '@captiveorigins/payload-plugin-nested-docs-browser'

nestedDocsBrowser({
  collection: 'taxa',
  pathField: 'path',
  leaf: { field: 'rank', equals: 'species' },
  hideByDefault: { field: 'extant', equals: 'extinct', label: 'fossil' },
  describe: (doc) => ({ name: doc.name, everyday: doc.everydayName ?? null }),
  href: (path) => `/taxa/${path}`,
  groups: { imageCollection: 'media', access: { create: isCurator, update: isCurator, delete: isCurator } },
})
```

On a page (a server component):

```tsx
import { browse } from '@captiveorigins/payload-plugin-nested-docs-browser'
import { NestedDocsBrowser } from '@captiveorigins/payload-plugin-nested-docs-browser/client'

const data = await browse(payload, options, 'animalia/chordata/reptilia/squamata')
return <NestedDocsBrowser data={data} noun="families" Link={Link} />
```

Or over HTTP: `GET /api/nested-docs-browser/<collection>?path=…`, `…/groups`, `…/groups/<id>`, and `…/groups-check?scope=…`. The check is only for people allowed to change groups.

## Commands

```bash
npm test          # Vitest: core, Payload side (in-memory MongoDB), views (jsdom)
npm run typecheck
npm run build
```

## License

MIT
