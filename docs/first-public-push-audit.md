# First-public-push audit

Run 2026-11-10 by the Web Platform session, before the repo goes public (per ~/Code/CLAUDE.md), so the owner can make it public early. Visibility is changed by the owner, not by this audit.

| Check | Result |
| --- | --- |
| Commit authors (all history) | Only the noreply address (11632652+mgilardi@users.noreply.github.com) |
| Secrets in history (Stripe, AWS, GitHub, Slack keys, private keys, database URLs with passwords) | None. The test secret `test-secret-not-for-production` is made up |
| Email addresses in tracked files | None besides the noreply address |
| Server addresses, IPs, private hosts | None. Tests use an in-memory MongoDB and `http://test.local` |
| Build output, dependencies, env files committed | None (`dist/`, `node_modules/`, `.env` are ignored) |
| Private terms (`scripts/leak-check.sh` locally, with ~/.leak-private-terms) | Passed |
| Leak check in CI | Yes, first step of `.github/workflows/ci.yml` |
| LICENSE | MIT, now "Copyright (c) 2026 EXTANT APE" |
| `package.json` | Not private; license, repository, homepage, bugs and `files` set; typecheck and tests run before publish |
| Release workflow and RELEASING.md | The same as the other general Payload plugins |
| README status line says what has and hasn't been tested | Yes |
| Details of a real site | None. The tests use a made-up slice of a reptile taxonomy. The docs mention the first user's taxonomy, not its files or setup |

Result: clean.
