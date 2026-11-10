# Decisions

Dated decisions for this repo, newest last.

- 2026-11-09: created from the ops starter kit, area `captive-origins`.
- 2026-11-10: **a package of its own** (owner): "New package (Recommended)", over building it inside the site or extending OneTaxonomy. Named after Payload's Nested Docs: "What do they call the hierarchy setup in payload? … We could do that then browser". MIT, public after the first-public-push audit. First user: the Captive Origins taxonomy.
- 2026-11-10: **never hidden** (owner): "When things are truncated in views for looks; we should probably put expand or view all and make sure that it has a way to display more so we aren't ever hiding the tree." `presentChildren` puts every child in exactly one of first, rest, empty or hidden, and a test checks they add up.
- 2026-11-10 (build): **counts from one aggregation** on MongoDB, grouping leaves by the path segment under the node. MongoDB only for now; other adapters would need one count per child.
- 2026-11-10 (build): **groups are views** (include minus exclude), saved as relationships to the tree, so renaming a node keeps the group right. Nobody can change groups through the API unless the site grants it.
- 2026-11-10 (build): **no styling of its own** beyond layout: plain HTML, `--ndb-*` CSS variables with fallbacks, the site's link component, every word replaceable.
