import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function parseVersion(tag) {
  const match = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.exec(tag);
  return match ? match.slice(1).map(BigInt) : null;
}

export function newestVersionForMajor(current, tags) {
  const version = parseVersion(current);
  if (!version) throw new Error('Expected a stable version tag such as v1.2.3.');
  return tags.filter((tag) => parseVersion(tag)?.[0] === version[0]).reduce((newest, tag) => {
    const a = parseVersion(newest);
    const b = parseVersion(tag);
    for (let i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return a[i] > b[i] ? newest : tag;
    }
    return newest;
  }, current);
}

export function updateMajorTag(version, git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()) {
  const parsed = parseVersion(version);
  if (!parsed) throw new Error('Expected a stable version tag such as v1.2.3.');
  git('fetch', 'origin', '+refs/tags/*:refs/tags/*');
  const latest = newestVersionForMajor(version, git('tag', '--list', 'v*').split('\n'));
  if (latest !== version) return { updated: false, reason: `Newer tag ${latest} exists.` };
  const major = `v${parsed[0]}`;
  const remote = git('ls-remote', '--refs', 'origin', `refs/tags/${major}`);
  const previous = remote ? remote.split(/\s+/)[0] : '';
  const commit = git('rev-parse', `${version}^{commit}`);
  // A concurrent update fails the lease instead of overwriting another release.
  git('push', `--force-with-lease=refs/tags/${major}:${previous}`, 'origin', `${commit}:refs/tags/${major}`);
  return { updated: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = updateMajorTag(process.argv[2]);
  console.log(result.updated ? 'Major version tag updated.' : result.reason);
}
