import { buildTierTree, type DirectoryNode } from './tier-tree';

type DocLike = {
  id: string;
  data: {
    title: string;
    description?: string;
    draft?: boolean;
    sidebar?: { order?: number };
  };
};

export function buildSectionTree(
  docs: DocLike[],
  promote: string[] = [],
  demote: string[] = [],
  localePrefixes: string[] = [],
): DirectoryNode {
  return buildTierTree(docs, { promote, demote, localePrefixes });
}

export function renderSectionTree(tree: DirectoryNode, site: URL): string {
  if (tree.children.size === 0) return '';

  const lines: string[] = ['## Sections', ''];

  for (const [, child] of tree.children) {
    const descSuffix = child.meta.description ? `: ${child.meta.description}` : '';
    const url = new URL(`./_llms-txt/${child.slug}.txt`, site);
    lines.push(`- [${child.meta.title}](${url})${descSuffix}`);
  }

  return lines.join('\n');
}
