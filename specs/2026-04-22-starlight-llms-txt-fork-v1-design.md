---
title: "@f5-sales-demo/starlight-llms-txt v1.0.0 fork release — design"
date: 2026-04-22
status: approved
scope: packages/starlight-llms-txt (this repo only)
supersedes: —
relates-to: f5-sales-demo/xcsh#223
---

# Summary

Ship a 1.0.0 release of `@f5-sales-demo/starlight-llms-txt` — a fork of `delucis/starlight-llms-txt@0.8.1` — adding three options used by the f5-sales-demo documentation federation: `perPageMarkdown` (rebased from upstream PR #32), `sidebarNav` with automatic frontmatter descriptions, and `federatedSites`.
Upstream submission is explicitly deferred until the fork is validated in production across the 25 product repos.

# Context

## Why a fork exists

The upstream plugin (v0.8.1) covers ~80% of what `f5-sales-demo` docs federation needs. The remaining ~20% is three features that:

- Don't exist in any released version.
- Exist partially as an 8-month-stalled upstream PR (delucis#32 — perPageMarkdown).
- Are needed now to support the xcsh cascading llms.txt knowledge hierarchy ([xcsh#223](https://github.com/f5-sales-demo/xcsh/issues/223)).

## Scope of this spec

This spec covers **only Step 1 of xcsh#223** — the plugin fork. Steps 2–6 (docs-builder dependency swap, docs-theme config wiring, docs portal federation, product-repo `llms-config.json`, xcsh prompt cue) are downstream consumers that depend on this release but are each their own work stream in their own repos.

## Starting state

- Repo: `f5-sales-demo/starlight-llms-txt`, forked from `delucis/starlight-llms-txt`.
- Branch: `feature/enhancements-and-publishing` (off `main`).
- Package still named `starlight-llms-txt` (will conflict on publish — see §7.1).
- No test suite exists in the package or the monorepo.
- `.github/workflows/release.yml` is gated on `github.repository_owner == 'delucis'` (won't fire on this fork).
- CI smoke test exists at `.github/workflows/ci.yml` — `pnpm --filter ./docs build`.
- Changesets tooling already wired (`.changeset/config.json`, `ci-version` / `ci-publish` scripts).

# Locked Decisions

| # | Decision | Chosen |
|---|---|---|
| 1 | Fork posture | Upstream-first design, PRs submitted to `delucis/` **only after production validation**; fork is temporary in principle, operating indefinitely until upstream catches up. |
| 2 | Interim publish mechanism | `@f5-sales-demo/starlight-llms-txt` on npmjs as a rename-only fork (plus feature commits). |
| 3 | Test location | Fork-only. Upstream PRs (when submitted) will contain no tests, matching delucis house style. |
| 4 | Test framework | Vitest, unit-heavy. Pure render helpers extracted; integration coverage via existing docs-build smoke test. |
| 5 | delucis#32 handling | Rebase mavam's `topic/markdown-pages` branch into our fork, preserve authorship via `Co-Authored-By`. |
| 6 | NPM auth | Classic automation token (`NPM_TOKEN` GH Actions secret), **not** OIDC trusted publisher. |
| 7 | Starting version | `1.0.0`. New namespace, independent version line. |
| 8 | Sequencing | One bundled implementation branch landing all four features + infra together as a single PR. |
| 9 | Descriptions option | `sidebarNav` renders frontmatter descriptions automatically — no separate `useDescriptions` flag. |
| 10 | `exclude` interaction | `sidebarNav` shows all non-draft default-locale pages, independent of the content-scoped `exclude` option. |
| 11 | sidebar data source | Derive hierarchy from `getCollection('docs')` path segments, not Starlight's `config.sidebar`. |
| 12 | `## Federated Sites` heading | Literal name matches xcsh#223 vocabulary for the fork. Revisit at upstream-submission time if reviewers prefer a more generic label. |
| 13 | LICENSE | Keep upstream's MIT file byte-identical. Fork attribution lives in README. |
| 14 | `files` vs `.npmignore` | Positive-list `files` array in `package.json`; delete `.npmignore`. |
| 15 | Coverage reporting | Skip for v1. Revisit when a regression warrants it. |
| 16 | Test fixtures | Inline in each test file — no shared `fixtures/` directory. |
| 17 | Provenance / OIDC signing | Out of scope for v1 (requires `id-token: write`, conflicts with token-auth choice). |

# Architecture & Commit Topology

Two commit classes coexist on the implementation branch:

- **Upstream-candidate commits** — byte-for-byte cherry-pickable onto `delucis/main` at upstream-submission time.
- **Fork-only commits** — publishing glue, tests, CI, package rename; never going upstream.

## Upstream-candidate set

- Rebased commits from mavam's `topic/markdown-pages` (PR delucis#32) with `Co-Authored-By: Matthias Vallentin <53797+mavam@users.noreply.github.com>` preserved.
- Implementation of `sidebarNav`, including automatic frontmatter-description inlining.
- Implementation of `federatedSites`.
- Types additions and user-facing docs updates for each feature.

## Fork-only set

- Package rename: `starlight-llms-txt` → `@f5-sales-demo/starlight-llms-txt`.
- Repository/homepage/bugs metadata pointing at the fork.
- Release workflow guard swap and `NPM_TOKEN` wiring.
- Changesets config changelog repo pointer.
- Docs-site `site` URL pointed at `f5-sales-demo.github.io`.
- `1.0.0` changeset entry.
- Vitest harness, dev dependency, scripts, config.
- `packages/starlight-llms-txt/test/**` unit tests.
- CI test job addition.
- README replacement describing the fork relationship.

Upstream-candidate commits must not touch `package.json#name`, release workflow, changelog pointer, or README — those are strictly fork-only concerns. If an upstream PR is ever opened from this branch, it is produced by cherry-picking the upstream-candidate set onto a fresh branch off `delucis/main`.

# Features

## Feature 1 — `perPageMarkdown` (rebase of delucis#32)

**Source.** [tenzir/starlight-llms-txt](https://github.com/tenzir/starlight-llms-txt/tree/topic/markdown-pages), head `2a1ae6d259cee07d7466281550b1103b3e48fc5f` at spec time (17 commits; `mergeable_state: dirty` against `delucis/main`). Verify the head SHA has not moved before beginning cherry-pick — stale SHAs produce empty picks or unexpected conflicts.

**Config shape.**

```ts
perPageMarkdown?: boolean | {
  /** 'append' → /foo.html.md · 'replace' → /foo.md */
  extensionStrategy?: 'append' | 'replace';  // default: 'append'
  /** Micromatch patterns for pages to skip */
  excludePages?: string[];                    // default: ['404']
}
```

**Divergence from PR #32.** The upstream PR uses literal string matches for `excludePages`. We swap to `micromatch.isMatch`, consistent with the plugin's existing `promote` / `demote` / `exclude` treatment and with xcsh#223's call site (`excludePages: ['index*']`). This enhancement is a small code-cleanliness improvement we expect the original author to accept at upstream-submission time.

**Files (upstream-candidate).**

| File | Change | Source |
|---|---|---|
| `packages/starlight-llms-txt/types.ts` | +~45 — add `perPageMarkdown` to options and context | PR #32 |
| `packages/starlight-llms-txt/index.ts` | +~25 — inject `/[...slug].md` route when enabled; pass resolved config via virtual module | PR #32 |
| `packages/starlight-llms-txt/page-markdown.ts` | +74 (new) — route handler with `getStaticPaths` | PR #32 |
| `packages/starlight-llms-txt/page-markdown-generator.ts` | +55 (new) — single-doc render pipeline | PR #32 |
| `packages/starlight-llms-txt/entryToSimpleMarkdown.ts` | +14/−1 — share helper with page-markdown-generator | PR #32 |
| `packages/starlight-llms-txt/per-page-markdown-utils.ts` | +~40 (new) — pure helpers extracted for testability | fork refactor |
| `docs/astro.config.ts` | +2 — enable in plugin config | PR #32 |
| `docs/src/content/docs/configuration.mdx` | +~42 — user-facing docs | PR #32 |
| `.changeset/per-page-markdown.md` | +~10 — minor bump entry | fork |

**Fork-only tests** (`packages/starlight-llms-txt/test/per-page-markdown-utils.test.ts`):

- `resolvePerPageMarkdownOptions(undefined)` → disabled, defaults applied.
- `resolvePerPageMarkdownOptions(true)` → enabled, all defaults.
- `resolvePerPageMarkdownOptions({ extensionStrategy: 'replace' })` → defaults merged with override.
- `slugToPath('foo', 'append')` → `'foo.html.md'`; `slugToPath('foo/bar', 'replace')` → `'foo/bar.md'`.
- `shouldExcludePage('404', ['404'])` → true (literal).
- `shouldExcludePage('index', ['index*'])` → true (glob).
- `shouldExcludePage('guides/intro', ['index*'])` → false.

## Feature 2 — `sidebarNav`

**Config shape.** Binary flag, no nested options.

```ts
sidebarNav?: boolean;  // default: false
```

**Data source.** `getCollection('docs')` with the same filter used by `generator.ts:30` (`isDefaultLocale(doc) && !doc.data.draft`), **not** Starlight's `config.sidebar`. Rationale:

1. `generator.ts:30` is already the canonical page list for all other outputs — one source of truth.
2. `config.sidebar` may be omitted entirely (Starlight auto-generates from file structure), flat, or fully configured; resolving Starlight's actual sidebar requires running Starlight's internal sidebar resolver, which the plugin does not import and shouldn't couple to.
3. Path-segment grouping from `doc.id` (`demo/phase-1-build` → group `demo`, leaf `phase-1-build`) is deterministic, works for all three sidebar shapes, and stays correct as pages are added or removed.

Sort order: `doc.data.sidebar.order ?? Infinity`, then `doc.data.title`. Same as Starlight's default rendering order.

The existing `promote` / `demote` options apply to `sidebarNav` ordering the same way they apply to content ordering — one source of truth for document priority.

**Automatic descriptions.** When `doc.data.description` is set, the entry renders as `- [Title](url): description`; otherwise `- [Title](url)`. No separate `useDescriptions` option — the description is already public (Starlight emits it in `<meta>` tags and `generator.ts:57` inlines it into `llms-full.txt`), so inclusion in the nav tree adds no new privacy surface.
Gating it behind a flag would be API noise with no observable behavior difference when absent.

**Output shape** (matches xcsh#223):

```markdown
## Sections

- [Overview](https://.../overview/): Product overview and architecture
- [Demo](https://.../demo/): 4-phase demo exercise
  - [Phase 1 — Build](https://.../demo/phase-1-build/): Deploy infrastructure via API
  - [Phase 2 — Attack](https://.../demo/phase-2-attack/): Simulated attack traffic
- [API Reference](https://.../api-reference/): REST API endpoints
```

**Placement in `llms.txt`.** Between `## Documentation Sets` and `## Notes` (and before `## Federated Sites` — see §Feature 3). Cost gradient: cheapest local metadata first, cross-site traversal links later.

**Edge cases in scope.**

- Draft pages (`doc.data.draft === true`): excluded.
- Non-default locales: excluded; `sidebarNav` reflects the default locale only.
- A section path with no index page (e.g. `demo/phase-1-build` exists but no `demo/index`): render the parent as a title-cased group label with no link, children underneath.
- `sidebarNav` with no docs: emits no `## Sections` block (segment omitted, same pattern as `optionalLinks`).

**Files (upstream-candidate).**

| File | Change |
|---|---|
| `packages/starlight-llms-txt/types.ts` | +~6 — `sidebarNav?: boolean` in options, `sidebarNav: boolean` in context |
| `packages/starlight-llms-txt/index.ts` | +1 — pass `opts.sidebarNav ?? false` into `projectContext` |
| `packages/starlight-llms-txt/sidebar-nav.ts` | new — `buildSectionTree(docs) → SectionNode[]`, `renderSectionTree(tree, site) → string` |
| `packages/starlight-llms-txt/llms.txt.ts` | +~15 — when `sidebarNav`, `await getCollection('docs', …)`, build tree, render segment |
| `docs/src/content/docs/configuration.mdx` | +~20 — user-facing docs |
| `.changeset/sidebar-nav.md` | +~5 — minor bump entry |

**Fork-only tests** (`packages/starlight-llms-txt/test/sidebar-nav.test.ts`):

- `buildSectionTree` on flat docs produces a flat tree in expected order.
- `buildSectionTree` on nested ids groups by first path segment; uses title for leaves; synthesizes title-cased group labels when no index page exists.
- `buildSectionTree` reads `description` from `doc.data` into `node.description`.
- `buildSectionTree` with `promote`/`demote` patterns orders consistently with `llms-full.txt`.
- `renderSectionTree([], site)` → `''`.
- `renderSectionTree` snapshot against the xcsh#223 example output (descriptions present and absent, mixed siblings).
- `renderSectionTree` respects `base` URL prefix.
- `renderSectionTree` emits `- [Title](url)` without trailing colon/space when description is absent.

**Deferred follow-up.** If Starlight's `config.sidebar` is present and contains explicit group labels (object form, not slug-only), those labels are better group headings than title-cased path segments. Not in v1; will be a post-v1 enhancement keyed off a concrete demo where it matters.

## Feature 3 — `federatedSites`

**Config shape.** Mirrors existing `optionalLinks` exactly:

```ts
federatedSites?: Array<{
  label: string;
  url: string;
  description?: string;
}>;
```

**Placement.** After `## Sections`, before `## Notes`:

```
# Title
> description
## Documentation Sets     ← this site's aggregate files
## Sections               ← this site's nav tree
## Federated Sites        ← pointers to other sites
## Notes
## Optional
```

Ordering reflects cost gradient — an LLM that resolves its question in local `## Sections` never pays the cross-site fetch cost of `## Federated Sites`.

**Env-var wiring is not in this plugin's scope.** Downstream `docs-theme` will `JSON.parse(process.env.LLMS_FEDERATED_SITES || '[]')` and pass the array in via config. This plugin receives a typed array and nothing more.

**Files (upstream-candidate).**

| File | Change |
|---|---|
| `packages/starlight-llms-txt/types.ts` | +~10 — option type + context field |
| `packages/starlight-llms-txt/index.ts` | +1 — pass `opts.federatedSites ?? []` into context |
| `packages/starlight-llms-txt/federated-sites.ts` | new — `renderFederatedSites(sites) → string` (returns `''` when empty) |
| `packages/starlight-llms-txt/llms.txt.ts` | +~6 — call `renderFederatedSites`, push result as segment when non-empty |
| `docs/src/content/docs/configuration.mdx` | +~15 — user-facing docs |
| `.changeset/federated-sites.md` | +~5 — minor bump entry |

**Fork-only tests** (`packages/starlight-llms-txt/test/federated-sites.test.ts`):

- `renderFederatedSites([])` → `''`.
- `renderFederatedSites([{ label: 'WAF', url: '...' }])` → emits block with no description.
- `renderFederatedSites([{ label, url, description }])` → emits block including `: description`.
- Snapshot against the xcsh#223 example (2 entries with descriptions).
- Mixed case: some entries with descriptions, some without.

**Non-validation.** No `url` validation — consistent with `optionalLinks`. Duplicates not deduped. Order preserved as given.

# Testing Strategy (fork-only)

## Framework

Vitest. Matches the Astro ecosystem (Astro and Starlight themselves use Vitest); native ESM + TypeScript; built-in snapshots and `vi.mock`.

## Scope

**Unit-tested (pure helpers):**

| Helper | File |
|---|---|
| `buildSectionTree`, `renderSectionTree` | `sidebar-nav.ts` |
| `renderFederatedSites` | `federated-sites.ts` |
| `resolvePerPageMarkdownOptions`, `slugToPath`, `shouldExcludePage` | `per-page-markdown-utils.ts` |

**Deliberately not unit-tested:**

- `index.ts` — Astro wiring; covered by docs build.
- Route handlers (`llms.txt.ts`, `llms-full.txt.ts`, `llms-small.txt.ts`, `llms-custom.txt.ts`, `page-markdown.ts`) — call `getCollection`; covered by docs build.
- `entryToSimpleMarkdown.ts` — requires a running Astro container; covered by docs build.

## Layout

```
packages/starlight-llms-txt/
├── sidebar-nav.ts
├── federated-sites.ts
├── per-page-markdown-utils.ts
├── vitest.config.ts
└── test/
    ├── sidebar-nav.test.ts
    ├── federated-sites.test.ts
    ├── per-page-markdown-utils.test.ts
    └── __snapshots__/          (Vitest-managed)
```

Tests live inside the package subtree so the package is self-contained for any future consumer (including a future upstream).

## Fixtures

Inline in each test file. Each test constructs the minimal `doc`-shaped object with only the fields the helper under test accesses, cast to a structural type. No shared `fixtures/` directory — avoids coupling between tests that should be independent.

## Package changes

```jsonc
// packages/starlight-llms-txt/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

Root `package.json`:

```jsonc
"scripts": {
  "test": "pnpm --filter starlight-llms-txt test"
}
```

## Vitest config

`packages/starlight-llms-txt/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

No jsdom, no globals, no setup files.

## CI integration

`.github/workflows/ci.yml` gains a `test` job running in parallel with the existing `smoke` job. Both must pass on pull requests.

```yaml
jobs:
  test:
    name: Unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
      - uses: pnpm/action-setup@08c4be7e2e672a47d11bd04269e27e5f3e8529cb  # v6.0.0
      - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f  # v6.3.0
        with:
          node-version: 24.14.1
          cache: pnpm
      - run: pnpm i
      - run: pnpm --filter starlight-llms-txt test
  smoke:
    # existing job unchanged
```

## TDD flow during implementation

Each helper is authored after its test file exists and fails. Red → green → refactor per function. The implementation plan handoff will enforce this by making each "write test" step precede its paired "write implementation" step.

# Publishing Infrastructure (fork-only)

## §7.1 Package rename

```diff
// packages/starlight-llms-txt/package.json
- "name": "starlight-llms-txt",
+ "name": "@f5-sales-demo/starlight-llms-txt",
- "author": "delucis",
+ "author": "f5-sales-demo (fork of delucis/starlight-llms-txt)",
- "homepage": "https://delucis.github.io/starlight-llms-txt/",
+ "homepage": "https://f5-sales-demo.github.io/starlight-llms-txt/",
  "repository": {
    "type": "git",
-   "url": "https://github.com/delucis/starlight-llms-txt.git",
+   "url": "https://github.com/f5-sales-demo/starlight-llms-txt.git",
    "directory": "packages/starlight-llms-txt"
  },
- "bugs": "https://github.com/delucis/starlight-llms-txt/issues",
+ "bugs": "https://github.com/f5-sales-demo/starlight-llms-txt/issues",
  "publishConfig": { "access": "public" }
```

## §7.2 Release workflow

`.github/workflows/release.yml`:

```diff
    release:
      name: Release
-     if: ${{ github.repository_owner == 'delucis' }}
+     if: ${{ github.repository_owner == 'f5-sales-demo' }}
      runs-on: ubuntu-latest
      permissions:
        contents: write
        pull-requests: write
-       id-token: write
      steps:
        - uses: actions/checkout@...
        - uses: pnpm/action-setup@...
        - uses: actions/setup-node@...
          with:
            node-version: 24.14.1
            cache: "pnpm"
+           registry-url: 'https://registry.npmjs.org'
        - run: pnpm i
        - uses: changesets/action@...
          with:
            version: pnpm run ci-version
            publish: pnpm run ci-publish
            commit: "[ci] release"
            title: "[ci] release"
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
-           NPM_TOKEN: "" # See https://github.com/changesets/changesets/issues/1152#issuecomment-3190884868
+           NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
+           NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

`id-token: write` removed (no OIDC). `registry-url` writes the `.npmrc` line for npmjs auth. Both `NPM_TOKEN` (consumed by changesets) and `NODE_AUTH_TOKEN` (consumed by `setup-node`'s generated `.npmrc`) are set — harmless redundancy covering both consumers.

## §7.3 Changesets config

`.changeset/config.json`:

```diff
- "changelog": ["@changesets/changelog-github", { "repo": "delucis/starlight-llms-txt" }],
+ "changelog": ["@changesets/changelog-github", { "repo": "f5-sales-demo/starlight-llms-txt" }],
```

`ignore: ["starlight-llms-txt-docs"]` stays.

## §7.4 Docs site URL

`docs/astro.config.ts`:

```diff
- site: 'https://delucis.github.io',
+ site: 'https://f5-sales-demo.github.io',
```

Also update hardcoded links inside the same file (`social.github.href`, `editLink.baseUrl`) to point at `f5-sales-demo/starlight-llms-txt`.

## §7.5 Initial 1.0.0 changeset

`.changeset/v1-0-0.md`:

```markdown
---
"@f5-sales-demo/starlight-llms-txt": major
---

Initial release of the F5 XC Sales Demos fork, derived from `starlight-llms-txt@0.8.1`. Adds:

- `perPageMarkdown` — per-page `.md` endpoints (Tier 4 routing)
- `sidebarNav` — sidebar hierarchy in `llms.txt` (Tier 2 routing), with frontmatter descriptions inlined automatically
- `federatedSites` — cross-repo links block in `llms.txt` (Tier 1 routing)

The `starlight-llms-txt` package is authored by Chris Swithinbank (delucis). This fork exists to ship features needed by the f5-sales-demo documentation federation; we intend to upstream compatible features once they have been validated in production.
```

One entry covering all four features. changesets emits a single 1.0.0 release PR.

## §7.6 README

Replace `packages/starlight-llms-txt/README.md`:

```markdown
# @f5-sales-demo/starlight-llms-txt

Fork of [`starlight-llms-txt`](https://github.com/delucis/starlight-llms-txt) by Chris Swithinbank, extended for the [f5-sales-demo](https://github.com/f5-sales-demo) documentation federation.

## Additions over upstream

- `perPageMarkdown` — per-page `.md` endpoints
- `sidebarNav` — sidebar hierarchy in `llms.txt`, with frontmatter descriptions inlined automatically
- `federatedSites` — cross-repo links for federated doc portals

See the [configuration docs](https://f5-sales-demo.github.io/starlight-llms-txt/configuration/) for the full option reference.

## Relationship to upstream

Compatible features are intended to land upstream at `delucis/starlight-llms-txt` after production validation. Until then, this package tracks the f5-sales-demo integration needs.

## License

MIT — copyright Chris Swithinbank, fork modifications by f5-sales-demo contributors.
```

`LICENSE` stays byte-identical to upstream.

## §7.7 Pre-publish sanity checks (manual, outside this spec's automated scope)

Before the first `changesets publish` runs, confirm:

1. The `f5-sales-demo` npm organization exists at npmjs.com.
2. `robinmordasiewicz` is a member of that org with **publish** permission.
3. `@f5-sales-demo/starlight-llms-txt` has not been claimed by anyone else.
4. `NPM_TOKEN` secret exists on the repo (✅ already set during brainstorming — see §7.9).

Any of (1)–(3) failing will produce a `403 Forbidden` or `404 Not Found` during publish. Fix and retry by pushing any commit to `main`.

## §7.8 `files` array

```jsonc
// packages/starlight-llms-txt/package.json
"files": [
  "*.ts",
  "!*.test.ts",
  "!vitest.config.ts",
  "CHANGELOG.md"
]
```

- Auto-included by npm: `package.json`, `README.md`, `LICENSE`.
- Auto-excluded by npm: `node_modules/`, `.git*`, `.npmrc`, default dotfiles.
- Excluded by explicit negation: `*.test.ts`, `vitest.config.ts` (both would otherwise be matched by `*.ts`).
- Excluded by not being listed: `test/**`, `tsconfig.json`, `__snapshots__/`, any `.json` or `.md` other than `CHANGELOG.md`.

Delete `packages/starlight-llms-txt/.npmignore` — npm ignores it when `files` is set, and keeping both creates two sources of truth.

## §7.9 NPM token secret

Already created during brainstorming. Verified on `f5-sales-demo/starlight-llms-txt`:

```
$ gh secret list --repo f5-sales-demo/starlight-llms-txt --app actions
NPM_TOKEN    2026-04-22T05:17:48Z
```

Token belongs to npm user `robinmordasiewicz`. **The token value appeared in plaintext in the brainstorming transcript and must be rotated after the first successful release.**

# Release Plan & Sequencing

Single linear implementation sequence on `feature/enhancements-and-publishing`. Phase boundaries are the only defensible order — each phase has a verifiable exit state and no phase depends on unverified output from a later phase.

## Phase A — Fork-only scaffolding

**A1. Vitest harness.** Commit: `chore(test): add vitest harness`.

- Add `vitest` to `packages/starlight-llms-txt/devDependencies`.
- Add `packages/starlight-llms-txt/vitest.config.ts`.
- Add `packages/starlight-llms-txt/test/sanity.test.ts` asserting `1 + 1 === 2`.
- Add `test` / `test:watch` scripts (package + root).
- Add `test` job to `.github/workflows/ci.yml`.
- **Exit criteria:** `pnpm test` green locally; CI test job green on the push.

## Phase B — Features (TDD: test → implementation)

### B1. `sidebarNav` + auto-descriptions

- `test(sidebar-nav): describe buildSectionTree and renderSectionTree` — failing tests.
- `feat(sidebar-nav): add buildSectionTree and renderSectionTree helpers` — tests green.
- `feat: expose sidebarNav option in llms.txt` — route wiring + type + context + user-facing docs update + changeset + `sidebarNav: true` added to `docs/astro.config.ts` so the plugin dogfoods the feature on its own docs site (permanent, not reverted).
- **Exit criteria:** tests green; `pnpm build:docs` green; `docs/dist/llms.txt` contains a `## Sections` block rendered from the docs site's pages.

### B2. `federatedSites`

- `test(federated-sites): describe renderFederatedSites` — failing.
- `feat(federated-sites): add renderFederatedSites helper` — green.
- `feat: expose federatedSites option in llms.txt` — route wiring + type + context + docs + changeset.
- **Exit criteria:** tests green; docs build green; temporarily enabling `federatedSites: [{...}]` in `docs/astro.config.ts` produces the block. Revert the temporary enable before commit.

### B3. `perPageMarkdown` (rebase delucis#32 + micromatch)

- Before starting: re-run `gh api repos/delucis/starlight-llms-txt/pulls/32 --jq '.head.sha'`. If it differs from `2a1ae6d259cee07d7466281550b1103b3e48fc5f`, update targets accordingly.
- Fetch `tenzir/starlight-llms-txt@topic/markdown-pages`; cherry-pick each commit onto our branch; resolve conflicts; preserve mavam's authorship via `Co-Authored-By: Matthias Vallentin <53797+mavam@users.noreply.github.com>` on our picks.
- `refactor(per-page-markdown): extract pure utils` — pull `slugToPath`, `shouldExcludePage`, `resolvePerPageMarkdownOptions` into `per-page-markdown-utils.ts`.
- `test(per-page-markdown): describe pure utils` — failing.
- `feat(per-page-markdown): swap literal match for micromatch in excludePages` — tests green.
- **Exit criteria:** tests green; docs build produces per-page `.md` files (`docs/dist/getting-started.html.md`, `docs/dist/configuration.html.md`); honors `excludePages: ['index*']`.

## Phase C — Fork infra (publish-readiness)

### C1. Release workflow wiring

Commit: `ci(release): swap owner guard, use NPM_TOKEN`.

- Apply §7.2 diff.
- **Exit criteria:** `actionlint` passes; no structural changes to job wiring other than the listed diff.

### C2. Package rename + metadata

Commit: `chore(package): rename to @f5-sales-demo/starlight-llms-txt`.

All renames and consumer updates must land atomically in one commit — running `pnpm build:docs` or `pnpm test` between the package rename and the consumer updates will fail or silently no-op.

- Apply §7.1 rename to `packages/starlight-llms-txt/package.json`.
- Add §7.8 `files` array; delete `.npmignore`.
- Replace §7.6 README.
- Update §7.3 changesets config changelog pointer.
- Update §7.4 docs site URL.
- `docs/package.json`: rename the workspace dependency key from `"starlight-llms-txt": "workspace:*"` to `"@f5-sales-demo/starlight-llms-txt": "workspace:*"` (otherwise `pnpm build:docs` fails on a dangling workspace reference).
- `docs/astro.config.ts`: update the import from `'starlight-llms-txt'` to `'@f5-sales-demo/starlight-llms-txt'` (otherwise Astro fails to resolve the plugin).
- Update the root `package.json` `test` script filter from `starlight-llms-txt` to `@f5-sales-demo/starlight-llms-txt` (the pnpm filter is the package name; it stops matching after rename and `pnpm test` silently exits zero with no tests run).
- Update the `test` job in `.github/workflows/ci.yml` filter the same way.
- Run `pnpm install` to update `pnpm-lock.yaml` (reflects the new workspace dep key).
- **Exit criteria:** `pnpm pack --filter @f5-sales-demo/starlight-llms-txt --dry-run` shows the expected file list with the correct package name; `pnpm --filter @f5-sales-demo/starlight-llms-txt test` passes (explicitly naming the filter, so a silent no-match is impossible); `pnpm build:docs` green.

### C3. Initial 1.0.0 changeset

Commit: `docs(changeset): 1.0.0 initial fork release`.

- Add `.changeset/v1-0-0.md` per §7.5.
- **Exit criteria:** `pnpm changeset status` shows a pending major bump to `@f5-sales-demo/starlight-llms-txt`.

## Phase D — Merge & release

### D1. PR to `main`

Single PR titled `feat: v1.0.0 — fork release with sidebarNav, federatedSites, perPageMarkdown`. Preserves mavam's Co-Authored-By lines on B3's cherry-picked commits. Uses a merge commit strategy (not squash) so the upstream-candidate commits remain individually cherry-pickable later.

Pre-flight check: confirm `f5-sales-demo/starlight-llms-txt` repo settings allow merge commits (`gh api repos/f5-sales-demo/starlight-llms-txt --jq '.allow_merge_commit'` → `true`). If the repo is squash-only, either flip the setting for this one merge or accept that the cherry-pick-later workflow requires reconstructing individual commits from the squashed diff.

- **Exit criteria:** PR CI (test + smoke) green; reviewed; merged to `main` as a merge commit (not squash).

### D2. Automated release PR

First merge triggers the release workflow, which opens a "[ci] release" PR bumping `@f5-sales-demo/starlight-llms-txt` to 1.0.0 and regenerating `CHANGELOG.md`.

- **Exit criteria:** Release PR opens automatically; user reviews and merges.

### D3. Publish

Merging the release PR re-triggers the release workflow. `changesets/action` calls `changesets publish`, which runs `npm publish` using `NPM_TOKEN`.

- **Exit criteria:** `npm view @f5-sales-demo/starlight-llms-txt` shows 1.0.0; tag `@f5-sales-demo/starlight-llms-txt@1.0.0` pushed; GitHub Release created by `@changesets/changelog-github`.

## Rollback / retry

- Phase A–C CI failures: fix-forward on the same branch, no reset.
- D3 publish failure (403/404): the release PR is already merged and CHANGELOG/tags exist. Fix the underlying issue (npm org membership, token scope, name squatting) and re-trigger the workflow by pushing any commit to `main`. `changesets/action` is idempotent for already-bumped but unpublished versions.
- 1.0.0 ships broken: cut 1.0.1 via a new changeset. Do **not** `npm unpublish` — breaks any consumer who pinned 1.0.0 in the 72-hour window.

# Non-Goals

- Any changes to `docs-builder`, `docs-theme`, `docs`, `docs-control`, `xcsh`, or product repos. All downstream consumers, all separate worktrees.
- Upstream PR submission to `delucis/starlight-llms-txt`. Deferred per saved preference until production-validated across the f5-sales-demo fleet.
- Provenance / OIDC signing.
- Coverage reporting.
- Removing or replacing PR #32's 17-commit history with a squash. We replay their history to preserve bisectability for mavam.

# Deferred / Follow-ups

Tracked for post-v1:

- Use `config.sidebar` explicit group labels (object form) to override title-cased path-segment group names in `buildSectionTree`. Not blocking for v1; requires a concrete demo where it matters.
- Rename `## Federated Sites` to `## Related Sites` (or parameterize) before upstream submission if reviewers prefer a more generic heading.
- Enable npm provenance attestations. Requires switching to OIDC trusted publisher; reopens the §7.2 decision.
- Coverage reporting (`@vitest/coverage-v8`). Add when a regression warrants it.
- Rotate `NPM_TOKEN` after first successful release.

# References

- [llms.txt specification](https://llmstxt.org/)
- [xcsh#223 — cascading llms.txt knowledge hierarchy](https://github.com/f5-sales-demo/xcsh/issues/223)
- [delucis#32 — per-page markdown PR](https://github.com/delucis/starlight-llms-txt/pull/32) (head: `tenzir/starlight-llms-txt@topic/markdown-pages` / `2a1ae6d259cee07d7466281550b1103b3e48fc5f`)
- [delucis#28 — per-page markdown issue](https://github.com/delucis/starlight-llms-txt/issues/28)
- [starlight-llms-txt configuration docs](https://delucis.github.io/starlight-llms-txt/configuration/)
- [changesets/action npm auth discussion](https://github.com/changesets/changesets/issues/1152#issuecomment-3190884868)
