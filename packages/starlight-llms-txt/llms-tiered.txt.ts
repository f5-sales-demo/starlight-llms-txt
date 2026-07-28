import { type CollectionEntry, getCollection } from 'astro:content';
import { starlightLllmsTxtContext } from 'virtual:starlight-llms-txt/context';
import type { APIRoute, GetStaticPaths, InferGetStaticParamsType, InferGetStaticPropsType } from 'astro';
import { entryToSimpleMarkdown } from './entryToSimpleMarkdown';
import { buildTierTree, type DirectoryNode, getAllTierPaths, type LeafNode } from './tier-tree';
import { renderDirectoryIndex, renderLeafContent } from './tier-tree-render';

export const prerender = true;

let cachedTree: DirectoryNode | undefined;

async function getTree(): Promise<DirectoryNode> {
  if (cachedTree) return cachedTree;
  // Every locale, not just the default: document ids carry the locale in their
  // first path segment, so the top tier of the tree becomes a language
  // selector and each language gets the full depth of tiers below it.
  const docs = await getCollection('docs', (doc) => !doc.data.draft);
  cachedTree = buildTierTree(docs, {
    promote: starlightLllmsTxtContext.promote,
    demote: starlightLllmsTxtContext.demote,
  });
  return cachedTree;
}

function findNode(root: DirectoryNode, pathSegments: string[]): DirectoryNode | LeafNode | undefined {
  let current: DirectoryNode = root;
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i] ?? '';
    const child = current.children.get(seg);
    if (!child) return undefined;
    if (i === pathSegments.length - 1) return child;
    if (child.type !== 'directory') return undefined;
    current = child;
  }
  return current;
}

export const getStaticPaths = (async () => {
  const tree = await getTree();
  const tierPaths = getAllTierPaths(tree);
  return tierPaths.map((tp) => ({
    params: { path: tp.path },
    props: { tierType: tp.type },
  }));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export const GET: APIRoute<Props, Params> = async (context) => {
  const tree = await getTree();
  const pathStr = context.params.path;
  const segments = pathStr.split('/');
  const node = findNode(tree, segments);

  if (!node) {
    return new Response('Not found', { status: 404 });
  }

  const site = new URL(
    starlightLllmsTxtContext.base.endsWith('/') ? starlightLllmsTxtContext.base : `${starlightLllmsTxtContext.base}/`,
    context.site,
  );

  if (node.type === 'directory') {
    return new Response(renderDirectoryIndex(node, site));
  }

  const renderedContent = await entryToSimpleMarkdown(node.entry as unknown as CollectionEntry<'docs'>, context, false);
  return new Response(renderLeafContent(node, renderedContent));
};
