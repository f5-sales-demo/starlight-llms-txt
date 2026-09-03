import { describe, expect, test } from 'vitest';

import { validatePrereleaseState } from '../../../scripts/validate-prerelease-publish.mjs';

const validState = {
  expectedVersion: '2.0.0-rc.0',
  packageJson: {
    name: '@f5-sales-demo/starlight-llms-txt',
    version: '2.0.0-rc.0',
  },
  preState: {
    mode: 'pre',
    tag: 'rc',
  },
};

describe('prerelease publication validation', () => {
  test('accepts an exact matching prerelease', () => {
    expect(validatePrereleaseState(validState)).toEqual({
      name: '@f5-sales-demo/starlight-llms-txt',
      tag: 'rc',
      version: '2.0.0-rc.0',
    });
  });

  test('rejects a stable expected version', () => {
    expect(() =>
      validatePrereleaseState({
        ...validState,
        expectedVersion: '2.0.0',
      }),
    ).toThrow('Expected version must be an exact prerelease');
  });

  test('rejects a package version mismatch', () => {
    expect(() =>
      validatePrereleaseState({
        ...validState,
        packageJson: { ...validState.packageJson, version: '2.0.0-rc.1' },
      }),
    ).toThrow('Package version does not match expected version');
  });

  test('rejects a prerelease tag mismatch', () => {
    expect(() =>
      validatePrereleaseState({
        ...validState,
        preState: { ...validState.preState, tag: 'beta' },
      }),
    ).toThrow('Prerelease tag does not match expected version');
  });

  test('rejects a non-prerelease Changesets mode', () => {
    expect(() =>
      validatePrereleaseState({
        ...validState,
        preState: { ...validState.preState, mode: 'exit' },
      }),
    ).toThrow('Changesets is not in prerelease mode');
  });

  test('rejects a different package', () => {
    expect(() =>
      validatePrereleaseState({
        ...validState,
        packageJson: { ...validState.packageJson, name: '@example/other-package' },
      }),
    ).toThrow('Unexpected package name');
  });
});
