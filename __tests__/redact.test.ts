import { describe, it, expect } from 'vitest';
import { authUrlSecretParts, redactAuthUrls, formatCommandError } from '../src/redact.js';

const SAMPLE_AUTH_URL = 'force://PlatformCLI::FAKE_TEST_TOKEN_NOT_REAL@na1.salesforce.com';

describe('redactAuthUrls', () => {
  it('redacts explicit secret values', () => {
    const text = `Login failed with ${SAMPLE_AUTH_URL}`;
    expect(redactAuthUrls(text, [SAMPLE_AUTH_URL])).toBe(
      'Login failed with [REDACTED_AUTH_URL]',
    );
  });

  it('redacts force:// URL patterns', () => {
    const text = `Error: force://user:token@instance.salesforce.com failed`;
    expect(redactAuthUrls(text)).toContain('[REDACTED_AUTH_URL]');
    expect(redactAuthUrls(text)).not.toContain('force://');
  });

  it('does not alter messages without secrets', () => {
    const text = 'Salesforce CLI (sf) is not available on the runner.';
    expect(redactAuthUrls(text)).toBe(text);
  });
});

describe('formatCommandError', () => {
  it('omits command arguments that may reference auth files', () => {
    const msg = formatCommandError('sf', 1, [SAMPLE_AUTH_URL]);
    expect(msg).toBe('Command failed (exit 1): sf');
    expect(msg).not.toContain(SAMPLE_AUTH_URL);
    expect(msg).not.toContain('--sfdx-url-file');
  });

  it('appends redacted stderr and truncates long diagnostics', () => {
    const stderr = `boom ${SAMPLE_AUTH_URL}\n${'x'.repeat(800)}`;
    const msg = formatCommandError('sf', 2, [SAMPLE_AUTH_URL], stderr);
    expect(msg).toContain('Command failed (exit 2): sf: boom');
    expect(msg).toContain('[REDACTED_AUTH_URL]');
    expect(msg).not.toContain(SAMPLE_AUTH_URL);
    expect(msg.length).toBeLessThan(600);
  });
});

describe('authUrlSecretParts', () => {
  it('masks the whole URL plus its client secret and refresh token', () => {
    expect(authUrlSecretParts('force://PlatformCLI:clientSecret123:refreshToken456@example.my.salesforce.com')).toEqual([
      'force://PlatformCLI:clientSecret123:refreshToken456@example.my.salesforce.com',
      'clientSecret123',
      'refreshToken456',
    ]);
  });

  it('skips empty or very short parts', () => {
    expect(authUrlSecretParts(SAMPLE_AUTH_URL)).toEqual([SAMPLE_AUTH_URL, 'FAKE_TEST_TOKEN_NOT_REAL']);
  });
});
