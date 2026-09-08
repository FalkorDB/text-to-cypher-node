/**
 * Guards the dev toolchain against updates this package cannot actually run.
 *
 * Dependabot proposed vitest 5 and @vitest/coverage-v8 5 as two separate PRs
 * (#142, #143). Neither could install: coverage-v8 declares an exact peer
 * dependency on vitest, so each PR left the other half on 4.1.11 and npm failed
 * with ERESOLVE on every platform in the matrix.
 *
 * Grouping the two - which .github/dependabot.yml now does - fixes the install,
 * but not the reason the bump is unwanted: vitest 5 requires Node
 * "^22.12.0 || ^24.0.0 || >=26.0.0", while this package advertises
 * engines.node ">= 20" and CI builds and tests on node@20. A grouped PR would
 * therefore be green-looking and still wrong.
 *
 * So the failure can come back two ways, and there is a test for each: a
 * dependency that outruns our Node floor, and a Dependabot config that stops
 * holding vitest back or stops keeping the two packages together.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import semver from 'semver';

const root = new URL('..', import.meta.url);

const readText = (relativePath: string) => readFileSync(new URL(relativePath, root), 'utf8');
const readJson = (relativePath: string) => JSON.parse(readText(relativePath));

const packageJson = readJson('package.json');
const dependabotConfig = readText('.github/dependabot.yml');

/**
 * The major release line of the oldest Node this package claims to support.
 *
 * A whole line rather than the exact floor, because `actions/setup-node` with
 * `node-version: 20` installs the newest 20.x. That is why a tool asking for
 * `^20.17.0` is fine while `>= 20` is advertised, and it keeps this test on the
 * failure that matters: a tool that has left the line behind entirely.
 */
const supportedNodeLine = `${semver.minVersion(packageJson.engines.node)!.major}.x`;

/** The Node range an installed package declares, or undefined if it declares none. */
const declaredNodeRange = (dependency: string): string | undefined => {
  try {
    return readJson(`node_modules/${dependency}/package.json`).engines?.node;
  } catch {
    // Not installed, or shipped without a readable manifest: nothing to assert.
    return undefined;
  }
};

describe('dev toolchain', () => {
  it('runs on the oldest Node line this package supports', () => {
    const tooNew = Object.keys(packageJson.devDependencies)
      .map((dependency) => ({ dependency, range: declaredNodeRange(dependency) }))
      .filter(({ range }) => range !== undefined && !semver.intersects(range, supportedNodeLine))
      .map(({ dependency, range }) => `${dependency} requires Node ${range}`);

    expect(
      tooNew,
      `These dev dependencies cannot run on Node ${supportedNodeLine}, which package.json ` +
        `advertises as engines.node ${JSON.stringify(packageJson.engines.node)} and which CI ` +
        `builds and tests on. Either hold the dependency back in .github/dependabot.yml, or ` +
        `raise engines.node and the CI matrix together.`
    ).toEqual([]);
  });

  it('keeps vitest and its plugins in one Dependabot group', () => {
    const patterns = /vitest:\s*\n\s*patterns:\s*\n((?:\s*-\s*"[^"]*"\s*\n)+)/.exec(
      dependabotConfig
    )?.[1];

    expect(
      patterns,
      '.github/dependabot.yml no longer defines a "vitest" group with a patterns list. ' +
        '@vitest/coverage-v8 pins an exact peer dependency on vitest, so without the group ' +
        'Dependabot splits the two into PRs that cannot install (this was #142 and #143).'
    ).toBeDefined();
    expect(patterns).toContain('"vitest"');
    expect(patterns).toContain('"@vitest/*"');
  });

  it('holds vitest majors back for exactly as long as the Node floor requires it', () => {
    const holdsVitestMajors =
      /-\s*dependency-name:\s*"vitest"\s*\n\s*update-types:[^\n]*version-update:semver-major/.test(
        dependabotConfig
      );

    expect(
      holdsVitestMajors,
      supportedNodeLine === '20.x'
        ? '.github/dependabot.yml stopped ignoring major vitest updates while engines.node still ' +
            'allows Node 20. vitest 5 dropped Node 20, so the next major bump would look green and ' +
            'silently break the support this package advertises.'
        : `engines.node no longer allows Node 20, so the reason for ignoring major vitest updates ` +
            `is gone. Drop the vitest ignore block from .github/dependabot.yml so the ${supportedNodeLine} ` +
            `toolchain can move forward.`
    ).toBe(supportedNodeLine === '20.x');
  });
});
