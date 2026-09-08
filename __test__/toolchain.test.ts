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
import { readFileSync, statSync } from 'node:fs';
import semver from 'semver';
import { parse as parseYaml } from 'yaml';

const root = new URL('..', import.meta.url);

const readText = (relativePath: string) => readFileSync(new URL(relativePath, root), 'utf8');
const readJson = (relativePath: string) => JSON.parse(readText(relativePath));

const packageJson = readJson('package.json');

/**
 * Parsed rather than pattern-matched: these assertions are about what Dependabot
 * reads, so quoting, key order, block vs. flow sequences and comments are all
 * formatting noise that must not decide whether the guard passes.
 */
const dependabotConfig = parseYaml(readText('.github/dependabot.yml'));

const npmUpdates = dependabotConfig.updates.find(
  (update: { 'package-ecosystem': string }) => update['package-ecosystem'] === 'npm'
);

/**
 * The packages that must move together: vitest and every vitest plugin this
 * package installs. Derived from package.json so a plugin added later is
 * covered without touching this file.
 */
const vitestPackages: string[] = Object.keys(packageJson.devDependencies)
  .filter((dependency) => dependency === 'vitest' || dependency.startsWith('@vitest/'))
  .sort();

/**
 * Dependabot's own matcher, ported from `WildcardMatcher.match?`:
 * https://github.com/dependabot/dependabot-core/blob/main/common/lib/wildcard_matcher.rb
 *
 *   regex_string = "a#{wildcard_string.downcase}a".split("*")
 *                    .map { |p| Regexp.quote(p) }.join(".*").gsub(/^a|a$/, "")
 *   /^#{regex_string}$/.match?(candidate_string.downcase)
 *
 * That one function backs both a group's `patterns` (DependencyGroup#matches_pattern?)
 * and `ignore.dependency-name` (UpdateConfig.wildcard_match?, the identical
 * algorithm), so it covers both assertions below.
 *
 * Worth being exact about rather than reaching for a glob library: `*` becomes a
 * plain `.*`, which is not path-aware, so it spans the `/` in a scoped package
 * name. minimatch stops `*` at `/`, which would make `@vitest*` look like it
 * misses `@vitest/coverage-v8` when Dependabot says it hits.
 *
 * (Ruby's leading and trailing "a" only guard against String#split dropping
 * trailing empty fields; JavaScript's split keeps them, so it is not needed.)
 */
const matchesPattern = (pattern: string, dependency: string) =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`,
    'i'
  ).test(dependency);

/** Whether any Dependabot `patterns` / `dependency-name` entry selects `dependency`. */
const selects = (patterns: string[] | undefined, dependency: string) =>
  (patterns ?? []).some((pattern) => matchesPattern(pattern, dependency));

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
  it('selects dependencies the way Dependabot does', () => {
    // Both config assertions below are only as good as the matcher above, and
    // its one surprising property is that `*` is not path-aware. Swapping it
    // for string equality or for a path-aware glob would silently change what
    // they accept, so the behaviour is pinned here.
    expect(selects(['vitest'], 'vitest')).toBe(true);
    expect(selects(['VITEST'], 'vitest')).toBe(true);
    expect(selects(['@vitest/*'], '@vitest/coverage-v8')).toBe(true);
    expect(selects(['@vitest*'], '@vitest/coverage-v8')).toBe(true);
    expect(selects(['@vitest/*'], 'vitest')).toBe(false);
    expect(selects(['vitest'], '@vitest/coverage-v8')).toBe(false);
    expect(selects(['vitest'], 'vitest-mock-extended')).toBe(false);
    expect(selects([], 'vitest')).toBe(false);
  });

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
    const groups: [string, { patterns?: string[]; 'update-types'?: string[] }][] = Object.entries(
      npmUpdates?.groups ?? {}
    );

    const grouped = groups
      .map(([name, group]) => ({
        name,
        group,
        covers: vitestPackages.filter((dependency) => selects(group.patterns, dependency)),
      }))
      .find(({ covers }) => covers.length === vitestPackages.length);

    expect(
      grouped?.covers ?? [],
      'No group in .github/dependabot.yml covers vitest and its plugins together. ' +
        '@vitest/coverage-v8 pins an exact peer dependency on vitest, so without one group ' +
        'Dependabot splits them into PRs that cannot install (this was #142 and #143).'
    ).toEqual(vitestPackages);

    // Omitting update-types groups every update type, which is what we need.
    expect(
      grouped?.group['update-types'] ?? ['major', 'minor', 'patch'],
      `The "${grouped?.name}" group excludes major updates, so the day the hold below is ` +
        'lifted Dependabot would raise vitest and @vitest/* as separate majors again - ' +
        'exactly the pair of uninstallable PRs the group exists to prevent.'
    ).toContain('major');
  });

  it('holds vitest and @vitest/* majors back for exactly as long as the Node floor requires it', () => {
    // Both entries are load-bearing, and each fails differently on its own:
    // ignoring only "vitest" still lets Dependabot raise @vitest/coverage-v8 5
    // by itself, which is #142 all over again, and ignoring only "@vitest/*"
    // leaves the vitest 5 half of #143 free to come back. So this asserts on
    // the packages actually covered, not on how the entries are written.
    const majorHolds: string[] = (npmUpdates?.ignore ?? [])
      .filter((entry: { 'update-types'?: string[] }) =>
        (entry['update-types'] ?? []).includes('version-update:semver-major')
      )
      .map((entry: { 'dependency-name': string }) => entry['dependency-name']);

    const held = vitestPackages.filter((dependency) => selects(majorHolds, dependency));

    const expected = supportedNodeLine === '20.x' ? vitestPackages : [];

    expect(
      held,
      supportedNodeLine === '20.x'
        ? '.github/dependabot.yml must ignore major updates for every vitest package while ' +
            'engines.node still allows Node 20. vitest 5 dropped Node 20, so a major bump ' +
            'would look green and silently break the support this package advertises - and ' +
            'because the packages pin each other exactly, holding back only some of them ' +
            'brings back the PRs that cannot install (#142 and #143).'
        : `engines.node no longer allows Node 20, so the reason for ignoring major vitest updates ` +
            `is gone. Drop the vitest ignore block from .github/dependabot.yml so the ${supportedNodeLine} ` +
            `toolchain can move forward.`
    ).toEqual(expected);
  });
});

/**
 * The build matrices, as GitHub Actions reads them. Parsed for the same reason
 * the Dependabot config above is: these assertions are about what Actions does,
 * not about how the YAML happens to be written.
 */
type BuildSetting = { target?: string; build?: string };
type Job = {
  needs?: string | string[];
  strategy?: { matrix?: { settings?: BuildSetting[] } };
};

const workflows: [string, { jobs: Record<string, Job> }][] = [
  ['ci.yml', parseYaml(readText('.github/workflows/ci.yml'))],
  ['release.yml', parseYaml(readText('.github/workflows/release.yml'))],
];

const settingsOf = (job: Job | undefined): BuildSetting[] => job?.strategy?.matrix?.settings ?? [];

const targetsOf = (job: Job | undefined): string[] =>
  settingsOf(job)
    .map((setting) => setting.target)
    .filter((target): target is string => typeof target === 'string');

describe('ci workflow', () => {
  /**
   * ci.yml builds the targets the tests consume in `build` and everything else
   * in `build-extra`, so the tests do not wait on cross-compiled platforms that
   * nothing downstream reads. That split is only safe while every tested target
   * is still produced by a job test-binding actually waits for - otherwise the
   * download step looks for an artifact no job in the graph uploads, and the
   * required "Test bindings on x86_64-unknown-linux-gnu - node@20" check fails
   * on a workflow edit rather than on a code change.
   */
  it('builds every target the bindings are tested on before testing them', () => {
    const { jobs } = workflows.find(([name]) => name === 'ci.yml')![1];
    const testJob = jobs['test-binding'];

    const upstream = [testJob.needs ?? []].flat();
    const built = new Set(upstream.flatMap((job) => targetsOf(jobs[job])));

    expect(
      targetsOf(testJob).filter((target) => !built.has(target)),
      `test-binding downloads a bindings-<target> artifact for each of its targets, but these ` +
        `are not built by any job it needs (${upstream.join(', ') || 'none'}). Either add the ` +
        `target to a job in "needs", or stop testing it.`
    ).toEqual([]);
  });

  /**
   * cargo-zigbuild is pinned, and both workflows cross-compile with it, so the
   * version has to come from one place. Inlining `cargo install cargo-zigbuild
   * --version X` in each matrix entry - which is what this replaced - let ci.yml
   * and release.yml drift, and a release built with a different cross-compiler
   * than CI proved is exactly the kind of difference that shows up only in the
   * published artifact.
   */
  it('installs the pinned cargo-zigbuild from a single script', () => {
    for (const [name, workflow] of workflows) {
      const crossCompiled = Object.values(workflow.jobs)
        .flatMap(settingsOf)
        .map((setting) => setting.build ?? '')
        .filter((build) => build.includes('--cross-compile'));

      expect(crossCompiled.length, `${name} no longer cross-compiles anything`).toBeGreaterThan(0);

      for (const build of crossCompiled) {
        expect(
          build,
          `A cross-compiled target in ${name} does not run scripts/install-cargo-zigbuild.sh, ` +
            `so its cargo-zigbuild version is not the pinned one.`
        ).toContain('scripts/install-cargo-zigbuild.sh');

        expect(
          build,
          `A cross-compiled target in ${name} pins cargo-zigbuild inline. The version belongs ` +
            `in scripts/install-cargo-zigbuild.sh so ci.yml and release.yml cannot disagree.`
        ).not.toContain('cargo install cargo-zigbuild');
      }
    }
  });

  /** The workflows invoke the installer as `./scripts/...`, which needs the bit set in git. */
  it('ships the cargo-zigbuild installer as an executable', () => {
    const { mode } = statSync(new URL('scripts/install-cargo-zigbuild.sh', root));

    expect(
      (mode & 0o111) !== 0,
      'scripts/install-cargo-zigbuild.sh is not executable, but the build commands run it ' +
        'directly as ./scripts/install-cargo-zigbuild.sh.'
    ).toBe(true);
  });
});
