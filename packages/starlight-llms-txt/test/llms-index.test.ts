// packages/starlight-llms-txt/test/llms-index.test.ts
import { describe, expect, it } from 'vitest';
import { buildTranslationLinks, renderLlmsIndex } from '../llms-index';

const entries = [
  { key: 'en', label: 'English', lang: 'en' },
  { key: 'ja', label: '日本語', lang: 'ja' },
  { key: 'pt-br', label: 'Português (Brasil)', lang: 'pt-BR' },
];

describe('buildTranslationLinks', () => {
  it('builds one index link per language, under the site base', () => {
    const links = buildTranslationLinks(entries, new URL('https://example.com/mcn/'));
    expect(links).toEqual([
      { label: 'English', url: 'https://example.com/mcn/en/llms.txt', description: 'index of the en documentation' },
      { label: '日本語', url: 'https://example.com/mcn/ja/llms.txt', description: 'index of the ja documentation' },
      {
        label: 'Português (Brasil)',
        url: 'https://example.com/mcn/pt-br/llms.txt',
        description: 'index of the pt-BR documentation',
      },
    ]);
  });

  it('excludes the language whose index is being rendered', () => {
    const links = buildTranslationLinks(entries, new URL('https://example.com/mcn/'), ['ja']);
    expect(links.map((link) => link.label)).toEqual(['English', 'Português (Brasil)']);
  });

  it('returns an empty list for a single-language site', () => {
    expect(
      buildTranslationLinks([{ key: 'en', label: 'English', lang: 'en' }], new URL('https://e.com/'), ['en']),
    ).toEqual([]);
  });
});

const base = {
  title: 'Multi-Cloud Networking',
  smallUrl: 'https://example.com/mcn/llms-small.txt',
  fullUrl: 'https://example.com/mcn/llms-full.txt',
};

describe('renderLlmsIndex', () => {
  it('renders the title, description and documentation sets', () => {
    const out = renderLlmsIndex({ ...base, description: 'Multi-cloud networking.' });
    expect(out).toBe(
      `# Multi-Cloud Networking

> Multi-cloud networking.

## Documentation Sets

- [Abridged documentation](https://example.com/mcn/llms-small.txt): a compact version of the documentation for Multi-Cloud Networking, with non-essential content removed
- [Complete documentation](https://example.com/mcn/llms-full.txt): the full documentation for Multi-Cloud Networking

## Notes

- The complete documentation includes all content from the official documentation
- The content is automatically generated from the same source as the official documentation
`,
    );
  });

  it('omits the description line when there is no description', () => {
    const out = renderLlmsIndex(base);
    expect(out).not.toContain('>');
    expect(out.split('\n')[0]).toBe('# Multi-Cloud Networking');
  });

  it('names the language in the documentation set descriptions when given a set label', () => {
    const out = renderLlmsIndex({ ...base, setLabel: 'ja' });
    expect(out).toContain(
      '- [Abridged documentation](https://example.com/mcn/llms-small.txt): a compact version of the documentation for Multi-Cloud Networking (ja), with non-essential content removed',
    );
    expect(out).toContain(
      '- [Complete documentation](https://example.com/mcn/llms-full.txt): the full documentation for Multi-Cloud Networking (ja)',
    );
  });

  it('includes the details block when provided', () => {
    const out = renderLlmsIndex({ ...base, details: 'Extra detail.' });
    expect(out).toContain('\nExtra detail.\n');
  });

  it('places the sections block after the documentation sets', () => {
    const out = renderLlmsIndex({ ...base, sectionsBlock: '## Sections\n\n- [A](https://example.com/a.txt)' });
    expect(out.indexOf('## Documentation Sets')).toBeLessThan(out.indexOf('## Sections'));
    expect(out.indexOf('## Sections')).toBeLessThan(out.indexOf('## Notes'));
  });

  it('renders a translations block between the sections and the notes', () => {
    const out = renderLlmsIndex({
      ...base,
      sectionsBlock: '## Sections\n\n- [A](https://example.com/a.txt)',
      translations: [
        { label: 'ja', url: 'https://example.com/mcn/ja/llms.txt', description: 'Japanese' },
        { label: 'ar', url: 'https://example.com/mcn/ar/llms.txt' },
      ],
    });
    expect(out).toContain(`## Translations

- [ja](https://example.com/mcn/ja/llms.txt): Japanese
- [ar](https://example.com/mcn/ar/llms.txt)`);
    expect(out.indexOf('## Sections')).toBeLessThan(out.indexOf('## Translations'));
    expect(out.indexOf('## Translations')).toBeLessThan(out.indexOf('## Notes'));
  });

  it('omits the translations block when there are no translations', () => {
    expect(renderLlmsIndex({ ...base, translations: [] })).not.toContain('## Translations');
    expect(renderLlmsIndex(base)).not.toContain('## Translations');
  });

  it('renders optional links last', () => {
    const out = renderLlmsIndex({
      ...base,
      optionalLinks: [{ label: 'main.tf', url: 'https://example.com/main.tf', description: 'Source' }],
    });
    expect(out).toContain('## Optional\n\n- [main.tf](https://example.com/main.tf): Source');
    expect(out.indexOf('## Notes')).toBeLessThan(out.indexOf('## Optional'));
  });

  it('omits the optional block when there are no optional links', () => {
    expect(renderLlmsIndex({ ...base, optionalLinks: [] })).not.toContain('## Optional');
  });

  it('includes the federated block when provided', () => {
    const out = renderLlmsIndex({ ...base, federatedBlock: '## Related sites\n\n- [X](https://x.example)' });
    expect(out).toContain('## Related sites');
    expect(out.indexOf('## Related sites')).toBeLessThan(out.indexOf('## Notes'));
  });

  it('ends with exactly one trailing newline', () => {
    const out = renderLlmsIndex(base);
    expect(out.endsWith('\n')).toBe(true);
    expect(out.endsWith('\n\n')).toBe(false);
  });
});
