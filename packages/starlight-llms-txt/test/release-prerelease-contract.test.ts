import { fileURLToPath } from 'node:url';

import getReleasePlan from '@changesets/get-release-plan';
import { describe, expect, test } from 'vitest';

const packageName = '@f5-sales-demo/starlight-llms-txt';
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Changesets stable release contract', () => {
  test('plans exactly stable 2.0.0 after exiting RC prerelease mode', async () => {
    const releasePlan = await getReleasePlan(repositoryRoot);

    expect(releasePlan.preState).toMatchObject({ mode: 'exit', tag: 'rc' });
    expect(releasePlan.releases).toContainEqual(
      expect.objectContaining({
        name: packageName,
        newVersion: '2.0.0',
        type: 'major',
      }),
    );
    const stableRelease = releasePlan.releases.find((release) => release.name === packageName);
    expect(stableRelease?.newVersion).toMatch(/^2\.\d+\.\d+$/);
  });
});
