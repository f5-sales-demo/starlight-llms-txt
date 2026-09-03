import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const packageName = '@f5-sales-demo/starlight-llms-txt';
const repositoryRoot = new URL('../../../', import.meta.url);

describe('Changesets RC release contract', () => {
  test('plans the immutable 2.0.0-rc.0 package in rc prerelease mode', async () => {
    const preState = JSON.parse(
      await readFile(new URL('../../../.changeset/pre.json', import.meta.url), 'utf8'),
    );

    expect(preState.mode).toBe('pre');
    expect(preState.tag).toBe('rc');

    const outputDirectory = await mkdtemp(join(tmpdir(), 'starlight-llms-txt-release-contract-'));
    const outputPath = join(outputDirectory, 'changeset-status.json');
    const changesetBinary = new URL('../../../node_modules/.bin/changeset', import.meta.url).pathname;

    try {
      await execFileAsync(changesetBinary, ['status', '--output', outputPath], {
        cwd: repositoryRoot.pathname,
      });

      const status = JSON.parse(await readFile(outputPath, 'utf8'));
      expect(status.releases).toContainEqual(
        expect.objectContaining({
          name: packageName,
          newVersion: '2.0.0-rc.0',
          type: 'major',
        }),
      );
    } finally {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });
});
