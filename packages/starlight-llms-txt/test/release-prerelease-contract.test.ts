import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import getReleasePlan from '@changesets/get-release-plan';
import { describe, expect, test } from 'vitest';

const packageName = '@f5-sales-demo/starlight-llms-txt';
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Changesets stable release contract', () => {
  test('plans exactly stable 2.0.0 after exiting RC prerelease mode', async () => {
    const releasePlan = await getReleasePlan(repositoryRoot);

    if (releasePlan.preState) {
      expect(releasePlan.preState).toMatchObject({ mode: 'exit', tag: 'rc' });
      expect(releasePlan.releases).toContainEqual(
        expect.objectContaining({
          name: packageName,
          newVersion: '2.0.0',
          type: 'major',
        }),
      );
      return;
    }

    const packageJson = JSON.parse(
      await readFile(join(repositoryRoot, 'packages/starlight-llms-txt/package.json'), 'utf8'),
    ) as { name: string; version: string };
    expect(packageJson.name).toBe(packageName);
    expect(packageJson.version).toMatch(/^2\.\d+\.\d+$/);
    expect(packageJson.version).toBe('2.0.0');
  });
});
