# @f5-sales-demo/starlight-llms-txt v1.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@f5-sales-demo/starlight-llms-txt@1.0.0` to npm — a fork of `delucis/starlight-llms-txt@0.8.1` with three new options (`sidebarNav`, `federatedSites`, `perPageMarkdown`) to support the xcsh#223 cascading llms.txt knowledge hierarchy. No upstream PR submission in this release (deferred until production-validated).

**Architecture:** Three new features implemented as pure helpers (for Vitest unit coverage) called from Astro route handlers. Two distinct commit sets on one branch: upstream-candidate commits (feature code, cleanly cherry-pickable to `delucis/main` later) and fork-only commits (package rename, NPM_TOKEN wiring, test harness, release workflow guard, README).

**Tech Stack:** TypeScript, Astro 6, Starlight ≥ 0.38, pnpm workspace, Vitest 3, Changesets, GitHub Actions, `@changesets/changelog-github`, `@changesets/cli`, npm automation token auth.

**Spec:** `specs/2026-04-22-starlight-llms-txt-fork-v1-design.md` is the source of truth. This plan implements that spec; any conflict is a plan bug.

**Branch:** All work on `feature/enhancements-and-publishing` in the worktree at `/workspace/starlight-llms-txt/.worktrees/enhancements-and-publishing`.

---

## File Structure

### New files (upstream-candidate)

| Path | Purpose |
|---|---|
| `packages/starlight-llms-txt/sidebar-nav.ts` | Pure helpers: `buildSectionTree`, `renderSectionTree` |
| `packages/starlight-llms-txt/federated-sites.ts` | Pure helper: `renderFederatedSites` |
| `packages/starlight-llms-txt/per-page-markdown-utils.ts` | Pure helpers: `resolvePerPageMarkdownOptions`, `slugToPath`, `shouldExcludePage` |
| `packages/starlight-llms-txt/page-markdown.ts` | Astro route handler for `/[...slug].md` (from delucis#32 cherry-pick) |
| `packages/starlight-llms-txt/page-markdown-generator.ts` | Single-doc render pipeline (from delucis#32 cherry-pick) |
| `.changeset/sidebar-nav.md` | Minor bump entry |
| `.changeset/federated-sites.md` | Minor bump entry |
| `.changeset/per-page-markdown.md` | Minor bump entry |

### New files (fork-only)

| Path | Purpose |
|---|---|
| `packages/starlight-llms-txt/vitest.config.ts` | Vitest config |
| `packages/starlight-llms-txt/test/sidebar-nav.test.ts` | Unit tests |
| `packages/starlight-llms-txt/test/federated-sites.test.ts` | Unit tests |
| `packages/starlight-llms-txt/test/per-page-markdown-utils.test.ts` | Unit tests |
| `.changeset/v1-0-0.md` | Major bump entry for v1.0.0 release |

### Modified files (upstream-candidate)

| Path | Change |
|---|---|
| `packages/starlight-llms-txt/types.ts` | Add `sidebarNav`, `federatedSites`, `perPageMarkdown` options + context fields |
| `packages/starlight-llms-txt/index.ts` | Pass new options into `projectContext`; inject per-page markdown route when enabled |
| `packages/starlight-llms-txt/llms.txt.ts` | Render `## Sections` and `## Federated Sites` blocks |
| `packages/starlight-llms-txt/entryToSimpleMarkdown.ts` | Share helper with `page-markdown-generator.ts` (from delucis#32) |
| `docs/astro.config.ts` | Enable `sidebarNav: true` and `perPageMarkdown: true` for dogfooding; update site URL / GitHub links |
| `docs/src/content/docs/configuration.mdx` | User-facing docs for new options |

### Modified files (fork-only)

| Path | Change |
|---|---|
| `packages/starlight-llms-txt/package.json` | Rename to `@f5-sales-demo/starlight-llms-txt`, add `files` array, add test scripts, add `vitest` devDep |
| `packages/starlight-llms-txt/README.md` | Replace with fork notice |
| `packages/starlight-llms-txt/.npmignore` | Delete (superseded by `files` array) |
| `docs/package.json` | Rename workspace dep key |
| `docs/astro.config.ts` | Rename import specifier |
| `package.json` (root) | Add `test` script; update filter for rename |
| `.changeset/config.json` | Update changelog repo pointer |
| `.github/workflows/ci.yml` | Add `test` job |
| `.github/workflows/release.yml` | Repo owner guard swap, remove `id-token`, add `NPM_TOKEN`/`NODE_AUTH_TOKEN` and `registry-url` |

---

## Task 1: Add Vitest harness

**Phase A of the spec.** Lay the test-running foundation before writing any features. No consumer-visible change.

**Files:**

- Create: `packages/starlight-llms-txt/vitest.config.ts`
- Create: `packages/starlight-llms-txt/test/sanity.test.ts`
- Modify: `packages/starlight-llms-txt/package.json` (add `vitest` devDep + scripts)
- Modify: `package.json` (root — add `test` convenience script)
- Modify: `.github/workflows/ci.yml` (add `test` job)

- [ ] **Step 1.1: Create Vitest config**

Write `packages/starlight-llms-txt/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
 test: {
  include: ['test/**/*.test.ts'],
 },
});
```

- [ ] **Step 1.2: Create sanity test**

Write `packages/starlight-llms-txt/test/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
 it('runs', () => {
  expect(1 + 1).toBe(2);
 });
});
```

- [ ] **Step 1.3: Add test scripts and vitest devDep to the package**

Edit `packages/starlight-llms-txt/package.json` — add the two `scripts` entries and `vitest` under `devDependencies`:

```diff
  "devDependencies": {
    "@astrojs/starlight": "^0.38.3",
-   "astro": "^6.1.5"
+   "astro": "^6.1.5",
+   "vitest": "^3.2.0"
  },
+ "scripts": {
+   "test": "vitest run",
+   "test:watch": "vitest"
+ },
```

The package has no existing `scripts` block — add it between `devDependencies` and `peerDependencies`.

- [ ] **Step 1.4: Add root convenience script**

Edit the root `package.json` `scripts` block:

```diff
  "scripts": {
    "build:docs": "pnpm -F starlight-llms-txt-docs build",
    "ci-version": "changeset version && pnpm install --no-frozen-lockfile",
-   "ci-publish": "changeset publish"
+   "ci-publish": "changeset publish",
+   "test": "pnpm --filter starlight-llms-txt test"
  },
```

Note: filter uses the pre-rename name `starlight-llms-txt`. Task 13 updates this after the rename.

- [ ] **Step 1.5: Install the new dev dependency**

Run:

```bash
pnpm install
```

Expected: resolves `vitest@^3.2.0`, writes `pnpm-lock.yaml` update.

- [ ] **Step 1.6: Run the sanity test locally**

Run:

```bash
pnpm test
```

Expected: `Test Files  1 passed (1)`, `Tests  1 passed (1)`.

- [ ] **Step 1.7: Add CI test job**

Edit `.github/workflows/ci.yml`. The existing file has one `smoke` job. Add a parallel `test` job. Full file after edit:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    name: Unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      - uses: pnpm/action-setup@08c4be7e2e672a47d11bd04269e27e5f3e8529cb # v6.0.0
      - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
        with:
          node-version: 24.14.1
          cache: pnpm
      - run: pnpm i
      - run: pnpm --filter starlight-llms-txt test
  smoke:
    name: Smoke test (docs build)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      - uses: pnpm/action-setup@08c4be7e2e672a47d11bd04269e27e5f3e8529cb # v6.0.0
      - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
        with:
          node-version: 24.14.1
          cache: pnpm
      - run: pnpm i
      - run: pnpm --filter ./docs build
```

- [ ] **Step 1.8: Verify the CI YAML**

Run:

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo OK
```

Expected: `OK`.

- [ ] **Step 1.9: Commit**

```bash
git add packages/starlight-llms-txt/vitest.config.ts \
        packages/starlight-llms-txt/test/sanity.test.ts \
        packages/starlight-llms-txt/package.json \
        package.json \
        pnpm-lock.yaml \
        .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
chore(test): add vitest harness

Adds vitest 3.x as a devDependency of packages/starlight-llms-txt, a
minimal vitest.config.ts, a sanity test, test / test:watch scripts on
the package, a pnpm --filter test script on the root, and an "Unit
tests" CI job parallel to the existing docs-build smoke job.

No behavior change; lays the foundation for subsequent feature tasks
which are test-driven.
EOF
)"
```

---

## Task 2: Implement `buildSectionTree` (TDD)

**Phase B1 of the spec, part 1 of 2.** Pure helper that groups a collection of docs into a two-level section tree. Upstream-candidate.

**Files:**

- Create: `packages/starlight-llms-txt/test/sidebar-nav.test.ts`
- Create: `packages/starlight-llms-txt/sidebar-nav.ts`

- [ ] **Step 2.1: Write the failing tests**

Create `packages/starlight-llms-txt/test/sidebar-nav.test.ts` (this task covers only `buildSectionTree` cases; Task 3 adds `renderSectionTree` cases to the same file):

```ts
import { describe, it, expect } from 'vitest';
import { buildSectionTree } from '../sidebar-nav';

type DocFixture = {
 id: string;
 data: {
  title: string;
  description?: string;
  draft?: boolean;
  sidebar?: { order?: number };
 };
};

const doc = (id: string, overrides: Partial<DocFixture['data']> = {}): DocFixture => ({
 id,
 data: { title: id, ...overrides },
});

describe('buildSectionTree', () => {
 it('returns empty array for empty input', () => {
  expect(buildSectionTree([])).toEqual([]);
 });

 it('excludes root index from the tree', () => {
  const tree = buildSectionTree([doc('index'), doc('overview')]);
  expect(tree).toHaveLength(1);
  expect(tree[0]?.slug).toBe('overview');
 });

 it('excludes draft pages', () => {
  const tree = buildSectionTree([doc('overview'), doc('secret', { draft: true })]);
  expect(tree).toHaveLength(1);
  expect(tree[0]?.slug).toBe('overview');
 });

 it('produces a flat tree for top-level pages in title order', () => {
  const tree = buildSectionTree([
   doc('configuration', { title: 'Configuration' }),
   doc('getting-started', { title: 'Getting Started' }),
  ]);
  expect(tree.map((n) => n.title)).toEqual(['Configuration', 'Getting Started']);
  expect(tree.every((n) => n.children.length === 0)).toBe(true);
 });

 it('honors sidebar.order over title order', () => {
  const tree = buildSectionTree([
   doc('b', { title: 'B', sidebar: { order: 2 } }),
   doc('a', { title: 'A', sidebar: { order: 1 } }),
  ]);
  expect(tree.map((n) => n.slug)).toEqual(['a', 'b']);
 });

 it('groups nested ids under a synthetic title-cased parent when no index page exists', () => {
  const tree = buildSectionTree([
   doc('demo/phase-1-build', { title: 'Phase 1 — Build' }),
   doc('demo/phase-2-attack', { title: 'Phase 2 — Attack' }),
  ]);
  expect(tree).toHaveLength(1);
  expect(tree[0]?.title).toBe('Demo');
  expect(tree[0]?.slug).toBeUndefined();
  expect(tree[0]?.children.map((c) => c.title)).toEqual([
   'Phase 1 — Build',
   'Phase 2 — Attack',
  ]);
 });

 it('upgrades a group with data from its index page when present', () => {
  const tree = buildSectionTree([
   doc('demo/index', { title: 'Demo', description: '4-phase demo exercise' }),
   doc('demo/phase-1-build', { title: 'Phase 1 — Build' }),
  ]);
  expect(tree).toHaveLength(1);
  expect(tree[0]?.title).toBe('Demo');
  expect(tree[0]?.description).toBe('4-phase demo exercise');
  expect(tree[0]?.slug).toBe('demo');
  expect(tree[0]?.children).toHaveLength(1);
  expect(tree[0]?.children[0]?.slug).toBe('demo/phase-1-build');
 });

 it('propagates per-doc description into leaf nodes', () => {
  const tree = buildSectionTree([
   doc('overview', { title: 'Overview', description: 'Product overview' }),
  ]);
  expect(tree[0]?.description).toBe('Product overview');
 });

 it('applies promote/demote to top-level sort order', () => {
  const tree = buildSectionTree(
   [doc('zeta'), doc('alpha'), doc('references')],
   ['zeta*'], // promote
   ['references*'], // demote
  );
  expect(tree.map((n) => n.slug)).toEqual(['zeta', 'alpha', 'references']);
 });
});
```

- [ ] **Step 2.2: Run to verify failure**

Run:

```bash
pnpm --filter starlight-llms-txt test test/sidebar-nav.test.ts
```

Expected: `Failed to resolve import "../sidebar-nav"` — the module doesn't exist yet. This is the red state.

- [ ] **Step 2.3: Implement `buildSectionTree`**

Create `packages/starlight-llms-txt/sidebar-nav.ts`:

```ts
import micromatch from 'micromatch';

export interface SectionNode {
 title: string;
 description?: string;
 /** Slug for the linkable page; undefined for synthetic parent groups without an index page. */
 slug?: string;
 children: SectionNode[];
}

type DocLike = {
 id: string;
 data: {
  title: string;
  description?: string;
  draft?: boolean;
  sidebar?: { order?: number };
 };
};

function titleCase(segment: string): string {
 return segment
  .split(/[-_]/)
  .filter(Boolean)
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(' ');
}

/** Sort key emulating generator.ts promote/demote prioritization for a single id. */
function sortKey(id: string, promote: string[], demote: string[]): string {
 const demoted = demote.findIndex((expr) => micromatch.isMatch(id, expr));
 const promoted = demoted > -1 ? -1 : promote.findIndex((expr) => micromatch.isMatch(id, expr));
 const prefixLength =
  (promoted > -1 ? promote.length - promoted : 0) + demote.length - demoted - 1;
 return '_'.repeat(prefixLength) + id;
}

export function buildSectionTree(
 docs: DocLike[],
 promote: string[] = [],
 demote: string[] = [],
): SectionNode[] {
 const filtered = docs.filter((d) => d.id !== 'index' && !d.data.draft);

 const sorted = [...filtered].sort((a, b) => {
  const keyA = sortKey(a.id, promote, demote);
  const keyB = sortKey(b.id, promote, demote);
  if (keyA !== keyB) return keyA.localeCompare(keyB);
  const orderA = a.data.sidebar?.order ?? Infinity;
  const orderB = b.data.sidebar?.order ?? Infinity;
  if (orderA !== orderB) return orderA - orderB;
  return a.data.title.localeCompare(b.data.title);
 });

 const groups = new Map<string, SectionNode>();
 const result: SectionNode[] = [];

 for (const d of sorted) {
  const slashIdx = d.id.indexOf('/');
  if (slashIdx === -1) {
   result.push({
    title: d.data.title,
    description: d.data.description,
    slug: d.id,
    children: [],
   });
   continue;
  }

  const groupKey = d.id.substring(0, slashIdx);
  const remainder = d.id.substring(slashIdx + 1);
  const isGroupIndex = remainder === 'index';

  let group = groups.get(groupKey);
  if (!group) {
   group = {
    title: isGroupIndex ? d.data.title : titleCase(groupKey),
    description: isGroupIndex ? d.data.description : undefined,
    slug: isGroupIndex ? groupKey : undefined,
    children: [],
   };
   groups.set(groupKey, group);
   result.push(group);
  } else if (isGroupIndex) {
   group.title = d.data.title;
   group.description = d.data.description;
   group.slug = groupKey;
  }

  if (!isGroupIndex) {
   group.children.push({
    title: d.data.title,
    description: d.data.description,
    slug: d.id,
    children: [],
   });
  }
 }

 return result;
}
```

- [ ] **Step 2.4: Run to verify tests pass**

Run:

```bash
pnpm --filter starlight-llms-txt test test/sidebar-nav.test.ts
```

Expected: all 9 tests in the `buildSectionTree` describe block pass.

- [ ] **Step 2.5: Commit**

```bash
git add packages/starlight-llms-txt/sidebar-nav.ts \
        packages/starlight-llms-txt/test/sidebar-nav.test.ts
git commit -m "$(cat <<'EOF'
feat(sidebar-nav): add buildSectionTree helper

Pure helper that transforms a collection of docs into a two-level
section tree. Filters out root index and drafts, sorts by promote /
demote (reusing the generator.ts prioritization scheme) then
sidebar.order then title, groups nested ids by first path segment,
and upgrades synthetic groups when an index page is present.

Unit-tested against inline doc fixtures. No integration with the
Astro plugin pipeline yet — that wires up in the sidebarNav feature
commit.
EOF
)"
```

---

## Task 3: Implement `renderSectionTree` (TDD)

**Phase B1 of the spec, part 2 of 2.** Pure helper that renders the section tree as a markdown list. Upstream-candidate.

**Files:**

- Modify: `packages/starlight-llms-txt/test/sidebar-nav.test.ts` (append new describe block)
- Modify: `packages/starlight-llms-txt/sidebar-nav.ts` (add `renderSectionTree` export)

- [ ] **Step 3.1: Append failing tests for `renderSectionTree`**

Add a new import at the top of `packages/starlight-llms-txt/test/sidebar-nav.test.ts`:

```diff
- import { buildSectionTree } from '../sidebar-nav';
+ import { buildSectionTree, renderSectionTree, type SectionNode } from '../sidebar-nav';
```

Append this `describe` block to the bottom of the same file:

```ts
describe('renderSectionTree', () => {
 const site = new URL('https://example.com/docs/');

 const node = (
  title: string,
  slug: string | undefined,
  description?: string,
  children: SectionNode[] = [],
 ): SectionNode => ({ title, slug, description, children });

 it('returns empty string for empty tree', () => {
  expect(renderSectionTree([], site)).toBe('');
 });

 it('renders a flat list of linked nodes', () => {
  const out = renderSectionTree(
   [node('Overview', 'overview'), node('Configuration', 'configuration')],
   site,
  );
  expect(out).toBe(
   '## Sections\n' +
    '\n' +
    '- [Overview](https://example.com/docs/overview/)\n' +
    '- [Configuration](https://example.com/docs/configuration/)',
  );
 });

 it('appends ": description" when description is present', () => {
  const out = renderSectionTree(
   [node('Overview', 'overview', 'Product overview')],
   site,
  );
  expect(out).toBe(
   '## Sections\n\n- [Overview](https://example.com/docs/overview/): Product overview',
  );
 });

 it('omits the colon when description is absent', () => {
  const out = renderSectionTree([node('Overview', 'overview')], site);
  expect(out.endsWith('(https://example.com/docs/overview/)')).toBe(true);
  expect(out).not.toContain(':');
 });

 it('renders synthetic groups without a link', () => {
  const out = renderSectionTree(
   [node('Demo', undefined, undefined, [node('Phase 1', 'demo/phase-1')])],
   site,
  );
  expect(out).toBe(
   '## Sections\n' +
    '\n' +
    '- Demo\n' +
    '  - [Phase 1](https://example.com/docs/demo/phase-1/)',
  );
 });

 it('renders nested linked groups with descriptions', () => {
  const out = renderSectionTree(
   [
    node('Demo', 'demo', '4-phase demo exercise', [
     node('Phase 1 — Build', 'demo/phase-1-build', 'Deploy infrastructure via API'),
    ]),
   ],
   site,
  );
  expect(out).toBe(
   '## Sections\n' +
    '\n' +
    '- [Demo](https://example.com/docs/demo/): 4-phase demo exercise\n' +
    '  - [Phase 1 — Build](https://example.com/docs/demo/phase-1-build/): Deploy infrastructure via API',
  );
 });

 it('matches the xcsh#223 reference output', () => {
  const out = renderSectionTree(
   [
    node('Overview', 'overview', 'Product overview and architecture'),
    node('Demo', 'demo', '4-phase demo exercise', [
     node('Phase 1 — Build', 'demo/phase-1-build', 'Deploy infrastructure via API'),
     node('Phase 2 — Attack', 'demo/phase-2-attack', 'Simulated attack traffic'),
     node('Phase 3 — Mitigate', 'demo/phase-3-mitigate', 'Apply and verify mitigations'),
     node('Phase 4 — Teardown', 'demo/phase-4-teardown', 'Clean up demo objects'),
    ]),
    node('API Reference', 'api-reference', 'REST API endpoints'),
    node('FAQ', 'faq', 'Common questions'),
   ],
   new URL('https://f5-sales-demo.github.io/csd/'),
  );
  expect(out).toMatchSnapshot();
 });
});
```

- [ ] **Step 3.2: Run to verify failure**

Run:

```bash
pnpm --filter starlight-llms-txt test test/sidebar-nav.test.ts
```

Expected: the 9 `buildSectionTree` tests still pass; the new `renderSectionTree` block fails with "renderSectionTree is not a function" or an equivalent import error.

- [ ] **Step 3.3: Implement `renderSectionTree`**

Append to `packages/starlight-llms-txt/sidebar-nav.ts`:

```ts
export function renderSectionTree(tree: SectionNode[], site: URL): string {
 if (tree.length === 0) return '';

 const lines: string[] = ['## Sections', ''];

 function renderNode(node: SectionNode, depth: number): void {
  const indent = '  '.repeat(depth);
  const descSuffix = node.description ? `: ${node.description}` : '';
  if (node.slug !== undefined) {
   const url = new URL(`./${node.slug}/`, site);
   lines.push(`${indent}- [${node.title}](${url})${descSuffix}`);
  } else {
   lines.push(`${indent}- ${node.title}${descSuffix}`);
  }
  for (const child of node.children) {
   renderNode(child, depth + 1);
  }
 }

 for (const node of tree) {
  renderNode(node, 0);
 }

 return lines.join('\n');
}
```

- [ ] **Step 3.4: Run tests and accept snapshot**

Run:

```bash
pnpm --filter starlight-llms-txt test test/sidebar-nav.test.ts
```

First run will prompt about a new snapshot — Vitest auto-accepts on first run (writes `test/__snapshots__/sidebar-nav.test.ts.snap`). Verify the generated snapshot file by reading it:

```bash
cat packages/starlight-llms-txt/test/__snapshots__/sidebar-nav.test.ts.snap
```

Expected content (snapshot is Vitest's pretty-printed form; the exact serialization will be a single string matching the xcsh#223 reference block):

```
// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html

exports[`renderSectionTree > matches the xcsh#223 reference output 1`] = `
"## Sections

- [Overview](https://f5-sales-demo.github.io/csd/overview/): Product overview and architecture
- [Demo](https://f5-sales-demo.github.io/csd/demo/): 4-phase demo exercise
  - [Phase 1 — Build](https://f5-sales-demo.github.io/csd/demo/phase-1-build/): Deploy infrastructure via API
  - [Phase 2 — Attack](https://f5-sales-demo.github.io/csd/demo/phase-2-attack/): Simulated attack traffic
  - [Phase 3 — Mitigate](https://f5-sales-demo.github.io/csd/demo/phase-3-mitigate/): Apply and verify mitigations
  - [Phase 4 — Teardown](https://f5-sales-demo.github.io/csd/demo/phase-4-teardown/): Clean up demo objects
- [API Reference](https://f5-sales-demo.github.io/csd/api-reference/): REST API endpoints
- [FAQ](https://f5-sales-demo.github.io/csd/faq/): Common questions"
`;
```

If the snapshot shows unexpected drift (different indentation, missing newlines, etc.) — fix the implementation, not the snapshot.

- [ ] **Step 3.5: Re-run full test file**

Run:

```bash
pnpm --filter starlight-llms-txt test test/sidebar-nav.test.ts
```

Expected: all tests pass, 1 snapshot written.

- [ ] **Step 3.6: Commit**

```bash
git add packages/starlight-llms-txt/sidebar-nav.ts \
        packages/starlight-llms-txt/test/sidebar-nav.test.ts \
        packages/starlight-llms-txt/test/__snapshots__/sidebar-nav.test.ts.snap
git commit -m "$(cat <<'EOF'
feat(sidebar-nav): add renderSectionTree helper

Pure helper that renders a SectionNode tree as a markdown list under
a ## Sections heading. Returns empty string for empty trees so the
caller can unconditionally push the result as a segment. Synthetic
groups (no slug) render without a link; descriptions append as
": description" when present; nesting uses two-space indent.

Unit-tested including a snapshot against the xcsh#223 reference
output.
EOF
)"
```

---

## Task 4: Wire `sidebarNav` option into the plugin

**Phase B1 of the spec, part 3.** Connect the pure helpers to Astro routes and the plugin config. Upstream-candidate (except the `.changeset/sidebar-nav.md` which is fork-only infrastructure but goes in this commit for atomicity — it's harmless if cherry-picked upstream, they'd just delete it).

**Files:**

- Modify: `packages/starlight-llms-txt/types.ts`
- Modify: `packages/starlight-llms-txt/index.ts`
- Modify: `packages/starlight-llms-txt/llms.txt.ts`
- Modify: `docs/astro.config.ts` (enable `sidebarNav: true` for dogfooding)
- Modify: `docs/src/content/docs/configuration.mdx`
- Create: `.changeset/sidebar-nav.md`

- [ ] **Step 4.1: Add `sidebarNav` to user options type**

Edit `packages/starlight-llms-txt/types.ts`. Inside the `StarlightLllmsTextOptions` interface (after the `rawContent` block), append:

```ts
 /**
  * When enabled, generate a `## Sections` block in `llms.txt` listing the site's pages
  * in hierarchical order. Pages are grouped by first path segment (e.g. `demo/phase-1-build`
  * under a `demo` group). If a group has an index page (`demo/index`), its frontmatter is
  * used for the group heading; otherwise the segment is title-cased. Each entry's
  * `description` (from frontmatter) is appended automatically when present.
  *
  * Respects the `promote` and `demote` options for ordering. Draft pages and non-default
  * locales are excluded.
  *
  * @default false
  */
 sidebarNav?: boolean;
```

In the `ProjectContext` interface (earlier in the same file), add a `sidebarNav` field:

```diff
  pageSeparator: NonNullable<StarlightLllmsTextOptions['pageSeparator']>;
  rawContent: NonNullable<StarlightLllmsTextOptions['rawContent']>;
+ sidebarNav: NonNullable<StarlightLllmsTextOptions['sidebarNav']>;
```

- [ ] **Step 4.2: Pass the option into `projectContext`**

Edit `packages/starlight-llms-txt/index.ts`. Inside the `projectContext` object literal (roughly around line 43-61), add:

```diff
  rawContent: opts.rawContent ?? false,
+ sidebarNav: opts.sidebarNav ?? false,
```

- [ ] **Step 4.3: Wire the helper into `llms.txt.ts`**

Edit `packages/starlight-llms-txt/llms.txt.ts`. Replace the entire file with:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import { buildSectionTree, renderSectionTree } from './sidebar-nav';
import { ensureTrailingSlash, getSiteTitle, isDefaultLocale } from './utils';

// Explicitly set this to prerender so it works the same way for sites in `server` mode.
export const prerender = true;
/**
 * Route that generates an introductory summary of this site for LLMs.
 */
export const GET: APIRoute = async (context) => {
 const title = getSiteTitle();
 const description = starlightLllmsTxtContext.description
  ? `> ${starlightLllmsTxtContext.description}`
  : '';
 const site = new URL(ensureTrailingSlash(starlightLllmsTxtContext.base), context.site);
 const llmsFullLink = new URL('./llms-full.txt', site);
 const llmsSmallLink = new URL('./llms-small.txt', site);

 const segments = [`# ${title}`];
 if (description) segments.push(description);
 if (starlightLllmsTxtContext.details) segments.push(starlightLllmsTxtContext.details);

 // Further documentation links.
 segments.push(`## Documentation Sets`);
 segments.push(
  [
   `- [Abridged documentation](${llmsSmallLink}): a compact version of the documentation for ${getSiteTitle()}, with non-essential content removed`,
   `- [Complete documentation](${llmsFullLink}): the full documentation for ${getSiteTitle()}`,
   ...starlightLllmsTxtContext.customSets.map(
    ({ label, description, slug }) =>
     `- [${label}](${new URL(`./_llms-txt/${slug}.txt`, site)})` +
     (description ? `: ${description}` : '')
   ),
  ].join('\n')
 );

 // Sidebar navigation — Tier 2 routing.
 if (starlightLllmsTxtContext.sidebarNav) {
  const docs = await getCollection('docs', (doc) => isDefaultLocale(doc) && !doc.data.draft);
  const tree = buildSectionTree(
   docs,
   starlightLllmsTxtContext.promote,
   starlightLllmsTxtContext.demote
  );
  const rendered = renderSectionTree(tree, site);
  if (rendered) segments.push(rendered);
 }

 // Additional notes.
 segments.push(`## Notes`);
 segments.push(`- The complete documentation includes all content from the official documentation
- The content is automatically generated from the same source as the official documentation`);

 // Optional links.
 if (starlightLllmsTxtContext.optionalLinks.length > 0) {
  segments.push('## Optional');
  segments.push(
   starlightLllmsTxtContext.optionalLinks
    .map(
     (link) =>
      `- [${link.label}](${link.url})${link.description ? `: ${link.description}` : ''}`
    )
    .join('\n')
  );
 }

 return new Response(segments.join('\n\n') + '\n');
};
```

Changes: add `getCollection` and `isDefaultLocale` imports; import the new helpers; add the conditional `if (sidebarNav)` block that fetches the collection, builds the tree, renders, and pushes it as a segment between `## Documentation Sets` and `## Notes`.

- [ ] **Step 4.4: Enable sidebarNav in the docs site (dogfood)**

Edit `docs/astro.config.ts`. Inside the `starlightLlmsTxt({...})` options, add `sidebarNav: true`:

```diff
  starlightLlmsTxt({
    description:
      'starlight-llms-txt is a plugin for the Starlight documentation website framework that auto-generates llms.txt context files for large language models based on a documentation site’s content.',
+   sidebarNav: true,
    optionalLinks: [
      ...
```

- [ ] **Step 4.5: Update user-facing docs**

Edit `docs/src/content/docs/configuration.mdx`. Append a new section (the file uses Starlight's standard MDX format; add the section at the bottom, before any import/export footers):

```md
## `sidebarNav`

**type:** `boolean`
**default:** `false`

When enabled, `llms.txt` includes a `## Sections` block listing the site's pages in hierarchical order. Pages are grouped by first path segment (e.g. `demo/phase-1-build` under a `demo` group). If a group has an index page (`demo/index.mdx`), its frontmatter title and description are used for the group heading; otherwise the path segment is title-cased.

Each entry's `description` (from frontmatter) is appended automatically when present:

```markdown
## Sections

- [Overview](https://example.com/overview/): Product overview and architecture
- [Demo](https://example.com/demo/): 4-phase demo exercise
  - [Phase 1 — Build](https://example.com/demo/phase-1-build/): Deploy infrastructure via API
```

Respects the `promote` and `demote` options for ordering. Draft pages and non-default locales are excluded.

```

- [ ] **Step 4.6: Add changeset**

Create `.changeset/sidebar-nav.md`:

```md
---
"starlight-llms-txt": minor
---

Add `sidebarNav` option. When enabled, the plugin includes a `## Sections` block in `llms.txt` with the site's pages grouped hierarchically. Entries include frontmatter descriptions inline when present.
```

Note: the package name in the changeset header is `starlight-llms-txt` (pre-rename). Task 13's atomic rename commit will leave this as-is because changesets are consumed at release time and the `.changeset/v1-0-0.md` in Task 14 supersedes this for the first release.
If a future release uses this changeset standalone, it will need its package header updated — but for v1.0.0 it's bundled into the major-bump changeset.

- [ ] **Step 4.7: Run unit tests**

Run:

```bash
pnpm --filter starlight-llms-txt test
```

Expected: all tests still pass (no new tests added in this task, Tasks 2 and 3 coverage unchanged).

- [ ] **Step 4.8: Run docs build and inspect output**

Run:

```bash
pnpm build:docs
```

Expected: build completes; `docs/dist/llms.txt` exists.

Inspect:

```bash
grep -A 20 '^## Sections' docs/dist/llms.txt
```

Expected: a `## Sections` block listing the docs site's pages (`getting-started`, `configuration`). Example:

```
## Sections

- [Configuration](https://f5-sales-demo.github.io/starlight-llms-txt/configuration/)
- [Getting Started](https://f5-sales-demo.github.io/starlight-llms-txt/getting-started/)
```

The URLs may still use `delucis.github.io` at this point — that host rename happens in Task 13. The structure is what matters here.

- [ ] **Step 4.9: Commit**

```bash
git add packages/starlight-llms-txt/types.ts \
        packages/starlight-llms-txt/index.ts \
        packages/starlight-llms-txt/llms.txt.ts \
        docs/astro.config.ts \
        docs/src/content/docs/configuration.mdx \
        .changeset/sidebar-nav.md
git commit -m "$(cat <<'EOF'
feat: add sidebarNav option to include a ## Sections block in llms.txt

When sidebarNav is true, llms.txt renders a hierarchical page list
between ## Documentation Sets and ## Notes. The tree is built from
getCollection('docs') using the same filter as generator.ts
(default-locale, non-draft) and sorted with the existing
promote/demote system. Groups are formed by first path segment;
groups with an index page use that page's frontmatter. Frontmatter
descriptions are appended inline when present.

Enabled on the docs site for dogfooding.
EOF
)"
```

---

## Task 5: Implement `renderFederatedSites` (TDD)

**Phase B2 of the spec, part 1 of 2.** Pure helper that renders a list of federated sites. Upstream-candidate.

**Files:**

- Create: `packages/starlight-llms-txt/test/federated-sites.test.ts`
- Create: `packages/starlight-llms-txt/federated-sites.ts`

- [ ] **Step 5.1: Write the failing tests**

Create `packages/starlight-llms-txt/test/federated-sites.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderFederatedSites } from '../federated-sites';

describe('renderFederatedSites', () => {
 it('returns empty string for empty list', () => {
  expect(renderFederatedSites([])).toBe('');
 });

 it('renders a single entry without description', () => {
  expect(
   renderFederatedSites([{ label: 'WAF', url: 'https://example.com/waf/llms.txt' }]),
  ).toBe('## Federated Sites\n\n- [WAF](https://example.com/waf/llms.txt)');
 });

 it('renders a single entry with description', () => {
  expect(
   renderFederatedSites([
    { label: 'WAF', url: 'https://example.com/waf/llms.txt', description: 'Web application firewall' },
   ]),
  ).toBe('## Federated Sites\n\n- [WAF](https://example.com/waf/llms.txt): Web application firewall');
 });

 it('preserves given order and handles mixed entries', () => {
  const out = renderFederatedSites([
   { label: 'WAF', url: 'https://example.com/waf/llms.txt', description: 'Web application firewall' },
   { label: 'CSD', url: 'https://example.com/csd/llms.txt' },
   { label: 'DDOS', url: 'https://example.com/ddos/llms.txt', description: 'DDoS protection' },
  ]);
  expect(out).toBe(
   '## Federated Sites\n' +
    '\n' +
    '- [WAF](https://example.com/waf/llms.txt): Web application firewall\n' +
    '- [CSD](https://example.com/csd/llms.txt)\n' +
    '- [DDOS](https://example.com/ddos/llms.txt): DDoS protection',
  );
 });

 it('matches the xcsh#223 reference output', () => {
  const out = renderFederatedSites([
   { label: 'WAF', url: 'https://f5-sales-demo.github.io/waf/llms.txt', description: 'Web application firewall' },
   { label: 'CSD', url: 'https://f5-sales-demo.github.io/csd/llms.txt', description: 'Client-side defense' },
  ]);
  expect(out).toMatchSnapshot();
 });
});
```

- [ ] **Step 5.2: Run to verify failure**

Run:

```bash
pnpm --filter starlight-llms-txt test test/federated-sites.test.ts
```

Expected: `Failed to resolve import "../federated-sites"`.

- [ ] **Step 5.3: Implement `renderFederatedSites`**

Create `packages/starlight-llms-txt/federated-sites.ts`:

```ts
export interface FederatedSite {
 label: string;
 url: string;
 description?: string;
}

export function renderFederatedSites(sites: FederatedSite[]): string {
 if (sites.length === 0) return '';

 const lines: string[] = ['## Federated Sites', ''];
 for (const site of sites) {
  const desc = site.description ? `: ${site.description}` : '';
  lines.push(`- [${site.label}](${site.url})${desc}`);
 }
 return lines.join('\n');
}
```

- [ ] **Step 5.4: Run tests and accept snapshot**

Run:

```bash
pnpm --filter starlight-llms-txt test test/federated-sites.test.ts
```

Expected: all tests pass; one snapshot written.

Verify the snapshot:

```bash
cat packages/starlight-llms-txt/test/__snapshots__/federated-sites.test.ts.snap
```

Expected content:

```
// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html

exports[`renderFederatedSites > matches the xcsh#223 reference output 1`] = `
"## Federated Sites

- [WAF](https://f5-sales-demo.github.io/waf/llms.txt): Web application firewall
- [CSD](https://f5-sales-demo.github.io/csd/llms.txt): Client-side defense"
`;
```

- [ ] **Step 5.5: Commit**

```bash
git add packages/starlight-llms-txt/federated-sites.ts \
        packages/starlight-llms-txt/test/federated-sites.test.ts \
        packages/starlight-llms-txt/test/__snapshots__/federated-sites.test.ts.snap
git commit -m "$(cat <<'EOF'
feat(federated-sites): add renderFederatedSites helper

Pure helper that renders a list of { label, url, description? } into
a ## Federated Sites markdown block. Returns empty string for empty
input so the caller can unconditionally push the result as a
segment. Descriptions append as ": description" when present;
entries are emitted in the order given.

Unit-tested including a snapshot against the xcsh#223 reference
output.
EOF
)"
```

---

## Task 6: Wire `federatedSites` option into the plugin

**Phase B2 of the spec, part 2 of 2.** Upstream-candidate.

**Files:**

- Modify: `packages/starlight-llms-txt/types.ts`
- Modify: `packages/starlight-llms-txt/index.ts`
- Modify: `packages/starlight-llms-txt/llms.txt.ts`
- Modify: `docs/src/content/docs/configuration.mdx`
- Create: `.changeset/federated-sites.md`

- [ ] **Step 6.1: Add `federatedSites` to user options type**

Edit `packages/starlight-llms-txt/types.ts`. Append to the `StarlightLllmsTextOptions` interface:

```ts
 /**
  * An array of links to other sites' `llms.txt` entry points — used by a docs portal
  * to federate out to product-specific documentation.
  *
  * Rendered as a `## Federated Sites` block in `llms.txt`, placed after `## Sections`
  * and before `## Notes`. If the array is empty (the default), the block is omitted
  * entirely, so leaf product sites don't need conditional config.
  *
  * @default []
  * @example
  * federatedSites: [
  *   { label: 'WAF', url: 'https://example.com/waf/llms.txt', description: 'Web application firewall' },
  *   { label: 'CSD', url: 'https://example.com/csd/llms.txt', description: 'Client-side defense' },
  * ]
  */
 federatedSites?: Array<{
  label: string;
  url: string;
  description?: string;
 }>;
```

In the `ProjectContext` interface, add:

```diff
  sidebarNav: NonNullable<StarlightLllmsTextOptions['sidebarNav']>;
+ federatedSites: NonNullable<StarlightLllmsTextOptions['federatedSites']>;
```

- [ ] **Step 6.2: Pass the option into `projectContext`**

Edit `packages/starlight-llms-txt/index.ts`. In the `projectContext` literal:

```diff
  sidebarNav: opts.sidebarNav ?? false,
+ federatedSites: opts.federatedSites ?? [],
```

- [ ] **Step 6.3: Render the block in `llms.txt.ts`**

Edit `packages/starlight-llms-txt/llms.txt.ts`:

1. Add the import at the top with the other helper imports:

```diff
  import { buildSectionTree, renderSectionTree } from './sidebar-nav';
+ import { renderFederatedSites } from './federated-sites';
```

2. Add the rendering block immediately after the `sidebarNav` block (before `segments.push(\`## Notes\`);`):

```ts
 // Federated sites — Tier 1 routing.
 {
  const rendered = renderFederatedSites(starlightLllmsTxtContext.federatedSites);
  if (rendered) segments.push(rendered);
 }
```

The block is wrapped in a scope so the local `rendered` doesn't collide with the one in the `sidebarNav` block.

- [ ] **Step 6.4: Update user-facing docs**

Edit `docs/src/content/docs/configuration.mdx`. Append after the `sidebarNav` section from Task 4:

```md
## `federatedSites`

**type:** `Array<{ label: string; url: string; description?: string }>`
**default:** `[]`

An array of links to other sites' `llms.txt` entry points. Use this on a docs portal to federate out to product-specific documentation. Empty array (the default) omits the block entirely, so leaf product sites don't need conditional config.

```ts
federatedSites: [
  { label: 'WAF', url: 'https://example.com/waf/llms.txt', description: 'Web application firewall' },
  { label: 'CSD', url: 'https://example.com/csd/llms.txt', description: 'Client-side defense' },
]
```

Output:

```markdown
## Federated Sites

- [WAF](https://example.com/waf/llms.txt): Web application firewall
- [CSD](https://example.com/csd/llms.txt): Client-side defense
```

The block is placed between `## Sections` and `## Notes` — local navigation before cross-site traversal.

```

- [ ] **Step 6.5: Add changeset**

Create `.changeset/federated-sites.md`:

```md
---
"starlight-llms-txt": minor
---

Add `federatedSites` option. When set to a non-empty array, the plugin includes a `## Federated Sites` block in `llms.txt` listing links to other sites' `llms.txt` entry points. Intended for docs portals that federate out to product-specific documentation.
```

- [ ] **Step 6.6: Smoke test**

Temporarily enable federatedSites in the docs site for verification (will be reverted in the same step before commit). Edit `docs/astro.config.ts` to add to the `starlightLlmsTxt(...)` options:

```ts
federatedSites: [
 { label: 'Example', url: 'https://example.com/llms.txt', description: 'Example federation target' },
],
```

Run:

```bash
pnpm build:docs
grep -A 5 '^## Federated Sites' docs/dist/llms.txt
```

Expected:

```
## Federated Sites

- [Example](https://example.com/llms.txt): Example federation target
```

Remove the temporary `federatedSites` block from `docs/astro.config.ts` before committing:

```bash
git diff docs/astro.config.ts
# confirm only the sidebarNav: true line from Task 4 remains as a docs change
```

- [ ] **Step 6.7: Run unit tests**

Run:

```bash
pnpm --filter starlight-llms-txt test
```

Expected: all tests pass.

- [ ] **Step 6.8: Commit**

```bash
git add packages/starlight-llms-txt/types.ts \
        packages/starlight-llms-txt/index.ts \
        packages/starlight-llms-txt/llms.txt.ts \
        docs/src/content/docs/configuration.mdx \
        .changeset/federated-sites.md
git commit -m "$(cat <<'EOF'
feat: add federatedSites option for cross-site llms.txt links

When federatedSites is a non-empty array, llms.txt renders a
## Federated Sites block listing each entry as a markdown link.
Placed between ## Sections and ## Notes — local navigation before
cross-site traversal. Empty array (default) omits the block so leaf
product sites don't need conditional config.

Shape mirrors the existing optionalLinks option so users have one
mental model for "list of external links with descriptions".
EOF
)"
```

---

## Task 7: Pre-flight — verify upstream PR #32 state

**Phase B3 of the spec, part 1 of 4.** Before cherry-picking mavam's branch, confirm the head SHA hasn't moved since the spec was written. Upstream-candidate prep.

- [ ] **Step 7.1: Fetch the current PR head SHA**

Run:

```bash
gh api repos/delucis/starlight-llms-txt/pulls/32 \
  --jq '{head_ref: .head.ref, head_sha: .head.sha, head_repo: .head.repo.full_name}'
```

Expected (from spec):

```json
{
  "head_ref": "topic/markdown-pages",
  "head_sha": "2a1ae6d259cee07d7466281550b1103b3e48fc5f",
  "head_repo": "tenzir/starlight-llms-txt"
}
```

- [ ] **Step 7.2: Decide how to handle drift**

**If the SHA matches `2a1ae6d259cee07d7466281550b1103b3e48fc5f`:** proceed to Task 8 unchanged.

**If the SHA differs:** someone has pushed to mavam's branch since the spec. Fetch the new branch anyway (Task 8.2) and inspect the new commits:

```bash
git log --oneline 2a1ae6d259cee07d7466281550b1103b3e48fc5f..mavam-fork/topic/markdown-pages
```

If the new commits are additive refactors (still about per-page markdown), proceed. If they've rewritten the feature (e.g. different config shape), stop — the spec's `excludePages: ['index*']` glob diff assumption may no longer hold, and the rest of Task 8 needs revisiting with the user. Do not proceed without explicit confirmation.

**If the PR has been closed / merged upstream:** great news, but verify on the command line:

```bash
gh api repos/delucis/starlight-llms-txt/pulls/32 --jq '.state,.merged_at'
```

If merged, we still want to cherry-pick from the upstream merge commit onto our branch (our `main` doesn't have it yet). Substitute the merge commit SHA for the branch head in Task 8 and note the divergence for the PR description.

- [ ] **Step 7.3: No commit**

This task is a verification gate, not a code change. Proceed to Task 8.

---

## Task 8: Cherry-pick mavam's per-page markdown branch

**Phase B3 of the spec, part 2 of 4.** Bring delucis#32's code into our fork, preserving mavam's authorship via git's native author field. Upstream-candidate.

**Files:** All changes made via `git cherry-pick`; exact files are whatever mavam's branch touches (from the PR file list: `packages/starlight-llms-txt/types.ts`, `index.ts`, `entryToSimpleMarkdown.ts`, new `page-markdown.ts` + `page-markdown-generator.ts`, `docs/astro.config.ts`, `docs/src/content/docs/configuration.mdx`, `docs/src/content/docs/getting-started.mdx`, `.changeset/markdown-page-generation.md`).

- [ ] **Step 8.1: Confirm a clean working tree**

Run:

```bash
git status
```

Expected: "nothing to commit, working tree clean". If not clean, commit or stash before proceeding — cherry-pick in a dirty tree is error-prone.

- [ ] **Step 8.2: Add mavam's fork as a remote and fetch**

Run:

```bash
git remote add mavam-fork https://github.com/tenzir/starlight-llms-txt.git 2>/dev/null || true
git fetch mavam-fork topic/markdown-pages
```

Expected: fetches refs; `FETCH_HEAD` now points at the 17 commits on `topic/markdown-pages`.

- [ ] **Step 8.3: Identify the commits to replay**

Run:

```bash
git log --oneline --reverse main..mavam-fork/topic/markdown-pages
```

Expected: a list of ~17 commits. Note the first and last SHAs; they form the cherry-pick range.

- [ ] **Step 8.4: Cherry-pick the range**

Run:

```bash
git cherry-pick -x main..mavam-fork/topic/markdown-pages
```

`-x` appends "(cherry picked from commit <sha>)" to each commit message, which is a useful audit trail without rewriting authorship. The original author (mavam) is preserved automatically — git cherry-pick keeps the original author and sets the committer to you.

**If conflicts occur** (the PR is `mergeable_state: dirty` against upstream `main`, so our fork's own drift — HTML-comment-strip from #97, dependency bumps — may conflict): git pauses with a conflict message. Resolve:

1. Run `git status` to see conflicted files.
2. Edit conflicted files, prefer mavam's changes for `page-markdown*.ts` and `entryToSimpleMarkdown.ts` (the feature code), prefer our fork's changes for anything merge-unrelated.
3. `git add <resolved-files>`.
4. `git cherry-pick --continue` (do **not** use `--skip` — each commit matters for authorship preservation).

Repeat until all commits are applied. Expected final state: 17 new commits on top of our branch, all authored by "Matthias Vallentin" per `git log --format='%an %s' main..HEAD`.

- [ ] **Step 8.5: Verify authorship is preserved**

Run:

```bash
git log --format='%an <%ae> %s' main..HEAD | head -5
```

Expected: at least the first few lines show `Matthias Vallentin <...>` as author. Committer shown via `%cn` will be you, which is correct.

- [ ] **Step 8.6: Run the docs build as a smoke test**

Run:

```bash
pnpm install  # new files may require
pnpm build:docs
```

Expected: build completes; `docs/dist/getting-started.html.md` exists (the docs site's first page, since mavam's `docs/astro.config.ts` cherry-pick enabled `perPageMarkdown`).

- [ ] **Step 8.7: Run unit tests**

Run:

```bash
pnpm --filter starlight-llms-txt test
```

Expected: all existing tests pass. No new tests yet for per-page-markdown — those arrive in Task 10.

- [ ] **Step 8.8: No additional commit**

All commits on this task came from `cherry-pick`. No manual commit.

- [ ] **Step 8.9: Remove the temporary remote**

Run:

```bash
git remote remove mavam-fork
```

Cleanup — the remote was only needed for the fetch.

---

## Task 9: Extract per-page-markdown utils

**Phase B3 of the spec, part 3 of 4.** Refactor the literal-match exclusion logic into a pure helper so Task 10's tests have something to import. Upstream-candidate.

**Files:**

- Create: `packages/starlight-llms-txt/per-page-markdown-utils.ts`
- Modify: `packages/starlight-llms-txt/index.ts` (use `resolvePerPageMarkdownOptions`)
- Modify: `packages/starlight-llms-txt/page-markdown.ts` (use `slugToPath`, `shouldExcludePage`)

This task is a refactor with no behavior change — it preserves the exact semantics of delucis#32's literal-match exclusion. Task 11 switches `shouldExcludePage` to micromatch.

- [ ] **Step 9.1: Inspect the cherry-picked per-page-markdown code**

Review the three files so you know what to extract:

```bash
cat packages/starlight-llms-txt/page-markdown.ts
cat packages/starlight-llms-txt/page-markdown-generator.ts
grep -n perPageMarkdown packages/starlight-llms-txt/index.ts
grep -n perPageMarkdown packages/starlight-llms-txt/types.ts
```

Note the exact variable names used for `extensionStrategy` and `excludePages` — the extracted helpers must preserve them.

- [ ] **Step 9.2: Create the utils module**

Create `packages/starlight-llms-txt/per-page-markdown-utils.ts`:

```ts
/**
 * Pure helpers for the `perPageMarkdown` option. Extracted for unit testability.
 */

export interface PerPageMarkdownConfig {
 enabled: boolean;
 extensionStrategy: 'append' | 'replace';
 excludePages: string[];
}

export type PerPageMarkdownUserOption =
 | boolean
 | {
   extensionStrategy?: 'append' | 'replace';
   excludePages?: string[];
   };

const DEFAULTS = {
 extensionStrategy: 'append' as const,
 excludePages: ['404'],
};

/** Resolve the user-supplied `perPageMarkdown` option into a fully-populated config. */
export function resolvePerPageMarkdownOptions(
 option: PerPageMarkdownUserOption | undefined,
): PerPageMarkdownConfig {
 if (option === undefined || option === false) {
  return { enabled: false, ...DEFAULTS, excludePages: [...DEFAULTS.excludePages] };
 }
 if (option === true) {
  return { enabled: true, ...DEFAULTS, excludePages: [...DEFAULTS.excludePages] };
 }
 return {
  enabled: true,
  extensionStrategy: option.extensionStrategy ?? DEFAULTS.extensionStrategy,
  excludePages: option.excludePages ?? [...DEFAULTS.excludePages],
 };
}

/** Map a page slug to the per-page markdown output path using the resolved extension strategy. */
export function slugToPath(slug: string, strategy: 'append' | 'replace'): string {
 return strategy === 'append' ? `${slug}.html.md` : `${slug}.md`;
}

/** Return true if `id` matches any of the exclusion patterns (literal match in Task 9; micromatch in Task 11). */
export function shouldExcludePage(id: string, patterns: string[]): boolean {
 if (patterns.length === 0) return false;
 // Literal match — Task 11 swaps this for micromatch.isMatch.
 return patterns.includes(id);
}
```

- [ ] **Step 9.3: Rewire `index.ts` to use `resolvePerPageMarkdownOptions`**

Find the block in `packages/starlight-llms-txt/index.ts` that resolves `opts.perPageMarkdown` (from mavam's cherry-pick). Replace the inline default-merging logic with a call to `resolvePerPageMarkdownOptions`:

```diff
+ import { resolvePerPageMarkdownOptions } from './per-page-markdown-utils';
  ...
- // (whatever default-merging code mavam's PR introduced — inline object spread or similar)
+ const perPageMarkdown = resolvePerPageMarkdownOptions(opts.perPageMarkdown);
```

Then pass `perPageMarkdown` (the resolved config) into the `projectContext`:

```diff
  federatedSites: opts.federatedSites ?? [],
+ perPageMarkdown,
```

Also update `types.ts` `ProjectContext` if mavam's cherry-pick didn't already match:

```diff
  federatedSites: NonNullable<StarlightLllmsTextOptions['federatedSites']>;
+ perPageMarkdown: import('./per-page-markdown-utils').PerPageMarkdownConfig;
```

The route injection (`injectRoute` for `/[...slug].md` conditional on `perPageMarkdown.enabled`) should already be in place from the cherry-pick — verify by running the docs build in Step 9.6.

- [ ] **Step 9.4: Rewire `page-markdown.ts` to use the helpers**

Find the per-page route handler (from mavam's cherry-pick). It currently reads `extensionStrategy` and `excludePages` directly from the virtual module context. Replace the ad hoc path construction and inline exclusion check:

```diff
+ import { slugToPath, shouldExcludePage } from './per-page-markdown-utils';
  ...
- // (inline path-building code, e.g. `${slug}.html.md`)
+ const path = slugToPath(slug, perPageMarkdown.extensionStrategy);
  ...
- // (inline includes-based exclusion)
+ if (shouldExcludePage(doc.id, perPageMarkdown.excludePages)) continue;
```

The exact replacement depends on what mavam's PR looks like — inspect the file and replace the two semantic operations (build output path; decide whether to emit this doc).

- [ ] **Step 9.5: Run unit tests**

Run:

```bash
pnpm --filter starlight-llms-txt test
```

Expected: all existing tests pass. No new tests in this task.

- [ ] **Step 9.6: Run docs build**

Run:

```bash
pnpm build:docs
```

Expected: build completes. `docs/dist/getting-started.html.md` and `docs/dist/configuration.html.md` exist (per-page markdown output is unchanged from before the refactor — this is the refactor safety check).

- [ ] **Step 9.7: Commit**

```bash
git add packages/starlight-llms-txt/per-page-markdown-utils.ts \
        packages/starlight-llms-txt/index.ts \
        packages/starlight-llms-txt/page-markdown.ts \
        packages/starlight-llms-txt/types.ts
git commit -m "$(cat <<'EOF'
refactor(per-page-markdown): extract pure utils for testability

Moves the option-resolution logic, path-building logic, and
exclusion-check logic from index.ts / page-markdown.ts into a new
per-page-markdown-utils.ts module. No behavior change — exclusion
is still literal match. Enables unit testing in the next commit and
sets up the subsequent micromatch swap.
EOF
)"
```

---

## Task 10: Unit tests for per-page-markdown utils + micromatch swap

**Phase B3 of the spec, part 4 of 4.** Write the test suite, observe the glob cases fail, swap to micromatch, all pass. Upstream-candidate.

**Files:**

- Create: `packages/starlight-llms-txt/test/per-page-markdown-utils.test.ts`
- Modify: `packages/starlight-llms-txt/per-page-markdown-utils.ts` (swap literal to micromatch)
- Create: `.changeset/per-page-markdown.md`

- [ ] **Step 10.1: Write the full test suite**

Create `packages/starlight-llms-txt/test/per-page-markdown-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
 resolvePerPageMarkdownOptions,
 slugToPath,
 shouldExcludePage,
} from '../per-page-markdown-utils';

describe('resolvePerPageMarkdownOptions', () => {
 it('disables the feature when option is undefined', () => {
  const c = resolvePerPageMarkdownOptions(undefined);
  expect(c.enabled).toBe(false);
  expect(c.extensionStrategy).toBe('append');
  expect(c.excludePages).toEqual(['404']);
 });

 it('disables the feature when option is false', () => {
  expect(resolvePerPageMarkdownOptions(false).enabled).toBe(false);
 });

 it('enables the feature with defaults when option is true', () => {
  const c = resolvePerPageMarkdownOptions(true);
  expect(c.enabled).toBe(true);
  expect(c.extensionStrategy).toBe('append');
  expect(c.excludePages).toEqual(['404']);
 });

 it('merges partial overrides with defaults', () => {
  const c = resolvePerPageMarkdownOptions({ extensionStrategy: 'replace' });
  expect(c.enabled).toBe(true);
  expect(c.extensionStrategy).toBe('replace');
  expect(c.excludePages).toEqual(['404']);
 });

 it('overrides both fields when provided', () => {
  const c = resolvePerPageMarkdownOptions({
   extensionStrategy: 'replace',
   excludePages: ['index*', 'draft*'],
  });
  expect(c).toEqual({
   enabled: true,
   extensionStrategy: 'replace',
   excludePages: ['index*', 'draft*'],
  });
 });

 it('does not mutate the default excludePages across calls', () => {
  const a = resolvePerPageMarkdownOptions(true);
  a.excludePages.push('pollution');
  const b = resolvePerPageMarkdownOptions(true);
  expect(b.excludePages).toEqual(['404']);
 });
});

describe('slugToPath', () => {
 it('appends .html.md for the append strategy', () => {
  expect(slugToPath('getting-started', 'append')).toBe('getting-started.html.md');
 });

 it('appends .md for the replace strategy', () => {
  expect(slugToPath('getting-started', 'replace')).toBe('getting-started.md');
 });

 it('handles nested slugs', () => {
  expect(slugToPath('demo/phase-1-build', 'append')).toBe('demo/phase-1-build.html.md');
  expect(slugToPath('demo/phase-1-build', 'replace')).toBe('demo/phase-1-build.md');
 });
});

describe('shouldExcludePage', () => {
 it('returns false for empty pattern list', () => {
  expect(shouldExcludePage('anything', [])).toBe(false);
 });

 it('returns true on literal match', () => {
  expect(shouldExcludePage('404', ['404'])).toBe(true);
 });

 it('returns false on literal mismatch', () => {
  expect(shouldExcludePage('getting-started', ['404'])).toBe(false);
 });

 it('returns true on glob match', () => {
  expect(shouldExcludePage('index', ['index*'])).toBe(true);
 });

 it('returns true on glob match at a nested path', () => {
  expect(shouldExcludePage('guides/index', ['**/index'])).toBe(true);
 });

 it('returns false when glob does not match', () => {
  expect(shouldExcludePage('guides/intro', ['index*'])).toBe(false);
 });

 it('matches any pattern in a multi-pattern list', () => {
  expect(shouldExcludePage('draft', ['index*', 'draft*'])).toBe(true);
  expect(shouldExcludePage('published', ['index*', 'draft*'])).toBe(false);
 });
});
```

- [ ] **Step 10.2: Run to verify failures on glob cases**

Run:

```bash
pnpm --filter starlight-llms-txt test test/per-page-markdown-utils.test.ts
```

Expected: `resolvePerPageMarkdownOptions` and `slugToPath` tests all pass; several `shouldExcludePage` tests fail with "returns true on glob match" failing (the current literal `includes` won't match `'index'` against `'index*'`). This is the red state.

- [ ] **Step 10.3: Switch `shouldExcludePage` to micromatch**

Edit `packages/starlight-llms-txt/per-page-markdown-utils.ts`:

```diff
+ import micromatch from 'micromatch';
  ...
  export function shouldExcludePage(id: string, patterns: string[]): boolean {
    if (patterns.length === 0) return false;
-   // Literal match — Task 11 swaps this for micromatch.isMatch.
-   return patterns.includes(id);
+   return micromatch.isMatch(id, patterns);
  }
```

- [ ] **Step 10.4: Run tests — all pass**

Run:

```bash
pnpm --filter starlight-llms-txt test
```

Expected: all tests across all files pass.

- [ ] **Step 10.5: Add a docs example demonstrating the glob**

Edit the `perPageMarkdown` section in `docs/src/content/docs/configuration.mdx` (added by mavam's cherry-pick). Locate the `excludePages` description and replace the sentence that describes it:

```diff
- An array of page IDs to exclude from per-page markdown generation.
+ An array of [micromatch](https://github.com/micromatch/micromatch) patterns to exclude from per-page markdown generation. Supports globs; e.g. `['index*']` excludes all pages whose IDs start with `index`.
```

Also update the example in that section if it shows a plain array — change the representative example to include a glob pattern:

```diff
- excludePages: ['404', 'search'],
+ excludePages: ['404', 'index*'],
```

- [ ] **Step 10.6: Add changeset**

Create `.changeset/per-page-markdown.md`:

```md
---
"starlight-llms-txt": minor
---

Add `perPageMarkdown` option — generates individual `.md` files for each documentation page alongside the existing `llms.txt`. Each page becomes accessible at `/{slug}.html.md` (default) or `/{slug}.md` (when `extensionStrategy: 'replace'`). Implements the [llmstxt.org per-page proposal](https://llmstxt.org/#proposal).

Rebased from [delucis#32](https://github.com/delucis/starlight-llms-txt/pull/32) by Matthias Vallentin, with `excludePages` extended to accept glob patterns via [micromatch](https://github.com/micromatch/micromatch) (consistent with `promote`/`demote`/`exclude`).
```

- [ ] **Step 10.7: Enable per-page markdown in the docs site (dogfood)**

This is already done by mavam's cherry-pick (Task 8 brought in the `docs/astro.config.ts` change enabling `perPageMarkdown: true`). Verify:

```bash
grep perPageMarkdown docs/astro.config.ts
```

If the line is `perPageMarkdown: true` — fine. If it uses an object form with literal `excludePages`, update to glob:

```diff
  perPageMarkdown: {
    extensionStrategy: 'append',
-   excludePages: ['index'],
+   excludePages: ['index*'],
  },
```

If the line isn't present at all (cherry-pick might have skipped it due to conflicts), add it to the `starlightLlmsTxt(...)` options:

```ts
perPageMarkdown: {
 extensionStrategy: 'append',
 excludePages: ['index*'],
},
```

- [ ] **Step 10.8: Docs build smoke test**

Run:

```bash
rm -rf docs/dist && pnpm build:docs
ls docs/dist/ | grep '\.html\.md$'
ls docs/dist/ | grep '^index'
```

Expected:

- `configuration.html.md` and `getting-started.html.md` exist in `docs/dist/`.
- No `index.html.md` exists (filtered by glob `index*`).

- [ ] **Step 10.9: Commit**

```bash
git add packages/starlight-llms-txt/per-page-markdown-utils.ts \
        packages/starlight-llms-txt/test/per-page-markdown-utils.test.ts \
        docs/astro.config.ts \
        docs/src/content/docs/configuration.mdx \
        .changeset/per-page-markdown.md
git commit -m "$(cat <<'EOF'
feat(per-page-markdown): swap literal excludePages match for micromatch

Switches shouldExcludePage from Array.includes to micromatch.isMatch,
bringing excludePages in line with the plugin's existing promote /
demote / exclude options which all accept glob patterns. Enables
xcsh#223's use case of excludePages: ['index*'].

Unit-tested with a mix of literal and glob patterns, including
nested globs. The default excludePages list remains ['404'].
EOF
)"
```

---

## Task 11: Release workflow wiring

**Phase C1 of the spec.** Fix the repo owner guard and wire classic npm token auth in place of the (unused) OIDC setup. Fork-only.

**Files:**

- Modify: `.github/workflows/release.yml`

- [ ] **Step 11.1: Edit the release workflow**

Replace the entire contents of `.github/workflows/release.yml` with:

```yaml
name: Release
permissions: {}

on:
  push:
    branches:
      - main

jobs:
  release:
    name: Release
    if: ${{ github.repository_owner == 'f5-sales-demo' }}
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@08c4be7e2e672a47d11bd04269e27e5f3e8529cb # v6.0.0
      - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
        with:
          node-version: 24.14.1
          cache: "pnpm"
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm i
      - uses: changesets/action@6a0a831ff30acef54f2c6aa1cbbc1096b066edaf # v1.7.0
        with:
          version: pnpm run ci-version
          publish: pnpm run ci-publish
          commit: "[ci] release"
          title: "[ci] release"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Changes vs. the pre-edit file:

- `if` guard: `delucis` → `f5-sales-demo`.
- Remove `id-token: write` from `permissions` (no OIDC).
- Add `registry-url: 'https://registry.npmjs.org'` to `setup-node` — writes the `.npmrc` line for auth.
- Replace `NPM_TOKEN: ""` with `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` and add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (both consumers get the token).

- [ ] **Step 11.2: Validate the YAML**

Run:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo OK
```

Expected: `OK`.

If `actionlint` is installed:

```bash
actionlint .github/workflows/release.yml
```

Expected: no errors.

- [ ] **Step 11.3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "$(cat <<'EOF'
ci(release): swap owner guard to f5-sales-demo, use NPM_TOKEN

- if-guard now matches this fork's owner so the release workflow
  actually fires on main pushes.
- Drop id-token: write — no OIDC trusted publisher; classic token
  auth instead.
- Add registry-url to setup-node so the generated .npmrc knows
  where to auth against.
- Wire NPM_TOKEN (for changesets publish) and NODE_AUTH_TOKEN (for
  setup-node's .npmrc) from the repo secret.
EOF
)"
```

---

## Task 12: Atomic package rename + metadata fanout

**Phase C2 of the spec.** All rename sites must land in one commit — any intermediate state breaks either `pnpm build:docs` (dangling workspace ref) or `pnpm test` (silent no-match on filter). Fork-only.

**Files:**

- Modify: `packages/starlight-llms-txt/package.json`
- Modify: `packages/starlight-llms-txt/README.md`
- Delete: `packages/starlight-llms-txt/.npmignore`
- Modify: `docs/package.json`
- Modify: `docs/astro.config.ts`
- Modify: `package.json` (root)
- Modify: `.changeset/config.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `pnpm-lock.yaml` (auto-updated by `pnpm install`)

- [ ] **Step 12.1: Rename the package and add `files`**

Edit `packages/starlight-llms-txt/package.json`. Full file after edit:

```json
{
 "name": "@f5-sales-demo/starlight-llms-txt",
 "version": "0.8.1",
 "license": "MIT",
 "description": "Generate llms.txt files to train large language models on your Starlight documentation website",
 "author": "f5-sales-demo (fork of delucis/starlight-llms-txt)",
 "type": "module",
 "exports": {
  ".": "./index.ts"
 },
 "files": [
  "*.ts",
  "!*.test.ts",
  "!vitest.config.ts",
  "CHANGELOG.md"
 ],
 "dependencies": {
  "@astrojs/mdx": "^5.0.3",
  "@types/hast": "^3.0.4",
  "@types/micromatch": "^4.0.10",
  "github-slugger": "^2.0.0",
  "hast-util-select": "^6.0.4",
  "micromatch": "^4.0.8",
  "rehype-parse": "^9.0.1",
  "rehype-remark": "^10.0.1",
  "remark-gfm": "^4.0.1",
  "remark-stringify": "^11.0.0",
  "unified": "^11.0.5",
  "unist-util-remove": "^4.0.0"
 },
 "devDependencies": {
  "@astrojs/starlight": "^0.38.3",
  "astro": "^6.1.5",
  "vitest": "^3.2.0"
 },
 "scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
 },
 "peerDependencies": {
  "@astrojs/starlight": ">=0.38.0",
  "astro": "^6.0.0"
 },
 "publishConfig": {
  "access": "public"
 },
 "homepage": "https://f5-sales-demo.github.io/starlight-llms-txt/",
 "repository": {
  "type": "git",
  "url": "https://github.com/f5-sales-demo/starlight-llms-txt.git",
  "directory": "packages/starlight-llms-txt"
 },
 "bugs": "https://github.com/f5-sales-demo/starlight-llms-txt/issues",
 "keywords": [
  "llms.txt",
  "withastro",
  "starlight"
 ]
}
```

Version stays at `0.8.1` — the `.changeset/v1-0-0.md` in Task 13 will bump it to `1.0.0` during the release PR.

- [ ] **Step 12.2: Delete `.npmignore`**

Run:

```bash
rm packages/starlight-llms-txt/.npmignore
```

With `files` in place, `.npmignore` is ignored by npm and would create a second source of truth.

- [ ] **Step 12.3: Replace the README**

Replace the contents of `packages/starlight-llms-txt/README.md`:

```md
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

- [ ] **Step 12.4: Rename the workspace dependency key in the docs package**

Edit `docs/package.json`:

```diff
  "dependencies": {
    "@astrojs/starlight": "^0.38.3",
    "astro": "^6.1.5",
    "sharp": "^0.34.5",
-   "starlight-llms-txt": "workspace:*",
+   "@f5-sales-demo/starlight-llms-txt": "workspace:*",
    "starlight-package-managers": "^0.12.0"
  },
```

- [ ] **Step 12.5: Update the docs astro config**

Edit `docs/astro.config.ts`:

1. Update the import:

```diff
- import starlightLlmsTxt from 'starlight-llms-txt';
+ import starlightLlmsTxt from '@f5-sales-demo/starlight-llms-txt';
```

2. Update the `site` URL:

```diff
- site: 'https://delucis.github.io',
+ site: 'https://f5-sales-demo.github.io',
```

3. Update the GitHub links:

```diff
-           href: 'https://github.com/delucis/starlight-llms-txt',
+           href: 'https://github.com/f5-sales-demo/starlight-llms-txt',
  ...
-         baseUrl: 'https://github.com/delucis/starlight-llms-txt/edit/main/docs/',
+         baseUrl: 'https://github.com/f5-sales-demo/starlight-llms-txt/edit/main/docs/',
```

The `base: '/starlight-llms-txt'` stays as-is — that's the URL path segment on GitHub Pages, which is the repo name (same name in our fork).

- [ ] **Step 12.6: Update the root `test` script**

Edit the root `package.json`:

```diff
  "scripts": {
    ...
-   "test": "pnpm --filter starlight-llms-txt test"
+   "test": "pnpm --filter @f5-sales-demo/starlight-llms-txt test"
  },
```

- [ ] **Step 12.7: Update the CI `test` job filter**

Edit `.github/workflows/ci.yml`. In the `test` job:

```diff
-     - run: pnpm --filter starlight-llms-txt test
+     - run: pnpm --filter @f5-sales-demo/starlight-llms-txt test
```

- [ ] **Step 12.8: Update the changesets changelog repo**

Edit `.changeset/config.json`:

```diff
  "$schema": "https://unpkg.com/@changesets/config@3.0.3/schema.json",
- "changelog": ["@changesets/changelog-github", { "repo": "delucis/starlight-llms-txt" }],
+ "changelog": ["@changesets/changelog-github", { "repo": "f5-sales-demo/starlight-llms-txt" }],
  "commit": false,
```

- [ ] **Step 12.9: Update existing changeset headers**

The changesets created in Tasks 4, 6, and 10 reference the package as `starlight-llms-txt`. After the rename, those references are stale — change them too so `changesets status` recognizes them.

```bash
sed -i 's|"starlight-llms-txt":|"@f5-sales-demo/starlight-llms-txt":|g' \
  .changeset/sidebar-nav.md \
  .changeset/federated-sites.md \
  .changeset/per-page-markdown.md
```

Verify:

```bash
head -3 .changeset/sidebar-nav.md .changeset/federated-sites.md .changeset/per-page-markdown.md
```

Expected: each file shows `"@f5-sales-demo/starlight-llms-txt": minor`.

If mavam's cherry-picked `.changeset/markdown-page-generation.md` exists with `"starlight-llms-txt"` (his PR's original changeset entry), update it the same way:

```bash
if [ -f .changeset/markdown-page-generation.md ]; then
  sed -i 's|"starlight-llms-txt":|"@f5-sales-demo/starlight-llms-txt":|g' .changeset/markdown-page-generation.md
fi
```

- [ ] **Step 12.10: Refresh the lockfile**

Run:

```bash
pnpm install
```

Expected: pnpm detects the workspace dep rename, rewrites `pnpm-lock.yaml`. No errors.

- [ ] **Step 12.11: Verify package pack dry-run**

Run:

```bash
pnpm pack --filter @f5-sales-demo/starlight-llms-txt --dry-run 2>&1 | grep -E '^[[:space:]]*(package:|[^[:space:]]+\.(ts|md|json))'
```

Expected: `package: @f5-sales-demo/starlight-llms-txt@0.8.1`.
The file list includes `index.ts`, `generator.ts`, `llms.txt.ts`, `sidebar-nav.ts`, `federated-sites.ts`, `per-page-markdown-utils.ts`, `page-markdown.ts`, `page-markdown-generator.ts`, `entryToSimpleMarkdown.ts`, `utils.ts`, `types.ts`, `env.d.ts`, `llms-full.txt.ts`, `llms-small.txt.ts`, `llms-custom.txt.ts`, `CHANGELOG.md`, `README.md`, `LICENSE`, and `package.json`.

It must NOT include: `vitest.config.ts`, `tsconfig.json`, anything under `test/`, `.npmignore`.

If any unwanted file is in the list, inspect your `files` array against Step 12.1 and fix before proceeding.

- [ ] **Step 12.12: Run unit tests under the new filter**

Run:

```bash
pnpm --filter @f5-sales-demo/starlight-llms-txt test
```

Expected: all tests pass. (If you ran `pnpm test` here instead and saw "no projects matched", the root script edit in Step 12.6 was missed.)

- [ ] **Step 12.13: Run the docs build**

Run:

```bash
rm -rf docs/dist && pnpm build:docs
```

Expected: build succeeds; `docs/dist/llms.txt` exists; `docs/dist/configuration.html.md` and `docs/dist/getting-started.html.md` exist.

Sanity-check the rename propagated through the build output:

```bash
grep -l delucis docs/dist/llms.txt docs/dist/llms-full.txt
```

Expected: no output (no files match). All URLs in the built llms.txt now use `f5-sales-demo.github.io`.

- [ ] **Step 12.14: Commit everything atomically**

```bash
git add packages/starlight-llms-txt/package.json \
        packages/starlight-llms-txt/README.md \
        docs/package.json \
        docs/astro.config.ts \
        package.json \
        .changeset/config.json \
        .changeset/*.md \
        .github/workflows/ci.yml \
        pnpm-lock.yaml
git rm packages/starlight-llms-txt/.npmignore
git commit -m "$(cat <<'EOF'
chore(package): rename to @f5-sales-demo/starlight-llms-txt

Atomic rename of all referring sites so no intermediate state breaks
the build or test runner:

- packages/starlight-llms-txt/package.json: name, author, repo,
  homepage, bugs; add explicit files array; add scripts/vitest
  devDep; delete .npmignore (superseded by files).
- docs/package.json: workspace dep key.
- docs/astro.config.ts: import specifier; site URL; github links.
- package.json (root): test script filter.
- .github/workflows/ci.yml: test job filter.
- .changeset/config.json: changelog repo pointer.
- .changeset/*.md: update package name headers.
- pnpm-lock.yaml: refreshed by pnpm install.
- README.md: fork notice replacing the upstream README.
EOF
)"
```

---

## Task 13: Add 1.0.0 changeset

**Phase C3 of the spec.** The release PR will consume this changeset to cut version 1.0.0 and regenerate `CHANGELOG.md`. Fork-only.

**Files:**

- Create: `.changeset/v1-0-0.md`

- [ ] **Step 13.1: Write the changeset**

Create `.changeset/v1-0-0.md`:

```md
---
"@f5-sales-demo/starlight-llms-txt": major
---

Initial release of the F5 XC Sales Demos fork, derived from `starlight-llms-txt@0.8.1`. Adds:

- `perPageMarkdown` — per-page `.md` endpoints (Tier 4 routing in the xcsh#223 cascading knowledge hierarchy). Rebased from [delucis#32](https://github.com/delucis/starlight-llms-txt/pull/32) by Matthias Vallentin, with `excludePages` extended to accept glob patterns.
- `sidebarNav` — sidebar hierarchy in `llms.txt` (Tier 2 routing), with frontmatter descriptions inlined automatically.
- `federatedSites` — cross-repo links block in `llms.txt` (Tier 1 routing).

The `starlight-llms-txt` package is authored by Chris Swithinbank (delucis). This fork exists to ship features needed by the f5-sales-demo documentation federation; we intend to upstream compatible features once they have been validated in production.
```

- [ ] **Step 13.2: Verify changeset status**

Run:

```bash
pnpm changeset status
```

Expected output includes a line showing `@f5-sales-demo/starlight-llms-txt` slated for a **major** bump. The aggregate of the four changesets (`sidebar-nav.md`, `federated-sites.md`, `per-page-markdown.md`, and `v1-0-0.md`) resolves to the highest bump type, which is `major` from `v1-0-0.md`.

If the status output lists additional packages (e.g. `starlight-llms-txt-docs`), that's OK as long as `starlight-llms-txt-docs` shows up under `ignore` — it should, per `.changeset/config.json`'s `"ignore": ["starlight-llms-txt-docs"]` entry.

- [ ] **Step 13.3: Commit**

```bash
git add .changeset/v1-0-0.md
git commit -m "$(cat <<'EOF'
docs(changeset): 1.0.0 initial fork release

Single major-bump changeset that collapses the four feature entries
(sidebarNav, federatedSites, perPageMarkdown, rename) into a single
1.0.0 changelog entry when the release PR is cut.
EOF
)"
```

---

## Task 14: Open the PR to main

**Phase D1 of the spec.** Push the branch and open a PR. CI must pass before merge. Fork-only.

- [ ] **Step 14.1: Pre-flight — confirm repo settings allow merge commits**

Run:

```bash
gh api repos/f5-sales-demo/starlight-llms-txt --jq '.allow_merge_commit,.allow_squash_merge'
```

Expected: `true` then `true` (or at least the first — `allow_merge_commit: true`).

If `allow_merge_commit` is `false`: flip the setting via the repo's web UI (Settings → General → Pull Requests) or via API:

```bash
gh api -X PATCH repos/f5-sales-demo/starlight-llms-txt -f allow_merge_commit=true
```

- [ ] **Step 14.2: Push the branch**

Run:

```bash
git push -u origin feature/enhancements-and-publishing
```

Expected: new remote branch created; tracking set up.

- [ ] **Step 14.3: Open the PR**

Run:

```bash
gh pr create \
  --repo f5-sales-demo/starlight-llms-txt \
  --base main \
  --head feature/enhancements-and-publishing \
  --title "feat: v1.0.0 — fork release with sidebarNav, federatedSites, perPageMarkdown" \
  --body "$(cat <<'EOF'
## Summary

Initial release of `@f5-sales-demo/starlight-llms-txt@1.0.0`. Implements Step 1 of [xcsh#223](https://github.com/f5-sales-demo/xcsh/issues/223).

**Features added:**

- `sidebarNav` — renders `## Sections` with hierarchical page list + automatic frontmatter descriptions.
- `federatedSites` — renders `## Federated Sites` cross-repo links for the docs portal.
- `perPageMarkdown` — rebased from upstream [delucis#32](https://github.com/delucis/starlight-llms-txt/pull/32) by @mavam, extended to accept glob patterns for `excludePages`.

**Infrastructure:**

- Package renamed to `@f5-sales-demo/starlight-llms-txt` (scoped publish).
- Vitest harness + unit tests for all pure helpers.
- Release workflow guard fixed; `NPM_TOKEN` wired (classic automation token, not OIDC).
- Explicit `files` array replacing `.npmignore`.

**Notes for reviewer:**

- Tests are fork-only; upstream PR is deferred until we've validated the package in production.
- Commit history is intentionally unflattened to preserve mavam's authorship on cherry-picked commits. Please **merge** (not squash) so the upstream-candidate commits remain individually cherry-pickable later.

**Spec:** `specs/2026-04-22-starlight-llms-txt-fork-v1-design.md`
**Plan:** `plans/2026-04-22-starlight-llms-txt-fork-v1.md`

## Test plan

- [ ] CI `test` job passes
- [ ] CI `smoke` job passes
- [ ] `pnpm pack --dry-run` file list excludes test files and vitest config
- [ ] Review that no upstream-candidate commit contains a reference to `f5-sales-demo` (fork-only changes are in separate commits)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR number printed; URL emitted.

- [ ] **Step 14.4: Wait for CI**

Run:

```bash
gh pr checks --watch
```

Expected: `test` and `smoke` both pass. `Release` will not run on PRs (it's gated on `on: push: branches: main`).

**If CI fails:** fix-forward. `test` failures indicate a unit-test regression — reproduce with `pnpm --filter @f5-sales-demo/starlight-llms-txt test`, fix, commit, push. `smoke` failures indicate a docs build regression — reproduce with `pnpm build:docs`, fix, commit, push. Do not merge the PR until both jobs are green.

- [ ] **Step 14.5: Merge as a merge commit**

Once CI is green and a human reviewer has approved:

```bash
gh pr merge --merge --repo f5-sales-demo/starlight-llms-txt
```

`--merge` creates a merge commit, preserving the individual commit history (required for the Co-Authored-By trail and for later cherry-picking). Do **not** use `--squash` or `--rebase`.

Expected: PR merged; branch `feature/enhancements-and-publishing` auto-deleted from the remote (if the repo has "Automatically delete head branches" enabled) or still present (harmless).

---

## Task 15: Review and merge the release PR

**Phase D2 of the spec.** The merge in Task 14 triggers the release workflow, which opens a "[ci] release" PR via `changesets/action`. Fork-only.

- [ ] **Step 15.1: Confirm the release workflow ran**

Run:

```bash
gh run list --workflow Release --repo f5-sales-demo/starlight-llms-txt --limit 3
```

Expected: the most recent run shows the Task 14 merge as its trigger and status `success` or `completed`.

**If the run was skipped with reason "if condition not met":** the owner guard in the release workflow didn't match. Recheck Task 11's edit applied correctly.

**If the run failed:** open the failed run:

```bash
gh run view --log --repo f5-sales-demo/starlight-llms-txt
```

Most likely causes at this stage: the release PR creation step failed because there were no changesets (shouldn't be the case — Tasks 4, 6, 10, 13 all added changesets) or because the changesets reference the pre-rename name (caught in Task 12.9). Fix forward and push to `main`.

- [ ] **Step 15.2: Find the release PR**

Run:

```bash
gh pr list --repo f5-sales-demo/starlight-llms-txt --search '"[ci] release" in:title' --limit 1
```

Expected: one open PR titled `[ci] release` opened by `github-actions[bot]`.

- [ ] **Step 15.3: Inspect the release PR**

Run:

```bash
PR_NUM=$(gh pr list --repo f5-sales-demo/starlight-llms-txt --search '"[ci] release" in:title' --json number --jq '.[0].number')
gh pr view $PR_NUM --repo f5-sales-demo/starlight-llms-txt
```

Expected contents:

- `packages/starlight-llms-txt/package.json` version bumped `0.8.1` → `1.0.0`.
- `packages/starlight-llms-txt/CHANGELOG.md` regenerated with a 1.0.0 section listing the four feature bullets.
- All `.changeset/*.md` files deleted (consumed).
- No other file changes.

If any changeset `.md` file is still present, the release workflow didn't consume all of them — check the changeset package names match `@f5-sales-demo/starlight-llms-txt` exactly (Task 12.9).

- [ ] **Step 15.4: Merge the release PR**

```bash
gh pr merge $PR_NUM --merge --repo f5-sales-demo/starlight-llms-txt
```

Expected: merge succeeds; this triggers the publish step of the release workflow on the next run.

---

## Task 16: Verify the npm publish

**Phase D3 of the spec.** The merge of the release PR re-fires the release workflow; this time `changesets/action` detects no pending changesets and runs `pnpm run ci-publish`, which calls `changeset publish`, which runs `npm publish` for each changed package. Fork-only operational verification.

- [ ] **Step 16.1: Watch the publish run**

Run:

```bash
gh run list --workflow Release --repo f5-sales-demo/starlight-llms-txt --limit 1
```

Copy the run ID and stream logs:

```bash
gh run view <run-id> --log --repo f5-sales-demo/starlight-llms-txt
```

Expected: the `changesets/action` step logs `🦋 info @f5-sales-demo/starlight-llms-txt@1.0.0 published` or similar, followed by a tag push `@f5-sales-demo/starlight-llms-txt@1.0.0`.

**If publish fails with `403 Forbidden`:** the `NPM_TOKEN`'s owner lacks publish permission on the `@f5-sales-demo` org. Fix at npmjs.com (add `robinmordasiewicz` to the org with publish role), then push any commit to `main` to re-trigger. `changesets/action` is idempotent — it will retry the already-bumped version.

**If publish fails with `404 Not Found`:** the `@f5-sales-demo` npm organization doesn't exist. Create it at <https://www.npmjs.com/org/create>, add the member, then re-trigger.

**If publish fails with `409 Conflict`:** someone else has squatted the name. Unlikely; if so, choose a new name (e.g. `@f5-sales-demo/starlight-llms-txt-f5xc` — awkward but works) and re-run from Task 12.

- [ ] **Step 16.2: Verify on the npm registry**

Run:

```bash
npm view @f5-sales-demo/starlight-llms-txt version
```

Expected: `1.0.0`.

Inspect the shipped tarball contents:

```bash
npm view @f5-sales-demo/starlight-llms-txt files
```

Expected: no `test/`, no `vitest.config.ts`, no `.npmignore`, no `tsconfig.json`. Yes `README.md`, `LICENSE`, `package.json`, `CHANGELOG.md`, all `.ts` source files.

- [ ] **Step 16.3: Verify the GitHub release**

Run:

```bash
gh release view "@f5-sales-demo/starlight-llms-txt@1.0.0" --repo f5-sales-demo/starlight-llms-txt
```

Expected: release created by `changesets/changelog-github` with the 1.0.0 changelog body.

- [ ] **Step 16.4: Smoke test the published package**

Run (in a scratch directory outside the worktree):

```bash
mkdir -p /tmp/smoke-install && cd /tmp/smoke-install
npm init -y >/dev/null
npm install @f5-sales-demo/starlight-llms-txt@1.0.0 --save-peer 2>&1 | tail -5
ls node_modules/@f5-sales-demo/starlight-llms-txt/
```

Expected: installs without errors; directory contains the `.ts` source files and `README.md`. Cleanup:

```bash
cd - && rm -rf /tmp/smoke-install
```

- [ ] **Step 16.5: Post-release housekeeping reminders**

These are not commits — surface them to the user:

1. **Rotate `NPM_TOKEN`.** The token value appeared in the brainstorming transcript. Rotate at <https://www.npmjs.com/settings/robinmordasiewicz/tokens>, update the GH Actions secret:

   ```bash
   printf '%s' '<new-token>' | gh secret set NPM_TOKEN --repo f5-sales-demo/starlight-llms-txt --app actions
   ```

2. **Close/comment on xcsh#223** with a link to the released package version.
3. **Begin Steps 2–6 of xcsh#223** in their respective repos (docs-builder, docs-theme, docs portal, product repos, xcsh itself) — separate worktrees, separate plans.
4. **Leave the upstream PR unsubmitted** until the package has been validated across the f5-sales-demo fleet (per the saved preference).

---

## Self-Review Checklist (run after completing the plan, before implementation)

- [ ] All 16 tasks correspond to a phase/task in `specs/2026-04-22-starlight-llms-txt-fork-v1-design.md`. No spec phase is unaddressed.
- [ ] Each task's "Files" section lists exact paths matching the File Structure table at the top of this plan.
- [ ] No step says "TBD", "TODO", "implement later", "similar to Task N", or "add appropriate error handling".
- [ ] Every code-change step shows the actual code (not a description).
- [ ] Every command step shows the exact command and expected output.
- [ ] Type names, function names, and argument orders are consistent across tasks (e.g. `buildSectionTree(docs, promote, demote)` in Task 2 matches the call site in Task 4's `llms.txt.ts` update).
- [ ] The TDD order holds in Tasks 2, 3, 5, 10: failing test → run & verify red → implement → run & verify green → commit.
- [ ] Fork-only commits (Tasks 1, 11, 12, 13) never touch `delucis`-sensitive code in ways that'd pollute the upstream-candidate set.
- [ ] Task 12 is atomic: every rename site lands in one commit. Intermediate state between any two sub-steps does not leave the repo in a building-but-broken state for more than seconds.
