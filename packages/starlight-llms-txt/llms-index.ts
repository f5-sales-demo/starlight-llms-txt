/**
 * Renders the tier-1 `llms.txt` index. Shared by the site-root route and the
 * per-locale routes so that every language gets the same shape of entry point,
 * and kept free of Astro imports so it can be unit tested.
 */

export interface IndexLink {
  label: string;
  url: string;
  description?: string | undefined;
}

export interface RenderLlmsIndexOptions {
  /** Site title, used in the heading and in the documentation set descriptions. */
  title: string;
  /** Site description, rendered as a blockquote under the heading. */
  description?: string | undefined;
  /** Free-form block rendered under the description. */
  details?: string | undefined;
  /** Absolute URL of the abridged document for this index. */
  smallUrl: string;
  /** Absolute URL of the complete document for this index. */
  fullUrl: string;
  /**
   * Disambiguates the documentation sets when an index covers one language of a
   * multilingual site — rendered as `… for <title> (<setLabel>)`.
   */
  setLabel?: string | undefined;
  /** Pre-rendered `## Sections` block. */
  sectionsBlock?: string | undefined;
  /** Pre-rendered federated sites block. */
  federatedBlock?: string | undefined;
  /** Indexes for the other languages of this site. */
  translations?: IndexLink[] | undefined;
  /** Links to material that the markdown documents do not carry. */
  optionalLinks?: IndexLink[] | undefined;
}

const NOTES = `- The complete documentation includes all content from the official documentation
- The content is automatically generated from the same source as the official documentation`;

export interface TranslationEntry {
  /** URL path segment of the locale, e.g. `pt-br`. */
  key: string;
  /** Human-readable name of the language, in that language. */
  label: string;
  /** BCP-47 language tag, e.g. `pt-BR`. */
  lang: string;
}

/**
 * Build the links for the `## Translations` block: one `llms.txt` index per
 * language, excluding the language whose index is being rendered.
 */
export function buildTranslationLinks(entries: TranslationEntry[], site: URL, exclude: string[] = []): IndexLink[] {
  return entries
    .filter((entry) => !exclude.includes(entry.key))
    .map((entry) => ({
      label: entry.label,
      url: new URL(`./${entry.key}/llms.txt`, site).href,
      description: `index of the ${entry.lang} documentation`,
    }));
}

function renderLinks(links: IndexLink[]): string {
  return links
    .map((link) => `- [${link.label}](${link.url})${link.description ? `: ${link.description}` : ''}`)
    .join('\n');
}

export function renderLlmsIndex(options: RenderLlmsIndexOptions): string {
  const { title, description, details, smallUrl, fullUrl, setLabel } = options;
  const { sectionsBlock, federatedBlock, translations = [], optionalLinks = [] } = options;

  const subject = setLabel ? `${title} (${setLabel})` : title;

  const segments = [`# ${title}`];
  if (description) segments.push(`> ${description}`);
  if (details) segments.push(details);

  segments.push('## Documentation Sets');
  segments.push(
    [
      `- [Abridged documentation](${smallUrl}): a compact version of the documentation for ${subject}, with non-essential content removed`,
      `- [Complete documentation](${fullUrl}): the full documentation for ${subject}`,
    ].join('\n'),
  );

  if (sectionsBlock) segments.push(sectionsBlock);
  if (federatedBlock) segments.push(federatedBlock);

  if (translations.length > 0) {
    segments.push('## Translations');
    segments.push(renderLinks(translations));
  }

  segments.push('## Notes');
  segments.push(NOTES);

  if (optionalLinks.length > 0) {
    segments.push('## Optional');
    segments.push(renderLinks(optionalLinks));
  }

  return `${segments.join('\n\n')}\n`;
}
