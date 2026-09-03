#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const expectedPackageName = '@f5-sales-demo/starlight-llms-txt';
const exactPrereleasePattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-([0-9A-Za-z-]+)\.(?:0|[1-9]\d*)$/;

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validatePrereleaseState({ expectedVersion, packageJson, preState }) {
  requireCondition(
    typeof expectedVersion === 'string' && exactPrereleasePattern.test(expectedVersion),
    'Expected version must be an exact prerelease',
  );

  const prereleaseTag = exactPrereleasePattern.exec(expectedVersion)[1];

  requireCondition(packageJson.name === expectedPackageName, 'Unexpected package name');
  requireCondition(packageJson.version === expectedVersion, 'Package version does not match expected version');
  requireCondition(preState.mode === 'pre', 'Changesets is not in prerelease mode');
  requireCondition(preState.tag === prereleaseTag, 'Prerelease tag does not match expected version');

  return {
    name: packageJson.name,
    tag: preState.tag,
    version: packageJson.version,
  };
}

async function main() {
  const expectedVersion = process.argv[2];
  const repositoryRoot = resolve(process.argv[3] ?? fileURLToPath(new URL('../', import.meta.url)));
  const packageJson = JSON.parse(
    await readFile(join(repositoryRoot, 'packages/starlight-llms-txt/package.json'), 'utf8'),
  );
  const preState = JSON.parse(await readFile(join(repositoryRoot, '.changeset/pre.json'), 'utf8'));
  const validated = validatePrereleaseState({ expectedVersion, packageJson, preState });

  process.stdout.write(`Validated ${validated.name}@${validated.version} in ${validated.tag} prerelease mode.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
