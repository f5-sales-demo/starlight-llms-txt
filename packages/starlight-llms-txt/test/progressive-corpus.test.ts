import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildProgressiveCorpus,
  getProgressivePaths,
  getProgressiveRoutePaths,
  type ProgressiveCorpusManifest,
  renderProgressiveFullIndex,
  renderProgressiveIndex,
  renderProgressiveNode,
  rewriteCorpusAssetReferences,
} from '../progressive-corpus';
import { getLlmsRoutePlan } from '../route-plan';

const document = (sourceId: string, path: string, markdown: string) => ({
  sourceId,
  url: `https://source.example/${path}`,
  path,
  body_sha256: '0'.repeat(64),
  file_sha256: createHash('sha256').update(markdown).digest('hex'),
  size_bytes: Buffer.byteLength(markdown),
});

const fixture = () => {
  const files = new Map([
    ['content/docs-cloud-f5-com/guides/index.md', '---\ntitle: Guides\ndescription: Product guides\n---\n\nWelcome.\n'],
    ['content/docs-cloud-f5-com/guides/setup/index.md', '---\ntitle: Setup\n---\n\n![Diagram](assets/a.png)\n'],
    ['content/my-f5-com/support/index.md', '---\ntitle: Support\n---\n\nSupport body.\n'],
  ]);
  const manifest: ProgressiveCorpusManifest = {
    schema_version: 2,
    source_roots: {
      'docs-cloud-f5-com': 'https://docs.cloud.f5.com/docs-v2',
      'my-f5-com': 'https://my.f5.com/manage/s',
    },
    documents: [...files].map(([path, markdown]) => document(path.split('/')[1] ?? '', path, markdown)),
    assets: [
      {
        path: 'content/docs-cloud-f5-com/guides/setup/assets/a.png',
        sha256: 'a'.repeat(64),
        media_type: 'image/png',
        size_bytes: 8,
      },
    ],
  };
  return { corpus: buildProgressiveCorpus(manifest, (path) => files.get(path) ?? ''), manifest };
};

const semanticFixture = () => {
  const files = new Map([
    [
      'content/source/install/linux/index.md',
      '---\ntitle: Linux install\ncategory: Getting Started\nsubcategory: Installation\ndescription: "Install **Linux**. Extra sentence that is not part of the hint."\n---\n\nLinux body.\n',
    ],
    [
      'content/source/install/macos/index.md',
      '---\ntitle: macOS install\ncategory: Getting Started\nsubcategory: Installation\ndescription: "Install [macOS](https://example.com). More detail."\n---\n\nmacOS body.\n',
    ],
    [
      'content/source/quickstart/index.md',
      '---\ntitle: Quickstart\ncategory: Getting Started\nsubcategory: Overview\ndescription: "A single leaf subcategory"\n---\n\nQuickstart body.\n',
    ],
    [
      'content/source/reference/index.md',
      '---\ntitle: API reference\ncategory: API Reference\ndescription: "<strong>One very long description without punctuation that must be shortened at a word boundary instead of leaking the complete frontmatter value into every generated navigation surface</strong>"\n---\n\nReference body.\n',
    ],
  ]);
  const manifest: ProgressiveCorpusManifest = {
    schema_version: 2,
    source_roots: { source: 'https://source.example' },
    documents: [...files].map(([path, markdown]) => document('source', path, markdown)),
    assets: [],
  };
  const options = {
    taxonomy: {
      levels: ['category', 'subcategory'] as ['category', 'subcategory'],
      collapseSingletonSubcategories: true,
    },
    hints: { strategy: 'first-sentence' as const, maxCharacters: 72 },
  };
  return { corpus: buildProgressiveCorpus(manifest, (path) => files.get(path) ?? '', options), manifest };
};

describe('buildProgressiveCorpus', () => {
  it('serves pinned alias routes without adding canonical inventory or search leaves', () => {
    const markdown = '---\ntitle: Setup\ncategory: Guides\n---\n\nUseful procedure.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [document('source', 'content/source/setup/index.md', markdown)],
      assets: [],
      enrichment: {
        artifact_sha256: 'a'.repeat(64),
        aliases: [
          {
            path: 'content/source/old-setup/index.md',
            target: 'content/source/setup/index.md',
            url: 'https://source.example/old-setup',
          },
        ],
      },
    };
    const corpus = buildProgressiveCorpus(manifest, () => markdown);
    expect(getProgressivePaths(corpus.root).filter((entry) => entry.type === 'leaf')).toHaveLength(1);
    expect(getProgressiveRoutePaths(corpus)).toContainEqual({ path: 'source/old-setup', type: 'leaf' });
    const site = new URL('https://site.example/');
    expect(renderProgressiveNode(corpus, 'source/old-setup', site, site)).toEqual(
      renderProgressiveNode(corpus, 'source/setup', site, site),
    );
    expect(renderProgressiveFullIndex(corpus, site)).not.toContain('old-setup');
    if (!manifest.enrichment?.aliases[0]) throw new Error('missing alias fixture');
    manifest.enrichment.aliases[0].target = 'content/source/missing/index.md';
    expect(() => buildProgressiveCorpus(manifest, () => markdown)).toThrow('canonical target');
    if (!manifest.enrichment?.aliases[0]) throw new Error('missing alias fixture');
    manifest.enrichment.aliases[0].target = 'content/source/setup/index.md';
    manifest.enrichment.aliases[0].path = 'content/source/setup/index.md';
    expect(() => buildProgressiveCorpus(manifest, () => markdown)).toThrow('collision');
  });

  it('preserves complete grounded descriptions with a pinned enrichment artifact', () => {
    const text =
      'Configure the application policy using the required namespace and permissions. Verify its status before sending traffic.';
    const markdown = `---\ntitle: Guide\ncategory: Guides\ndescription: ${text}\n---\n\nArticle.\n`;
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [document('source', 'content/source/guide/index.md', markdown)],
      assets: [],
      enrichment: { artifact_sha256: 'a'.repeat(64), aliases: [] },
    };
    const corpus = buildProgressiveCorpus(manifest, () => markdown, {
      hints: { strategy: 'first-sentence', maxCharacters: 20 },
    });
    expect(renderProgressiveFullIndex(corpus, new URL('https://site.example/'))).toContain(text);
    if (!manifest.enrichment) throw new Error('missing enrichment fixture');
    manifest.enrichment.artifact_sha256 = 'stale';
    expect(() => buildProgressiveCorpus(manifest, () => markdown)).toThrow('pinned enrichment');
  });

  it('groups by category and shared subcategory while preserving canonical leaf routes', () => {
    const { corpus } = semanticFixture();
    expect(getProgressivePaths(corpus.root)).toEqual([
      { path: 'source', type: 'directory' },
      { path: 'source/_taxonomy/api-reference', type: 'directory' },
      { path: 'source/reference', type: 'leaf' },
      { path: 'source/_taxonomy/getting-started', type: 'directory' },
      { path: 'source/_taxonomy/getting-started/installation', type: 'directory' },
      { path: 'source/install/linux', type: 'leaf' },
      { path: 'source/install/macos', type: 'leaf' },
      { path: 'source/quickstart', type: 'leaf' },
    ]);
  });

  it('rejects missing categories and semantic route collisions', () => {
    const missingCategory = '---\ntitle: Page\nsubcategory: One\n---\n\nBody.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [document('source', 'content/source/page/index.md', missingCategory)],
      assets: [],
    };
    const taxonomy = {
      taxonomy: {
        levels: ['category', 'subcategory'] as ['category', 'subcategory'],
        collapseSingletonSubcategories: true,
      },
    };
    expect(() => buildProgressiveCorpus(manifest, () => missingCategory, taxonomy)).toThrow(/nonempty category/);

    const collidingFiles = new Map([
      ['content/source/one/index.md', '---\ntitle: One\ncategory: API & Tools\n---\n\nOne.\n'],
      ['content/source/two/index.md', '---\ntitle: Two\ncategory: API Tools\n---\n\nTwo.\n'],
    ]);
    const collidingManifest = {
      ...manifest,
      documents: [...collidingFiles].map(([path, markdown]) => document('source', path, markdown)),
    };
    expect(() => buildProgressiveCorpus(collidingManifest, (path) => collidingFiles.get(path) ?? '', taxonomy)).toThrow(
      /route collision/,
    );
  });

  it('keeps category indexes separate from canonical leaf paths', () => {
    const markdown = '---\ntitle: Administration\ncategory: Administration\n---\n\nBody.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [document('source', 'content/source/administration/index.md', markdown)],
      assets: [],
    };
    const corpus = buildProgressiveCorpus(manifest, () => markdown, {
      taxonomy: { levels: ['category', 'subcategory'], collapseSingletonSubcategories: true },
    });
    expect(getProgressivePaths(corpus.root)).toEqual([
      { path: 'source', type: 'directory' },
      { path: 'source/_taxonomy/administration', type: 'directory' },
      { path: 'source/administration', type: 'leaf' },
    ]);
  });

  it('normalizes and bounds configured hints deterministically', () => {
    const { corpus } = semanticFixture();
    const site = new URL('https://example.com/corpus/');
    const category = renderProgressiveNode(
      corpus,
      'source/_taxonomy/getting-started',
      site,
      new URL('snapshot/', site),
    );
    expect(category).toContain('A single leaf subcategory');
    expect(category).not.toContain('Overview');
    const subcategory = renderProgressiveNode(
      corpus,
      'source/_taxonomy/getting-started/installation',
      site,
      new URL('snapshot/', site),
    );
    expect(subcategory).toContain('Install Linux.');
    expect(subcategory).not.toContain('Extra sentence');
    expect(subcategory).not.toContain('**');

    const leaf = renderProgressiveNode(corpus, 'source/reference', site, new URL('snapshot/', site));
    const hint =
      leaf
        .split('\n')
        .find((line) => line.startsWith('> '))
        ?.slice(2) ?? '';
    expect(hint.length).toBeLessThanOrEqual(72);
    expect(hint).not.toContain('<strong>');
    expect(leaf).toContain('Reference body.');
    expect(renderProgressiveNode(corpus, 'source/reference', site, new URL('snapshot/', site))).toBe(leaf);
  });

  it('constructs a deterministic English-only hierarchy with index collisions', () => {
    const { corpus } = fixture();
    expect(getProgressivePaths(corpus.root)).toEqual([
      { path: 'docs-cloud-f5-com', type: 'directory' },
      { path: 'docs-cloud-f5-com/guides', type: 'directory' },
      { path: 'docs-cloud-f5-com/guides/index', type: 'leaf' },
      { path: 'docs-cloud-f5-com/guides/setup', type: 'leaf' },
      { path: 'my-f5-com', type: 'directory' },
      { path: 'my-f5-com/support', type: 'leaf' },
    ]);
    expect(getProgressivePaths(corpus.root).filter((entry) => entry.type === 'leaf')).toHaveLength(3);
  });

  it('uses source metadata and deterministic descriptions instead of summaries', () => {
    const { corpus } = fixture();
    const index = renderProgressiveIndex(corpus, new URL('https://example.com/html-to-markdown/'), {
      title: 'F5 Docs Corpus',
      description: 'Verified F5 documentation snapshots.',
      sources: { 'docs-cloud-f5-com': { title: 'F5 Distributed Cloud Docs' } },
    });
    expect(index).toContain('# F5 Docs Corpus');
    expect(index).toContain('[F5 Distributed Cloud Docs]');
    expect(index).toContain('Documentation from F5 Distributed Cloud Docs.');
    expect(index).toContain('Source: https://docs.cloud.f5.com/docs-v2');
    expect(index).not.toContain('llms-small.txt');
    expect(index).not.toContain('Translations');
  });

  it('rejects duplicate leaf routes caused by index collisions', () => {
    const markdown = '---\ntitle: Duplicate\n---\n\nBody.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [
        document('source', 'content/source/guides/index.md', markdown),
        document('source', 'content/source/guides/index/index.md', markdown),
      ],
      assets: [],
    };
    expect(() => buildProgressiveCorpus(manifest, () => markdown)).toThrow(/route collision/);
  });

  it('falls back to structural titles when frontmatter metadata is absent', () => {
    const markdown = '---\nurl: https://source.example/getting-started\n---\n\nBody.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [document('source', 'content/source/getting-started/index.md', markdown)],
      assets: [],
    };
    const corpus = buildProgressiveCorpus(manifest, () => markdown);
    const full = renderProgressiveFullIndex(corpus, new URL('https://example.com/corpus/'));
    expect(full).toContain('[Getting Started]');
    expect(full).toContain('Documentation for Getting Started.');
  });

  it('rejects undeclared sources, unsafe paths, size mismatches, and digest mismatches', () => {
    const markdown = '---\ntitle: Page\n---\n\nBody.\n';
    const base: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://source.example' },
      documents: [document('source', 'content/source/page/index.md', markdown)],
      assets: [],
    };
    expect(() =>
      buildProgressiveCorpus({ ...base, documents: [{ ...base.documents[0], sourceId: 'other' }] }, () => markdown),
    ).toThrow(/not declared/);
    expect(() =>
      buildProgressiveCorpus(
        { ...base, documents: [{ ...base.documents[0], path: '../page/index.md' }] },
        () => markdown,
      ),
    ).toThrow(/safe canonical path/);
    expect(() =>
      buildProgressiveCorpus({ ...base, documents: [{ ...base.documents[0], size_bytes: 1 }] }, () => markdown),
    ).toThrow(/size mismatch/);
    expect(() =>
      buildProgressiveCorpus(
        { ...base, documents: [{ ...base.documents[0], file_sha256: '0'.repeat(64) }] },
        () => markdown,
      ),
    ).toThrow(/digest mismatch/);
  });
});

describe('getLlmsRoutePlan', () => {
  it('emits only English progressive routes in corpus mode', () => {
    const routes = getLlmsRoutePlan(true, true);
    expect(routes.map((route) => route.pattern)).toEqual(['/llms.txt', '/llms-full.txt', '/_llms-txt/[...path].txt']);
    expect(routes.map((route) => route.entrypoint)).toEqual([
      './progressive-llms.txt.ts',
      './progressive-llms-full.txt.ts',
      './progressive-tiered.txt.ts',
    ]);
  });
});

describe('progressive corpus rendering', () => {
  it('renders llms-full.txt as a grouped link inventory without document content', () => {
    const { corpus } = fixture();
    const output = renderProgressiveFullIndex(corpus, new URL('https://example.com/html-to-markdown/'));
    expect(output).toContain('## F5 Distributed Cloud Documentation');
    expect(output).toContain('/_llms-txt/docs-cloud-f5-com/guides/setup.txt');
    expect(output).toContain('Documentation for Setup.');
    expect(output).not.toContain('Support body.');
    expect(output).not.toContain('![Diagram]');
  });

  it('renders metadata-only directories and complete-content leaves', () => {
    const { corpus } = fixture();
    const site = new URL('https://example.com/html-to-markdown/');
    const directory = renderProgressiveNode(corpus, 'docs-cloud-f5-com/guides', site, new URL('snapshot/', site));
    expect(directory).toContain('## Contents');
    expect(directory).not.toContain('Welcome.');
    const leaf = renderProgressiveNode(corpus, 'docs-cloud-f5-com/guides/setup', site, new URL('snapshot/', site));
    expect(leaf).toContain('# Setup');
    expect(leaf).toContain(
      '![Diagram](https://example.com/html-to-markdown/snapshot/content/docs-cloud-f5-com/guides/setup/assets/a.png)',
    );
  });

  it('rewrites only manifest-listed local assets and preserves remote links', () => {
    const assets = new Set(['content/source/topic/assets/a.png']);
    const body = [
      '![A](assets/a.png)',
      '[A file](./assets/a.png#download)',
      '![Remote](https://cdn.example/a.png)',
      '[Page](../other/)',
    ].join('\n');
    expect(
      rewriteCorpusAssetReferences(
        body,
        'content/source/topic/index.md',
        assets,
        new URL('https://e.test/x/snapshot/'),
      ),
    ).toBe(
      [
        '![A](https://e.test/x/snapshot/content/source/topic/assets/a.png)',
        '[A file](https://e.test/x/snapshot/content/source/topic/assets/a.png#download)',
        '![Remote](https://cdn.example/a.png)',
        '[Page](../other/)',
      ].join('\n'),
    );
  });

  it('makes every document reachable exactly once with resolving intermediate links', () => {
    const { corpus, manifest } = fixture();
    const site = new URL('https://example.com/html-to-markdown/');
    const paths = getProgressivePaths(corpus.root);
    const routeSet = new Set(paths.map((entry) => entry.path));
    const leaves = paths.filter((entry) => entry.type === 'leaf');
    expect(leaves).toHaveLength(manifest.documents.length);

    for (const entry of paths.filter((candidate) => candidate.type === 'directory')) {
      const output = renderProgressiveNode(corpus, entry.path, site, new URL('snapshot/', site));
      for (const match of output.matchAll(/_llms-txt\/([^\s)]+)\.txt/g)) {
        expect(routeSet.has(match[1] ?? '')).toBe(true);
      }
    }

    const full = renderProgressiveFullIndex(corpus, site);
    for (const leaf of leaves) {
      expect(full.match(new RegExp(`${leaf.path.replaceAll('/', '\\/')}\\.txt`, 'g'))).toHaveLength(1);
    }
    expect(renderProgressiveFullIndex(corpus, site)).toBe(full);
  });
});

describe('curated corpus presentation', () => {
  it('uses prose instead of capture dates and invisible text while keeping leaf routes stable', () => {
    const markdown =
      '---\ntitle: Guide\ncategory: multi-cloud-network-connect\ndescription: "\u200b Published April 5, 2023 | Last modified October 2, 2026"\n---\n\n\u200b\n\n# Guide\n\nPublished April 5, 2023 | Last modified October 2, 2026\n\n## Overview\n\nConfigure secure connections between networks. Additional detail.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { 'docs-cloud-f5-com': 'https://source.example' },
      documents: [document('docs-cloud-f5-com', 'content/docs-cloud-f5-com/guide/index.md', markdown)],
      assets: [],
    };
    const corpus = buildProgressiveCorpus(manifest, () => markdown, {
      taxonomy: { levels: ['category', 'subcategory'] },
      hints: { strategy: 'first-sentence', maxCharacters: 100 },
      sources: { 'docs-cloud-f5-com': { title: 'Official Documentation', description: 'Verified product guides.' } },
    });
    const site = new URL('https://example.com/corpus/');
    const root = renderProgressiveIndex(corpus, site);
    const source = renderProgressiveNode(corpus, 'docs-cloud-f5-com', site, site);
    const full = renderProgressiveFullIndex(corpus, site);
    const leaf = renderProgressiveNode(corpus, 'docs-cloud-f5-com/guide', site, site);
    expect(root).toContain('Official Documentation');
    expect(source).toContain('# Official Documentation');
    expect(source).toContain('Multi-Cloud Network Connect');
    expect(full).toContain('## Official Documentation');
    expect(full).toContain('Configure secure connections between networks.');
    expect(full).not.toContain('Published');
    expect(full).not.toContain('\u200b');
    expect(leaf.match(/^# Guide$/gm)).toHaveLength(1);
    expect(leaf).toContain('Published April 5, 2023');
    expect(getProgressivePaths(corpus.root)).toContainEqual({ path: 'docs-cloud-f5-com/guide', type: 'leaf' });
  });
});

describe('substantive hints', () => {
  it('skips separator metadata and keeps a meaningful paragraph', () => {
    const markdown =
      '---\ntitle: Guide\ncategory: Guides\ndescription: "---"\n---\n\n# Guide\n\nPublished October 4, 2026\n\n---\n\n## Details\n\nConfigure application routing with these options.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: { source: 'https://example.com' },
      documents: [document('source', 'content/source/guide/index.md', markdown)],
      assets: [],
    };
    const corpus = buildProgressiveCorpus(manifest, () => markdown, {
      hints: { strategy: 'first-sentence', maxCharacters: 100 },
    });
    const output = renderProgressiveFullIndex(corpus, new URL('https://example.com/'));
    expect(output).toContain('Configure application routing with these options.');
    expect(output).not.toContain(': ---');
  });
});
