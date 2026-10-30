import { exec as actionsExec } from '@actions/exec';

export interface CliExecOptions {
  cwd?: string;
  silent?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface CliCaptureResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CliExecutor {
  exec(command: string, args: string[], options?: CliExecOptions): Promise<number>;
  captureOutput(command: string, args: string[], options?: CliExecOptions): Promise<CliCaptureResult>;
}

export function createDefaultCliExecutor(): CliExecutor {
  return {
    exec(command, args, options = {}) {
      return actionsExec(command, args, {
        cwd: options.cwd,
        env: options.env as Record<string, string> | undefined,
        silent: options.silent ?? true,
        ignoreReturnCode: true,
      });
    },
    async captureOutput(command, args, options = {}) {
      let stdout = '';
      let stderr = '';
      const exitCode = await actionsExec(command, args, {
        cwd: options.cwd,
        env: options.env as Record<string, string> | undefined,
        silent: options.silent ?? true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            stdout += data.toString();
          },
          stderr: (data: Buffer) => {
            stderr += data.toString();
          },
        },
      });
      return { exitCode, stdout, stderr };
    },
  };
}

/**
 * Run every command with its own home folder, so the sf CLI keeps this run's
 * logins there instead of in the user's ~/.sf and ~/.sfdx. Logging out by
 * username then cannot remove a login the user already had for the same user.
 */
export function withIsolatedHome(cli: CliExecutor, home: string, env: NodeJS.ProcessEnv = process.env): CliExecutor {
  const isolated = {
    ...env,
    HOME: home,
    USERPROFILE: home,
    // Keep the encryption key in the home folder, not the macOS or Linux keychain.
    SF_USE_GENERIC_UNIX_KEYCHAIN: 'true',
  };
  return {
    exec: (command, args, options = {}) => cli.exec(command, args, { ...options, env: isolated }),
    captureOutput: (command, args, options = {}) => cli.captureOutput(command, args, { ...options, env: isolated }),
  };
}
