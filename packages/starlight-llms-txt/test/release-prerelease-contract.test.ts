import { fileURLToPath } from 'node:url';

import getReleasePlan from '@changesets/get-release-plan';
import { describe, expect, test } from 'vitest';

const packageName = '@f5-sales-demo/starlight-llms-txt';
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Changesets RC release contract', () => {
  test('plans the immutable 2.0.0-rc.0 package in rc prerelease mode', async () => {
    const releasePlan = await getReleasePlan(repositoryRoot);

    expect(releasePlan.preState).toMatchObject({ mode: 'pre', tag: 'rc' });
    expect(releasePlan.releases).toContainEqual(
      expect.objectContaining({
        name: packageName,
        newVersion: '2.0.0-rc.0',
        type: 'major',
      }),
    );
  });
});
