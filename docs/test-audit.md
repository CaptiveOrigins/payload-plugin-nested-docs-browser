# Test audit

Kept by this repo's owning session, per `~/Code/CLAUDE.md`, "Test self-audits". Newest first.

## 2026-11-11: only an exact `true`, or a query that is applied

Suite: 27 tests before, 29 after (`npx vitest run`; `plugin.test.ts` against real Payload 3.92 and in-memory MongoDB). From an access sweep.

- **The change.** `src/access.ts`: `exactlyTrue` (only `true` passes; a throw or rejection is a no), `isWhere` (a well-formed, non-empty query of `and`/`or` lists and known operators) and `trueOrWhere`. The browse endpoints read MongoDB directly, so `access` is their only gate: it now needs an exact `true`. The curator check asked the groups' `update` rule and let any truthy answer through, a query included, so a curator limited to some groups got the check over every group. Now `true` checks every group, a query is applied to the groups (the response adds `groups`, how many were checked), and anything else is 403. Payload quietly skips a malformed constraint such as `{ name: false }`, which matched all four groups when tried, so a malformed or empty query is refused rather than applied; a query on a missing field is refused by Payload and answered 403.
- **Tests.** "opens the browse endpoints only when access answers exactly true…": the level, groups and group endpoints each refuse `1`, `'yes'`, an object, a resolved object, a throw and a rejection with 403, and answer 200 for `true`. "refuses the curator check on a truthy or failing update rule…": the same six answers, `{ name: false }`, `{ or: [] }` and an unknown field get 403; `{ name: { equals: 'Snakes' } }` checks one group; `true` checks all four.
- **Mutation checks.** 11 mutations, each a Python string replace restored byte for byte (SHA-256 checked). All 11 fail the suite: truthy passing in `exactlyTrue`; errors rethrown in `exactlyTrue` and `trueOrWhere`; the old truthy endpoint gate; `isWhere` taking any object; a query passed as `true`; the query not handed to the check; `groups()` ignoring it; the unrunnable-query catch removed; the old truthy curator gate.
- **Skipped.** The browse reads still bypass Payload's access by design (README, "What it shows, and to whom"): `filter` and `access` are the controls. The groups collection's own `access` is Payload's to enforce.

## 2026-11-10: first build

22 tests: `core.test.ts` (8), `plugin.test.ts` (8, real Payload 3.92 and in-memory MongoDB), `client.test.tsx` (6, jsdom).

| Promise | Test |
| --- | --- |
| Layout from what's shown: gallery, cards, index or sections, leaves; thresholds change it | core: "choosing a layout" |
| Never hidden: every child in exactly one of first, rest, empty, hidden | core: "puts every child in exactly one place" |
| Largest first; empty records folded; fossils hidden until the switch, then counted | core: "shows the largest first…" |
| 519-genus level keeps all reachable | core: "a big index keeps all 519…" |
| Single-child levels skipped, never past leaves | core: "skips levels with a single child" |
| Group rules: include minus exclude, whole path segments only; no-group and two-group lists | core: "everyday groups" |
| Live counts from one aggregation, breadcrumb, everyday names, fossil and empty children | plugin: "lists the children with live counts…" |
| Leaves, fossil leaves, the top of the tree, unknown paths | plugin: "marks species as leaves…" |
| Group counts and group children without excluded branches | plugin: "everyday groups" |
| Curator check, and its refusal without permission | plugin: "lists species in no group…", "refuses the curator check…" |
| Endpoints answer; cache refreshes when the tree changes | plugin: "the endpoints and the cache" |
| `notEquals`: unknown and missing hidden; branches with shown leaves never hidden | plugin: "showing only what is confirmed" |
| Views: Show all reveals every child, the A–Z bar, the fossils switch, sections, translation | client: six tests |
| Styling hooks: stable classes, data attributes, variables falling back to theme tokens; per-element classes; unstyled mode still works | client: "styling hooks" (2) |

Checked outside the tests: a real taxonomy read-only (timings), and a real browser at 1280 and 375 px with axe (clean, lists open).

Gaps:
- **Screen reader:** not tried. The views use native buttons, `aria-expanded`, `aria-pressed` and labeled navs.
- **Inside a site:** not tried until the first site wires it in.
- **Databases other than MongoDB:** not supported yet, and the README says so.

Skipped as overkill: re-testing Payload's own relationship and access machinery.
