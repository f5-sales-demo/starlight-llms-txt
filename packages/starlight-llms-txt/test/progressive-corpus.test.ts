import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildProgressiveCorpus,
  getProgressivePaths,
  renderProgressiveFullIndex,
  renderProgressiveIndex,
  renderProgressiveNode,
  rewriteCorpusAssetReferences,
  type ProgressiveCorpusManifest,
} from '../progressive-corpus';

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
    [
      'content/docs-cloud-f5-com/guides/index.md',
      '---\ntitle: Guides\ndescription: Product guides\n---\n\nWelcome.\n',
    ],
    [
      'content/docs-cloud-f5-com/guides/setup/index.md',
      '---\ntitle: Setup\n---\n\n![Diagram](assets/a.png)\n',
    ],
    ['content/my-f5-com/support/index.md', '---\ntitle: Support\n---\n\nSupport body.\n'],
  ]);
  const manifest: ProgressiveCorpusManifest = {
    schema_version: 2,
    source_roots: ['my-f5-com', 'docs-cloud-f5-com'],
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

describe('buildProgressiveCorpus', () => {
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
    expect(index).not.toContain('llms-small.txt');
    expect(index).not.toContain('Translations');
  });

  it('rejects duplicate leaf routes caused by index collisions', () => {
    const markdown = '---\ntitle: Duplicate\n---\n\nBody.\n';
    const manifest: ProgressiveCorpusManifest = {
      schema_version: 2,
      source_roots: ['source'],
      documents: [
        document('source', 'content/source/guides/index.md', markdown),
        document('source', 'content/source/guides/index/index.md', markdown),
      ],
      assets: [],
    };
    expect(() => buildProgressiveCorpus(manifest, () => markdown)).toThrow(/route collision/);
  });
});

describe('progressive corpus rendering', () => {
  it('renders llms-full.txt as a grouped link inventory without document content', () => {
    const { corpus } = fixture();
    const output = renderProgressiveFullIndex(corpus, new URL('https://example.com/html-to-markdown/'));
    expect(output).toContain('## Docs Cloud F5 Com');
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
    const leaf = renderProgressiveNode(
      corpus,
      'docs-cloud-f5-com/guides/setup',
      site,
      new URL('snapshot/', site),
    );
    expect(leaf).toContain('# Setup');
    expect(leaf).toContain('![Diagram](https://example.com/html-to-markdown/snapshot/content/docs-cloud-f5-com/guides/setup/assets/a.png)');
  });

  it('rewrites only manifest-listed local assets and preserves remote links', () => {
    const assets = new Set(['content/source/topic/assets/a.png']);
    const body = [
      '![A](assets/a.png)',
      '[A file](./assets/a.png)',
      '![Remote](https://cdn.example/a.png)',
      '[Page](../other/)',
    ].join('\n');
    expect(
      rewriteCorpusAssetReferences(body, 'content/source/topic/index.md', assets, new URL('https://e.test/x/snapshot/')),
    ).toBe(
      [
        '![A](https://e.test/x/snapshot/content/source/topic/assets/a.png)',
        '[A file](https://e.test/x/snapshot/content/source/topic/assets/a.png)',
        '![Remote](https://cdn.example/a.png)',
        '[Page](../other/)',
      ].join('\n'),
    );
  });
});
