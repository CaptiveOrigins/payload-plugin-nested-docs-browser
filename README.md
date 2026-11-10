# payload-plugin-nested-docs-browser

Nested Docs Browser for Payload: browse large hierarchies in pages that adapt to how much is inside, with Show all on every shortened view, an A–Z index and saved groups over the tree.

**Status:** early, 0.x.
- **Tested:** 27 tests: the core, the Payload side against a real Payload 3.92 and MongoDB with a made-up reptile slice, and the React views in jsdom.
- **Real data:** tried read-only on a real taxonomy of 23,860 records. A level took 0.25 to 1.2 seconds before caching. In a real browser at 1280 and 375 px, with the lists open, axe found nothing.
- **Not tried yet:** inside a site, or with a screen reader.

## What it does

- **One level at a time, laid out to fit.** A few children get a gallery of large cards. A moderate number get a card grid, biggest first. Many get curated sections, or an index: the largest dozen, an A–Z bar and a compact list. Leaves (for a taxonomy, species) get cards. Thresholds are settings.
- **Nothing is ever hidden.** Every shortened view says how much it shows ("Showing the 12 largest of 276 genera") and has Show all. Show all opens a compact list in place: several columns of names and counts, sorted largest first or A–Z. Records with no leaves are listed in their own fold, never dropped.
- **Hidden by default, behind a switch.** For example fossils (`equals: 'extinct'`), or everything not confirmed (`notEquals: 'living'`). The switch says how many are hidden.
- **Live counts, cheaply.** Every child's leaf count comes from one MongoDB aggregation, so 500 children cost one query, not 500. Results are cached for five minutes, and the cache clears when the collection changes.
- **Everyday groups.** A `nested-groups` collection saves groups people know, each "these branches minus those". For example, "lizards" is Squamata minus snakes minus geckos. Groups are views: they never change the tree, and their counts are live. A curator check lists leaves that fall in no group, or in two.
- **Your words and your look.** Every word in the views can be replaced, for translation, and the views take your own link component.
  - Every element has a stable class (`ndb-card__name`, `ndb-compact__row`, …), and state is in data attributes (`data-layout`, `data-leaf`, `data-hidden`, `data-empty`, `data-share`).
  - Colors, gaps, radii and sizes are `--ndb-*` variables. Each falls back to a generic theme token (`--palette-primary`, `--palette-surface-raised`, …), then to a default, so a site-wide theme restyles the browser with nothing else to do.
  - `classNames` adds your classes to any element, and `unstyled` leaves everything to you.
  - The default stylesheet uses zero specificity, except link color, so your rules win.
  - Tried in three themes (light, dark, and a serif "field guide" with square cards) from the same component, axe clean in each.

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

**What it shows, and to whom.** For speed, the browser reads the collection straight from MongoDB, so Payload's access rules, drafts and hidden fields don't apply to it. Only two options decide what it shows:

- `filter` (a MongoDB filter) must leave out anything visitors mustn't see: drafts (`_status: 'published'` if the collection has drafts), private or archived records, another site's records on a multi-site install.
- `access` decides who may call the endpoints. Without it they're public.

Names, everyday names and images come from `describe`, so return only what's fine to show. It suits public reference data, such as a taxonomy. The cache holds at most 500 entries and never keeps a miss.

## Styling

**Icons and silhouettes.** For a one-color SVG icon, return `{ image, imageAlt, imageMask: true }` from `describe`. The browser draws it as a mask in `--ndb-color-image`, so it takes the theme's color in light and dark. With `imageAlt` ("No photo yet (tortoise)") it's announced; without it, it's decorative. `unstyled` shows it as a plain picture.

```tsx
// Theme tokens for the whole site (or just --ndb-* for this browser):
<div style={{ '--palette-primary': '#2f6b3a', '--palette-surface-raised': '#f4f1e6', '--palette-radius-lg': '0px' }}>
  <NestedDocsBrowser data={data} noun="families" classNames={{ title: 'my-title', card: 'my-card' }} />
</div>
```

The stylesheet renders with the component. To import it instead, use `@captiveorigins/payload-plugin-nested-docs-browser/client/styles.css` and pass `includeStyles={false}`. For a CSP, pass `nonce`.

## Commands

```bash
npm test          # Vitest: core, Payload side (in-memory MongoDB), views (jsdom)
npm run typecheck
npm run build
```

## License

MIT
