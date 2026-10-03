import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { splitMarkdown, writeCanonicalHierarchy } from '../canonical-corpus.mjs';

const hash = (x) => `sha256:${createHash('sha256').update(x).digest('hex')}`;
function fixture(count = 1, families = ['resources']) {
  const root = mkdtempSync(join(tmpdir(), 'canonical-'));
  const source = join(root, 'documentation');
  mkdirSync(source);
  const files = {};
  for (let i = 0; i < count; i++) {
    const meta = {
      id: `page-${i}`,
      collection_id: `collection-${families[i % families.length]}`,
      provider_type: families[i % families.length],
      provider_name: 'sample',
      role: 'properties',
      schema_path: ['deep', `branch-${i}`],
      category: 'networking',
      classification: { status: 'resolved', rules_sha256: 'rules', sources: ['reviewed-rule'] },
      parent_id: null,
      child_ids: [],
      relationships: [],
      tasks: ['configuration'],
      summary: 'Complete schema details.',
    };
    const body = `# Page ${i}\n\n<a id="section"></a>\n\n## Schema\n\n| Field | Type |\n| --- | --- |\n| name | string |\n\n<!-- comment -->\n\n\`\`\`hcl\nvalue = "é"\n\`\`\`\n`;
    const text = `---\npage_title: "Page ${i}"\nxcsh_docs: ${JSON.stringify({ ...meta, body_bytes: Buffer.byteLength(body), body_sha256: hash(body) })}\n---\n\n${body}`;
    writeFileSync(join(source, `${i}.md`), text);
    files[`documentation/${i}.md`] = { bytes: Buffer.byteLength(text), sha256: hash(text) };
  }
  writeFileSync(join(source, 'generated-manifest.json'), JSON.stringify({ schema_version: 1, files }));
  writeFileSync(
    join(source, 'llms-config.json'),
    JSON.stringify({
      canonicalCorpus: {
        taxonomy: {
          rulesDigest: 'rules',
          topics: { networking: { title: 'Networking', subcategory: 'Connectivity' } },
        },
      },
    }),
  );
  return { root, source, output: join(root, 'output') };
}
test('source isolation, deep scopes, all endpoints, budgets and link closure', () => {
  const f = fixture(70);
  try {
    const first = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output, base: '/provider/' });
    mkdirSync(join(f.root, 'docs'));
    writeFileSync(join(f.root, 'docs/llms-config.json'), 'conflicting registry');
    const second = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output, base: '/provider/' });
    assert.equal(first.corpusSha256, second.corpusSha256);
    assert.equal(first.pages, 70);
    assert.equal(first.unclassified.length, 0);
    for (const file of readdirSync(f.output, { recursive: true }).filter((x) => x.endsWith('.txt'))) {
      const limit = file.endsWith('llms-small.txt')
        ? 4096
        : file === 'llms-full.txt'
          ? Infinity
          : file.endsWith('llms.txt') || file.endsWith('llms-full.txt')
            ? 16384
            : 131072;
      assert.ok(readFileSync(join(f.output, file)).length <= limit, file);
    }
    assert.match(readFileSync(join(f.output, 'llms.txt'), 'utf8'), /Optional[\s\S]*bytes/);
    assert.ok(first.scopes.some((x) => x.includes('/properties/deep/branch-69')));
    assert.equal(first.linksVerified, true);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('receipt corruption fails before output creation', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.source, '0.md'), 'tampered');
    assert.throws(() => writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output }), /receipt mismatch/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('unresolved and conflicting taxonomy stay visible with evidence', () => {
  const f = fixture();
  try {
    writeFileSync(
      join(f.source, 'llms-config.json'),
      JSON.stringify({ canonicalCorpus: { taxonomy: { rulesDigest: 'different', topics: {} } } }),
    );
    const r = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output });
    assert.equal(r.unclassified.length, 1);
    assert.match(readFileSync(join(f.output, 'taxonomy-review.json'), 'utf8'), /rules-digest/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('block splitting preserves UTF-8, anchors, tables, comments and fences exactly', () => {
  const block =
    '# Heading\n\n<a id="anchor"></a>\n\n| A | B |\n|---|---|\n| é | x |\n\n<!-- multi\n\nline -->\n\n```hcl\n# untouched\n\nx = "é"\n```\n\n';
  const text = block.repeat(100);
  const parts = splitMarkdown(text, 1024);
  assert.equal(parts.join(''), text);
  assert.ok(parts.every((x) => Buffer.byteLength(x) <= 1024));
  assert.ok(parts.every((x) => (x.match(/^```/gm) || []).length % 2 === 0));
  assert.throws(() => splitMarkdown('```\n' + 'é'.repeat(700) + '\n```', 1024), /indivisible/);
});
test('every provider family and setup/guides is reachable', () => {
  const families = ['resources', 'data-sources', 'actions', 'ephemeral-resources', 'provider', 'guides'];
  const f = fixture(6, families);
  try {
    const r = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output });
    for (const family of families) assert.ok(r.scopes.includes(`_llms-txt/families/${family}`));
    assert.equal(Object.keys(r.pageIndexes).length, 6);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('slug-normalization collisions fail explicitly', () => {
  const f = fixture(2);
  try {
    const file = join(f.source, '1.md');
    const old = readFileSync(file, 'utf8');
    const changed = old.replace('branch-1', 'branch-0').replace('"properties"', '"Properties"');
    writeFileSync(file, changed);
    const manifest = JSON.parse(readFileSync(join(f.source, 'generated-manifest.json'), 'utf8'));
    manifest.files['documentation/1.md'] = { bytes: Buffer.byteLength(changed), sha256: hash(changed) };
    writeFileSync(join(f.source, 'generated-manifest.json'), JSON.stringify(manifest));
    assert.throws(() => writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output }), /route collision/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('complete leaves have no fixed byte limit while discovery stays bounded', () => {
  const f = fixture();
  try {
    const old = readFileSync(join(f.source, '0.md'), 'utf8');
    const meta = JSON.parse(
      old
        .split('\n')
        .find((x) => x.startsWith('xcsh_docs: '))
        .slice(11),
    );
    const body = '| Schema path | Complete reference |\n| --- | --- |\n' + '| `deep` | complete |\n'.repeat(100000);
    const text = `---\npage_title: "Large table"\nxcsh_docs: ${JSON.stringify({ ...meta, body_bytes: Buffer.byteLength(body), body_sha256: hash(body) })}\n---\n\n${body}`;
    writeFileSync(join(f.source, '0.md'), text);
    writeFileSync(
      join(f.source, 'generated-manifest.json'),
      JSON.stringify({
        schema_version: 1,
        files: { 'documentation/0.md': { bytes: Buffer.byteLength(text), sha256: hash(text) } },
      }),
    );
    const r = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output });
    const leaf = `${r.pageIndexes['page-0'].scope}/content.txt`;
    assert.equal(readFileSync(join(f.output, leaf), 'utf8'), body);
    assert.ok(readFileSync(join(f.output, leaf)).length > 2 * 1024 * 1024);
    assert.equal(r.maxLeafBytes, Buffer.byteLength(body));
    assert.match(readFileSync(join(f.output, r.pageIndexes['page-0'].scope, 'llms.txt'), 'utf8'), /2200051 bytes/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('reviewed collection mappings create multiple subcategories and report ambiguity', () => {
  const f = fixture(2);
  try {
    const config = JSON.parse(readFileSync(join(f.source, 'llms-config.json'), 'utf8'));
    config.canonicalCorpus.taxonomy.subcategories = [
      {
        category: 'networking',
        title: 'Routing',
        collections: ['sample'],
        evidence: 'Pinned schema identity and description.',
      },
      {
        category: 'networking',
        title: 'Interfaces',
        collections: ['sample'],
        evidence: 'Conflicting reviewed mapping.',
      },
    ];
    writeFileSync(join(f.source, 'llms-config.json'), JSON.stringify(config));
    const r = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output });
    assert.equal(r.unclassified.length, 1);
    assert.ok(r.unclassified[0].reasons.includes('ambiguous-subcategory'));
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('distinct reviewed identities stay in smaller sibling subcategories', () => {
  const f = fixture(2);
  try {
    const file = join(f.source, '1.md');
    const text = readFileSync(file, 'utf8')
      .replace('"collection-resources"', '"collection-second"')
      .replace('"provider_name":"sample"', '"provider_name":"second"');
    writeFileSync(file, text);
    const manifest = JSON.parse(readFileSync(join(f.source, 'generated-manifest.json'), 'utf8'));
    manifest.files['documentation/1.md'] = { bytes: Buffer.byteLength(text), sha256: hash(text) };
    writeFileSync(join(f.source, 'generated-manifest.json'), JSON.stringify(manifest));
    const config = JSON.parse(readFileSync(join(f.source, 'llms-config.json'), 'utf8'));
    config.canonicalCorpus.taxonomy.subcategories = [
      { category: 'networking', title: 'Routing', collections: ['sample'], evidence: 'Canonical routing identity.' },
      {
        category: 'networking',
        title: 'Interfaces',
        collections: ['second'],
        evidence: 'Canonical interface identity.',
      },
    ];
    writeFileSync(join(f.source, 'llms-config.json'), JSON.stringify(config));
    const r = writeCanonicalHierarchy({ contentRoot: f.source, outputRoot: f.output });
    assert.equal(r.unclassified.length, 0);
    assert.ok(r.scopes.includes('_llms-txt/topics/networking/routing'));
    assert.ok(r.scopes.includes('_llms-txt/topics/networking/interfaces'));
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
