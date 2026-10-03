import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import getReleasePlan from '@changesets/get-release-plan';
import { describe, expect, test } from 'vitest';

const packageName = '@f5-sales-demo/starlight-llms-txt';
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Changesets stable release contract', () => {
  test('plans a stable release and verifies generated stable packages', async () => {
    const releasePlan = await getReleasePlan(repositoryRoot);

    if (releasePlan.preState) {
      expect(releasePlan.preState).toMatchObject({ mode: 'exit', tag: 'rc' });
      expect(releasePlan.releases).toContainEqual(
        expect.objectContaining({
          name: packageName,
          newVersion: '2.1.0',
          type: 'minor',
        }),
      );
      return;
    }

    const packageJson = JSON.parse(
      await readFile(join(repositoryRoot, 'packages/starlight-llms-txt/package.json'), 'utf8'),
    ) as { name: string; version: string };
    expect(packageJson.name).toBe(packageName);
    expect(packageJson.version).toMatch(/^2\.\d+\.\d+$/);
    expect(
      releasePlan.releases
        .filter((release) => release.name === packageName)
        .every((release) => /^2\.\d+\.\d+$/.test(release.newVersion)),
    ).toBe(true);
    expect(releasePlan.preState).toBeUndefined();
  });
});
