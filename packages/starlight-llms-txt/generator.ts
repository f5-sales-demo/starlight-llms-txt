import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { APIContext } from 'astro';
import micromatch from 'micromatch';
import { entryToSimpleMarkdown } from './entryToSimpleMarkdown';
import { prioritySortKey } from './tier-tree';
import { defaultLang, getDefaultLocaleKeys, isDefaultLocale, isLocale } from './utils';

/** Collator to compare two strings in the default language. */
const collator = new Intl.Collator(defaultLang);

/**
 * Generates a single plaintext Markdown document from the full website content.
 */
export async function generateLlmsTxt(
  context: APIContext,
  {
    minify,
    description,
    exclude,
    include,
    locale,
  }: {
    /** Generate a smaller file to fit within smaller context windows. */
    minify: boolean;
    /** Description of the document being generated. Prepended to output inside `<SYSTEM>` tags. */
    description: string | undefined;
    exclude?: string[] | undefined;
    include?: string[] | undefined;
    locale?: string | undefined;
  },
): Promise<string> {
  const docFilter = locale
    ? (doc: { id: string; data: { draft?: boolean } }) =>
        isLocale(doc as CollectionEntry<'docs'>, locale) && !doc.data.draft
    : (doc: { id: string; data: { draft?: boolean } }) =>
        isDefaultLocale(doc as CollectionEntry<'docs'>) && !doc.data.draft;
  let docs = await getCollection('docs', docFilter);
  if (include) {
    docs = docs.filter((doc) => micromatch.isMatch(doc.id, include));
  }
  if (exclude) {
    docs = docs.filter((doc) => !micromatch.isMatch(doc.id, exclude));
  }
  const { promote, demote, pageSeparator } = starlightLllmsTxtContext;
  const localePrefixes = locale ? [locale] : getDefaultLocaleKeys();
  docs.sort((a, b) =>
    collator.compare(
      prioritySortKey(a.id, promote, demote, localePrefixes),
      prioritySortKey(b.id, promote, demote, localePrefixes),
    ),
  );
  const segments: string[] = [];
  for (const doc of docs) {
    const docSegments = [`# ${doc.data.hero?.title || doc.data.title}`];
    const description = doc.data.hero?.tagline || doc.data.description;
    if (description) docSegments.push(`> ${description}`);
    docSegments.push(await entryToSimpleMarkdown(doc, context, minify));
    segments.push(docSegments.join('\n\n'));
  }
  if (description) {
    segments.unshift(`<SYSTEM>${description}</SYSTEM>`);
  }
  return segments.join(pageSeparator);
}
