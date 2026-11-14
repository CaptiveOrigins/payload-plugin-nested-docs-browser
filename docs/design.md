# Design: Nested Docs Browser

2026-11-10. Owner's decisions (2026-11-10): a package of its own, named after Payload's Nested Docs. First user: the first site's taxonomy.

## The problem

A hierarchy with tens of thousands of documents can't be shown the same way at every level:
- three orders and 519 genera need different pages;
- shortening a long level for looks must never hide part of the tree;
- people often think in groups that aren't single branches ("lizards" is Squamata minus snakes minus geckos).

## Three layers

1. **Core** (`@extantape/payload-plugin-nested-docs-browser/core`): plain TypeScript, no Payload, no React.
   - `chooseLayout`: gallery, sections, cards, index or leaves, from the number of children shown and whether they are leaves.
   - `presentChildren`: what to show first, what goes behind "Show all", what's flagged and hidden by default (for example fossils), and what has no leaves (empty records).
   - `collapseSingleChild`: skip levels with one child.
   - `letterIndex`: the A–Z bar.
   - Group rules: `inGroup(path, rule)` and `groupMembership`, which checks for paths in no group or in two.
2. **Views** (`/client`): React components for each layout, plus `ShowAll`, which opens a compact list in place, sorted largest first or A–Z. Keyboard and screen-reader friendly, 44 px targets, no colors of their own (they inherit the site's).
3. **Payload plugin** (`/`):
   - A `nested-groups` collection: saved everyday groups, each with a name, a description, an image, an order, and a rule (paths to include and exclude).
   - A browse endpoint that returns a node, its children with leaf counts, and the groups, worked out on the server and cached.

## What a site tells it

```ts
nestedDocsBrowser({
  collection: 'taxa',              // the hierarchy
  pathField: 'path',               // materialized path ("animalia/chordata/reptilia/…"); Nested Docs' breadcrumbs url works too
  parentField: 'parent',
  leaf: { rank: { equals: 'species' } },   // what counts as a leaf
  hideByDefault: { field: 'extant', equals: 'extinct', label: 'fossil' },  // optional
  label: (doc) => doc.name, everydayName: (doc) => doc.commonName,
  thresholds: { gallery: 6, cards: 40 },
})
```

## Decisions

- **Counting:** leaf counts per child come from one aggregation on MongoDB, grouping leaves by the path segment under the node, so 519 children cost one query, not 519. Other databases fall back to one count per child; the README says so. Results are cached per node, and the cache clears when a document in the collection changes.
- **Never hidden:** every shortened view reports "showing N of M" and has Show all. Records with no leaves are listed in their own fold, never dropped. This is enforced in `presentChildren`, and a test checks that shown, rest, empty and hidden add up to every child.
- **Groups are views:** a group never changes the tree. Its page names its rule and links to the tree.
- **No styling opinions:** the components use semantic HTML and CSS variables with fallbacks, so a site restyles them with its own theme.
