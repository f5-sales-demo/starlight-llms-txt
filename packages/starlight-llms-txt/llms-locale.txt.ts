import { getCollection } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { APIRoute, GetStaticPaths } from 'astro';
import { renderFederatedSites } from './federated-sites';
import { buildTranslationLinks, renderLlmsIndex } from './llms-index';
import { buildSectionTree, renderSectionTree } from './sidebar-nav';
import {
  ensureTrailingSlash,
  getDefaultLocaleKeys,
  getLocaleMeta,
  getRoutableLocaleKeys,
  getSiteTitle,
  getTranslationEntries,
  isLocale,
} from './utils';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => {
  return getRoutableLocaleKeys().map((locale) => ({ params: { locale } }));
};

/**
 * Per-locale index, so that a consumer reading `/<locale>/…` can construct the
 * entry point for that language and descend through the same tiers the default
 * locale offers.
 *
 * The default locale's documents live at the site root, so its index links
 * those rather than duplicating them under a locale prefix.
 */
export const GET: APIRoute = async (context) => {
  const locale = context.params.locale as string;
  const site = new URL(ensureTrailingSlash(starlightLllmsTxtContext.base), context.site);
  const documentBase = getDefaultLocaleKeys().includes(locale) ? site : new URL(`./${locale}/`, site);

  let sectionsBlock: string | undefined;
  if (starlightLllmsTxtContext.sidebarNav) {
    const docs = await getCollection('docs', (doc) => isLocale(doc, locale) && !doc.data.draft);
    const tree = buildSectionTree(docs, starlightLllmsTxtContext.promote, starlightLllmsTxtContext.demote, [locale]);
    // Tier paths carry the locale in their first segment, so section links are
    // resolved against the site root rather than the locale prefix.
    sectionsBlock = renderSectionTree(tree, site) || undefined;
  }

  const federatedBlock =
    renderFederatedSites(starlightLllmsTxtContext.federatedSites, starlightLllmsTxtContext.federatedSiteCategories) ||
    undefined;

  const body = renderLlmsIndex({
    title: getSiteTitle(),
    description: starlightLllmsTxtContext.description,
    details: starlightLllmsTxtContext.details,
    smallUrl: new URL('./llms-small.txt', documentBase).href,
    fullUrl: new URL('./llms-full.txt', documentBase).href,
    setLabel: getLocaleMeta(locale).lang,
    sectionsBlock,
    federatedBlock,
    translations: buildTranslationLinks(getTranslationEntries(), site, [locale]),
    optionalLinks: starlightLllmsTxtContext.optionalLinks,
  });

  return new Response(body);
};
