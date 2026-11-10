# Test audit

Kept by this repo's owning session, per `~/Code/CLAUDE.md`, "Test self-audits". Newest first.

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
