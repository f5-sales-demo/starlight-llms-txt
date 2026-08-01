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
  test('keeps one canonical workspace lockfile document', async () => {
    const rootManifest = await readPackage(new URL('../../../package.json', import.meta.url));
    const lockfile = await readFile(new URL('../../../pnpm-lock.yaml', import.meta.url), 'utf8');
    const ciWorkflow = await readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
    const releaseWorkflow = await readFile(new URL('../../../.github/workflows/release.yml', import.meta.url), 'utf8');
    const setupAction = 'pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271';

    expect(rootManifest.scripts['ci-version']).toContain('--config.manage-package-manager-versions=false');
    expect(rootManifest.packageManager).toBeUndefined();
    expect(rootManifest.engines.pnpm).toBe('>=11.3.0');
    expect(lockfile.startsWith('lockfileVersion:')).toBe(true);
    expect(lockfile.match(/^lockfileVersion:/gm)).toHaveLength(1);
    expect(ciWorkflow.match(new RegExp(setupAction, 'g'))).toHaveLength(2);
    expect(ciWorkflow.match(/version: 11\.3\.0/g)).toHaveLength(2);
    expect(releaseWorkflow.match(new RegExp(setupAction, 'g'))).toHaveLength(1);
    expect(releaseWorkflow.match(/version: 11\.3\.0/g)).toHaveLength(1);
  });
});
