import { describe, it, expect, vi } from 'vitest';
import { newestVersionForMajor, updateMajorTag } from '../scripts/update-major-tag.mjs';

describe('release major tag', () => {
  it('compares numeric semver and ignores other majors and prereleases', () => {
    expect(newestVersionForMajor('v1.2.9',['v1.2.10','v2.0.0','v1.3.0-beta.1'])).toBe('v1.2.10');
    expect(() => newestVersionForMajor('v1x2x3',[])).toThrow();
  });
  it('does not move a major tag backwards for maintenance releases', () => {
    const git=vi.fn((...args:string[]) => args[0]==='tag' ? 'v1.4.0\nv1.3.1' : '');
    expect(updateMajorTag('v1.3.1',git).updated).toBe(false);
    expect(git.mock.calls.some(args=>args[0]==='push')).toBe(false);
  });
  it('uses a lease against the remote tag instead of a blind force push', () => {
    const git=vi.fn((...args:string[]) => {
      if(args[0]==='tag') return 'v1.4.0';
      if(args[0]==='ls-remote') return 'oldsha\trefs/tags/v1';
      if(args[0]==='rev-parse') return 'newsha';
      return '';
    });
    expect(updateMajorTag('v1.4.0',git).updated).toBe(true);
    expect(git).toHaveBeenCalledWith('push','--force-with-lease=refs/tags/v1:oldsha','origin','newsha:refs/tags/v1');
  });
});
