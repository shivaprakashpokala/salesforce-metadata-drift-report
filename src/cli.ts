import { exec as actionsExec } from '@actions/exec';

export interface CliExecOptions {
  cwd?: string;
  silent?: boolean;
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
        silent: options.silent ?? true,
        ignoreReturnCode: true,
      });
    },
    async captureOutput(command, args, options = {}) {
      let stdout = '';
      let stderr = '';
      const exitCode = await actionsExec(command, args, {
        cwd: options.cwd,
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
