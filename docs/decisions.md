# Decisions

Dated decisions for this repo, newest last.

- 2026-11-09: created from the standard repo starter kit.
- 2026-11-10: **a package of its own** (owner): "New package (Recommended)", over building it inside the site or extending OneTaxonomy. Named after Payload's Nested Docs: "What do they call the hierarchy setup in payload? … We could do that then browser". MIT, public after the first-public-push audit. First user: the first site's taxonomy.
- 2026-11-10: **never hidden** (owner): "When things are truncated in views for looks; we should probably put expand or view all and make sure that it has a way to display more so we aren't ever hiding the tree." `presentChildren` puts every child in exactly one of first, rest, empty or hidden, and a test checks they add up.
- 2026-11-10 (build): **counts from one aggregation** on MongoDB, grouping leaves by the path segment under the node. MongoDB only for now; other adapters would need one count per child.
- 2026-11-10 (build): **groups are views** (include minus exclude), saved as relationships to the tree, so renaming a node keeps the group right. Nobody can change groups through the API unless the site grants it.
- 2026-11-10 (build): **no styling of its own** beyond layout: plain HTML, `--ndb-*` CSS variables with fallbacks, the site's link component, every word replaceable.
- 2026-11-10 (build): **`notEquals` for hide-by-default**, to show only what's confirmed, such as confirmed living species. An unknown status isn't the same as fossil. A branch is hidden only when it shows no leaves and is flagged itself or holds only hidden leaves; a branch with leaves to show is never hidden. On a real taxonomy: 12,687 living species shown, 2,347 fossil or unconfirmed behind the switch.
- 2026-11-10: **styling hooks everywhere** (owner: "our taxa implementation should have the same architecture but be able to look wildly different"). Stable classes on every element, data attributes for state, `--ndb-*` variables falling back to `--palette-*` theme tokens, a `classNames` map, and `unstyled`. The default stylesheet uses zero specificity except link color (one class), so a site's bare `a` rule can't override the theme.
- 2026-11-13: moved to the ExtantApe GitHub organization and the `@extantape` npm scope at the same version. EXTANT APE owns its reusable tools and licenses them to the platform. The earlier package name is deprecated with a pointer here, and GitHub redirects the old repository address.
