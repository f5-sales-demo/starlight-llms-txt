import { getCollection } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { APIRoute } from 'astro';
import { renderFederatedSites } from './federated-sites';
import { buildTranslationLinks, renderLlmsIndex } from './llms-index';
import { buildSectionTree, renderSectionTree } from './sidebar-nav';
import {
  ensureTrailingSlash,
  getDefaultLocaleKeys,
  getSiteTitle,
  getTranslationEntries,
  isDefaultLocale,
} from './utils';

export const prerender = true;

/**
 * The site-root index, covering the default locale. It also lists the
 * per-locale indexes, so every language is reachable from the entry point a
 * consumer already knows to ask for.
 */
export const GET: APIRoute = async (context) => {
  const site = new URL(ensureTrailingSlash(starlightLllmsTxtContext.base), context.site);

  let sectionsBlock: string | undefined;
  if (starlightLllmsTxtContext.sidebarNav) {
    const docs = await getCollection('docs', (doc) => isDefaultLocale(doc) && !doc.data.draft);
    const tree = buildSectionTree(
      docs,
      starlightLllmsTxtContext.promote,
      starlightLllmsTxtContext.demote,
      getDefaultLocaleKeys(),
    );
    sectionsBlock = renderSectionTree(tree, site) || undefined;
  }

  const federatedBlock =
    renderFederatedSites(starlightLllmsTxtContext.federatedSites, starlightLllmsTxtContext.federatedSiteCategories) ||
    undefined;

  const body = renderLlmsIndex({
    title: getSiteTitle(),
    description: starlightLllmsTxtContext.description,
    details: starlightLllmsTxtContext.details,
    smallUrl: new URL('./llms-small.txt', site).href,
    fullUrl: new URL('./llms-full.txt', site).href,
    sectionsBlock,
    federatedBlock,
    translations: buildTranslationLinks(getTranslationEntries(), site, getDefaultLocaleKeys()),
    optionalLinks: starlightLllmsTxtContext.optionalLinks,
  });

  return new Response(body);
};
