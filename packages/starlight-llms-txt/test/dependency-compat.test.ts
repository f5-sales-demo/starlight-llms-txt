import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

async function readPackage(url: URL) {
  return JSON.parse(await readFile(url, 'utf8'));
}

describe('Astro dependency compatibility', () => {
  test('uses one Astro 7-compatible MDX toolchain', async () => {
    const packageManifest = await readPackage(new URL('../package.json', import.meta.url));
    const docsManifest = await readPackage(new URL('../../../docs/package.json', import.meta.url));

    expect(packageManifest.dependencies['@astrojs/mdx']).toMatch(/^\^7\./);
    expect(packageManifest.devDependencies.astro).toMatch(/^\^7\./);
    expect(packageManifest.devDependencies['@astrojs/starlight']).toMatch(/^\^0\.41\./);
    expect(packageManifest.peerDependencies.astro).toMatch(/^\^7\./);
    expect(packageManifest.peerDependencies['@astrojs/starlight']).toMatch(/^\^0\.41\./);
    expect(packageManifest.engines.node).toBe('>=22.12.0');
    expect(docsManifest.dependencies.astro).toMatch(/^\^7\./);
    expect(docsManifest.dependencies['@astrojs/starlight']).toMatch(/^\^0\.41\./);
    expect(docsManifest.engines.node).toBe('>=22.12.0');
  });
});
