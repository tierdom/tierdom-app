import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { APP_VERSION } from './app-version';

describe('APP_VERSION', () => {
  it('matches the version in package.json', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('is a non-empty semver-shaped string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
