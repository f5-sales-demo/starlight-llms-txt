/**
 * Locale bookkeeping, kept free of Astro and of the virtual config module so it
 * can be unit tested. `utils.ts` binds these to the plugin context.
 *
 * Starlight keys `locales` by URL path segment, except for `root`, which is the
 * locale served without a prefix. So the set of locales that can carry a
 * `/<locale>/…` route is every key other than `root` — which includes the
 * default locale whenever it names a real directory, as it does for a site laid
 * out as `docs/en/`, `docs/ja/`, …
 */

export interface LocaleEntry {
  lang?: string | undefined;
  label?: string | undefined;
}

export interface LocaleContext {
  defaultLocale?: string | undefined;
  locales?: Record<string, LocaleEntry | undefined> | undefined;
}

/** Resolve the language tag of the default locale. */
export function deriveDefaultLang({ defaultLocale, locales }: LocaleContext): string {
  return (defaultLocale === 'root' ? locales?.root?.lang : defaultLocale) || 'en';
}

/** Locale keys that occupy a URL path segment of their own. */
export function deriveRoutableLocales({ locales }: LocaleContext): string[] {
  return Object.keys(locales || {}).filter((key) => key !== 'root');
}

/**
 * Locale keys that need their own generated documents — every routable locale
 * except the default, whose documents are served from the site root.
 *
 * The default locale is matched on both its key and its language tag, so a site
 * configured as `defaultLocale: 'en-us'` with `locales: { 'en-us': { lang: 'en' } }`
 * does not emit a duplicate of the root documents.
 */
export function deriveNonDefaultLocales(context: LocaleContext): string[] {
  const defaultLang = deriveDefaultLang(context);
  return deriveRoutableLocales(context).filter((key) => key !== defaultLang && key !== context.defaultLocale);
}

/**
 * Whether a document id belongs to the default locale.
 *
 * Ids are locale-prefixed for every non-default locale (`ja/demo/deploy`). The
 * default locale is whatever is left over, which covers both a site laid out as
 * `docs/en/…` and one whose default locale is `root` and has no prefix at all.
 */
export function isDefaultLocaleId(id: string, nonDefaultKeys: string[]): boolean {
  return !nonDefaultKeys.some((key) => id === key || id.startsWith(`${key}/`));
}

/** Whether a document id belongs to a specific locale. */
export function isLocaleId(id: string, targetLocale: string, nonDefaultKeys: string[], defaultLang: string): boolean {
  if (targetLocale === defaultLang || targetLocale === 'root') return isDefaultLocaleId(id, nonDefaultKeys);
  return id === targetLocale || id.startsWith(`${targetLocale}/`);
}
