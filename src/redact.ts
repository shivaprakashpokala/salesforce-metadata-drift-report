const REDACTED = '[REDACTED_AUTH_URL]';

const AUTH_URL_PATTERNS = [
  /force:\/\/[^\s'"]+/gi,
  /00D[a-zA-Z0-9]{12,18}![^\s'"]+/g,
];

/**
 * Values to register with the runner's log masking: the whole auth URL plus
 * its client secret and refresh token (force://clientId:secret:token@host),
 * in case a tool ever prints a part on its own.
 */
export function authUrlSecretParts(authUrl: string): string[] {
  const parts = [authUrl];
  const match = /^force:\/\/([^:@]*):([^:@]*):([^@]+)@/.exec(authUrl.trim());
  if (match) {
    for (const part of [match[2], match[3]]) {
      if (part.length >= 8) parts.push(part);
    }
  }
  return parts;
}

export function redactAuthUrls(text: string, secrets: string[] = []): string {
  let result = text;
  for (const secret of secrets) {
    if (secret) result = result.replaceAll(secret, REDACTED);
  }
  for (const pattern of AUTH_URL_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

/** Never echoes command arguments, which can include the path to the auth file. */
export function formatCommandError(command: string, exitCode: number, secrets: string[] = [], detail = ''): string {
  const trimmed = detail.replace(/\s+/g, ' ').trim().slice(0, 500);
  const message = trimmed
    ? `Command failed (exit ${exitCode}): ${command}: ${trimmed}`
    : `Command failed (exit ${exitCode}): ${command}`;
  return redactAuthUrls(message, secrets);
}
