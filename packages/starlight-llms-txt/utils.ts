import type { CollectionEntry } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { TranslationEntry } from './llms-index';
import {
  deriveDefaultLang,
  deriveNonDefaultLocales,
  deriveRoutableLocales,
  isDefaultLocaleId,
  isLocaleId,
  type LocaleContext,
} from './locales';

const { defaultLocale, locales, title } = starlightLllmsTxtContext;
const localeContext: LocaleContext = { defaultLocale, locales };
export const defaultLang = deriveDefaultLang(localeContext);

/** Get the site title from the Starlight config. */
export function getSiteTitle(): string {
  return typeof title === 'string' ? title : (title[defaultLang] as string);
}

const localeKeys = deriveNonDefaultLocales(localeContext);
const routableLocaleKeys = deriveRoutableLocales(localeContext);

/** Check if a content collection entry is part of the default locale or not. */
export function isDefaultLocale(doc: CollectionEntry<'docs'>): boolean {
  return isDefaultLocaleId(doc.id, localeKeys);
}

/** Check if a content collection entry belongs to a specific locale. */
export function isLocale(doc: CollectionEntry<'docs'>, targetLocale: string): boolean {
  return isLocaleId(doc.id, targetLocale, localeKeys, defaultLang);
}

/** Get all non-default locale keys — the locales that need their own documents. */
export function getLocaleKeys(): string[] {
  return localeKeys;
}

/**
 * Get every locale key that occupies a URL path segment, including the default
 * locale when it lives in a directory of its own. Each of these gets an
 * `llms.txt` index so that a consumer can construct one from any page path.
 */
export function getRoutableLocaleKeys(): string[] {
  return routableLocaleKeys;
}

/** Describe a locale for display, falling back to its key when unlabelled. */
export function getLocaleMeta(key: string): { label: string; lang: string } {
  const entry = locales?.[key];
  return { label: entry?.label || key, lang: entry?.lang || key };
}

/**
 * Routable keys that name the default locale — empty for a site whose default
 * locale is `root` and therefore has no path segment of its own.
 */
export function getDefaultLocaleKeys(): string[] {
  return routableLocaleKeys.filter((key) => !localeKeys.includes(key));
}

/** Every routable locale, described for the `## Translations` block. */
export function getTranslationEntries(): TranslationEntry[] {
  return routableLocaleKeys.map((key) => ({ key, ...getLocaleMeta(key) }));
}

/** Append a `/` to the passed string if it doesn’t already end with one. */
export function ensureTrailingSlash(path: string) {
  return path.at(-1) === '/' ? path : `${path}/`;
}
