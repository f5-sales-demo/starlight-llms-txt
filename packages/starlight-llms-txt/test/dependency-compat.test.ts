import { execFileSync } from 'node:child_process';
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

describe('release versioning', () => {
  test('keeps one canonical committed workspace lockfile document', async () => {
    const rootManifest = await readPackage(new URL('../../../package.json', import.meta.url));
    const lockfile = execFileSync('git', ['show', 'HEAD:pnpm-lock.yaml'], {
      cwd: new URL('../../../', import.meta.url),
      encoding: 'utf8',
    });

    expect(rootManifest.scripts['ci-version']).toContain('--config.manage-package-manager-versions=false');
    expect(lockfile.startsWith('lockfileVersion:')).toBe(true);
    expect(lockfile.match(/^lockfileVersion:/gm)).toHaveLength(1);
  });
});
