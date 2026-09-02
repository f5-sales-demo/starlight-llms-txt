// packages/starlight-llms-txt/test/tier-tree.test.ts
import { describe, expect, it } from 'vitest';
import { buildTierTree, getAllTierPaths } from '../tier-tree';

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

describe('buildTierTree', () => {
  it('returns an empty root for empty input', () => {
    const tree = buildTierTree([]);
    expect(tree.type).toBe('directory');
    expect(tree.children.size).toBe(0);
  });

  it('places a top-level page as a leaf child of root', () => {
    const tree = buildTierTree([doc('overview', { title: 'Overview' })]);
    expect(tree.children.size).toBe(1);
    const leaf = tree.children.get('overview');
    expect(leaf?.type).toBe('leaf');
    expect(leaf?.meta.title).toBe('Overview');
  });

  it('creates directory nodes for nested pages', () => {
    const tree = buildTierTree([doc('guides/getting-started', { title: 'Getting Started' })]);
    const guides = tree.children.get('guides');
    expect(guides?.type).toBe('directory');
    if (guides?.type !== 'directory') throw new Error('expected directory');
    const gs = guides.children.get('getting-started');
    expect(gs?.type).toBe('leaf');
    expect(gs?.meta.title).toBe('Getting Started');
  });

  it('creates deeply nested directory nodes at 3+ levels', () => {
    const tree = buildTierTree([doc('a/b/c/page', { title: 'Deep Page' })]);
    const a = tree.children.get('a');
    expect(a?.type).toBe('directory');
    if (a?.type !== 'directory') throw new Error('expected dir');
    const b = a.children.get('b');
    expect(b?.type).toBe('directory');
    if (b?.type !== 'directory') throw new Error('expected dir');
    const c = b.children.get('c');
    expect(c?.type).toBe('directory');
    if (c?.type !== 'directory') throw new Error('expected dir');
    const page = c.children.get('page');
    expect(page?.type).toBe('leaf');
    expect(page?.meta.title).toBe('Deep Page');
  });

  it('propagates index page metadata to parent directory', () => {
    const tree = buildTierTree([
      doc('guides/index', { title: 'Guides Home', description: 'All guides' }),
      doc('guides/setup', { title: 'Setup' }),
    ]);
    const guides = tree.children.get('guides');
    expect(guides?.type).toBe('directory');
    expect(guides?.meta.title).toBe('Guides Home');
    expect(guides?.meta.description).toBe('All guides');
  });

  it('creates index leaf alongside metadata propagation', () => {
    const tree = buildTierTree([doc('guides/index', { title: 'Guides Home' })]);
    const guides = tree.children.get('guides');
    if (guides?.type !== 'directory') throw new Error('expected dir');
    const indexLeaf = guides.children.get('index');
    expect(indexLeaf?.type).toBe('leaf');
  });

  it('derives title from slug when no index page exists', () => {
    const tree = buildTierTree([doc('my-section/page', { title: 'A Page' })]);
    const section = tree.children.get('my-section');
    expect(section?.meta.title).toBe('My Section');
  });

  it('excludes draft pages', () => {
    const tree = buildTierTree([doc('visible', { title: 'Visible' }), doc('hidden', { title: 'Hidden', draft: true })]);
    expect(tree.children.size).toBe(1);
    expect(tree.children.has('visible')).toBe(true);
  });

  it('applies promote ordering — promoted pages sort first within directory', () => {
    const tree = buildTierTree([doc('zeta', { title: 'Zeta' }), doc('alpha', { title: 'Alpha' })], {
      promote: ['zeta*'],
    });
    const keys = [...tree.children.keys()];
    expect(keys).toEqual(['zeta', 'alpha']);
  });

  it('applies demote ordering — demoted pages sort last', () => {
    const tree = buildTierTree([doc('references', { title: 'References' }), doc('overview', { title: 'Overview' })], {
      demote: ['references*'],
    });
    const keys = [...tree.children.keys()];
    expect(keys).toEqual(['overview', 'references']);
  });

  it('matches promote and demote patterns relative to an explicit locale prefix', () => {
    const tree = buildTierTree([doc('en/reference'), doc('en/guide'), doc('en/index')], {
      promote: ['index'],
      demote: ['reference'],
      localePrefixes: ['en'],
    });
    const en = tree.children.get('en');
    if (en?.type !== 'directory') throw new Error('expected locale directory');
    expect([...en.children.keys()]).toEqual(['index', 'guide', 'reference']);
  });

  it('does not strip an unconfigured first path segment when matching patterns', () => {
    const tree = buildTierTree([doc('guides/setup'), doc('setup')], {
      promote: ['setup'],
      localePrefixes: ['en'],
    });
    expect([...tree.children.keys()]).toEqual(['setup', 'guides']);
  });

  it('preserves a subtree when its parent page sorts after a child', () => {
    const tree = buildTierTree(
      [
        doc('en/section', { title: 'Section', description: 'Section summary' }),
        doc('en/section/page-a', { title: 'Page A' }),
        doc('en/section/page-b', { title: 'Page B' }),
      ],
      { promote: ['section/**'], localePrefixes: ['en'] },
    );
    const en = tree.children.get('en');
    if (en?.type !== 'directory') throw new Error('expected locale directory');
    const section = en.children.get('section');
    if (section?.type !== 'directory') throw new Error('expected section directory');
    expect(section.meta).toEqual({ title: 'Section', description: 'Section summary' });
    expect([...section.children.keys()].sort()).toEqual(['index', 'page-a', 'page-b']);
    expect(section.children.get('index')).toMatchObject({
      type: 'leaf',
      slug: 'en/section/index',
      segment: 'index',
    });
  });

  it('prunes empty directories (no non-draft children)', () => {
    const tree = buildTierTree([doc('empty-section/only-draft', { title: 'Draft', draft: true })]);
    expect(tree.children.size).toBe(0);
  });

  it('handles mixed top-level and nested pages', () => {
    const tree = buildTierTree([
      doc('overview', { title: 'Overview' }),
      doc('guides/setup', { title: 'Setup' }),
      doc('guides/advanced', { title: 'Advanced' }),
    ]);
    expect(tree.children.size).toBe(2);
    expect(tree.children.get('overview')?.type).toBe('leaf');
    expect(tree.children.get('guides')?.type).toBe('directory');
  });

  it('converts a leaf to a directory when a deeper page shares the same prefix', () => {
    const tree = buildTierTree([
      doc('guides', { title: 'Guides Overview', description: 'Top-level guides page' }),
      doc('guides/setup', { title: 'Setup' }),
    ]);
    const guides = tree.children.get('guides');
    expect(guides?.type).toBe('directory');
    if (guides?.type !== 'directory') throw new Error('expected directory');
    expect(guides.meta.title).toBe('Guides Overview');
    expect(guides.meta.description).toBe('Top-level guides page');
    const indexLeaf = guides.children.get('index');
    expect(indexLeaf?.type).toBe('leaf');
    expect(indexLeaf?.meta.title).toBe('Guides Overview');
    const setupLeaf = guides.children.get('setup');
    expect(setupLeaf?.type).toBe('leaf');
    expect(setupLeaf?.meta.title).toBe('Setup');
  });
});

describe('getAllTierPaths', () => {
  it('returns empty array for empty tree', () => {
    const tree = buildTierTree([]);
    expect(getAllTierPaths(tree)).toEqual([]);
  });

  it('returns leaf path for a top-level page', () => {
    const tree = buildTierTree([doc('overview', { title: 'Overview' })]);
    const paths = getAllTierPaths(tree);
    expect(paths).toContainEqual({ path: 'overview', type: 'leaf' });
  });

  it('returns directory and leaf paths for nested structure', () => {
    const tree = buildTierTree([doc('guides/index', { title: 'Guides' }), doc('guides/setup', { title: 'Setup' })]);
    const paths = getAllTierPaths(tree);
    expect(paths).toContainEqual({ path: 'guides', type: 'directory' });
    expect(paths).toContainEqual({ path: 'guides/index', type: 'leaf' });
    expect(paths).toContainEqual({ path: 'guides/setup', type: 'leaf' });
  });

  it('returns paths at all depth levels', () => {
    const tree = buildTierTree([doc('a/b/c/page', { title: 'Deep' })]);
    const paths = getAllTierPaths(tree);
    expect(paths).toContainEqual({ path: 'a', type: 'directory' });
    expect(paths).toContainEqual({ path: 'a/b', type: 'directory' });
    expect(paths).toContainEqual({ path: 'a/b/c', type: 'directory' });
    expect(paths).toContainEqual({ path: 'a/b/c/page', type: 'leaf' });
  });

  it('covers every locale when documents from several locales are supplied', () => {
    const tree = buildTierTree([
      doc('en/index', { title: 'Home' }),
      doc('en/demo/index', { title: 'Demo' }),
      doc('en/demo/deploy', { title: 'Deploy' }),
      doc('ja/index', { title: 'ホーム' }),
      doc('ja/demo/index', { title: 'デモ' }),
      doc('ja/demo/deploy', { title: 'デプロイ' }),
    ]);

    expect([...tree.children.keys()]).toEqual(['en', 'ja']);

    const paths = getAllTierPaths(tree);
    for (const locale of ['en', 'ja']) {
      expect(paths).toContainEqual({ path: locale, type: 'directory' });
      expect(paths).toContainEqual({ path: `${locale}/demo`, type: 'directory' });
      expect(paths).toContainEqual({ path: `${locale}/demo/deploy`, type: 'leaf' });
    }
  });

  it('keeps each locale’s titles and descriptions on its own subtree', () => {
    const tree = buildTierTree([
      doc('en/demo/index', { title: 'Demo', description: 'English summary' }),
      doc('ja/demo/index', { title: 'デモ', description: '日本語の要約' }),
    ]);

    const en = tree.children.get('en');
    const ja = tree.children.get('ja');
    if (en?.type !== 'directory' || ja?.type !== 'directory') throw new Error('expected directories');
    expect(en.children.get('demo')?.meta).toEqual({ title: 'Demo', description: 'English summary' });
    expect(ja.children.get('demo')?.meta).toEqual({ title: 'デモ', description: '日本語の要約' });
  });
});
