import { DefaultArtifactClient } from '@actions/artifact';

export interface ArtifactUploadOptions {
  retentionDays?: number;
}

export interface ArtifactUploadResponse {
  id?: number;
  size?: number;
}

export interface ArtifactUploader {
  upload(
    name: string,
    files: string[],
    rootDirectory: string,
    options?: ArtifactUploadOptions,
  ): Promise<ArtifactUploadResponse>;
}

export function createDefaultArtifactUploader(): ArtifactUploader {
  const client = new DefaultArtifactClient();
  return {
    async upload(name, files, rootDirectory, options = {}) {
      const response = await client.uploadArtifact(name, files, rootDirectory, {
        retentionDays: options.retentionDays,
      });
      return { id: response.id, size: response.size };
    },
  };
}

/** The artifact service is only reachable with the runtime token GitHub injects into real runs. */
export function isArtifactServiceAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.ACTIONS_RUNTIME_TOKEN && env.ACTIONS_RESULTS_URL);
}

export interface PublishArtifactOptions {
  name: string;
  files: string[];
  rootDirectory: string;
  retentionDays?: number;
}

export interface PublishArtifactDeps {
  uploader?: ArtifactUploader;
  env?: NodeJS.ProcessEnv;
}

export type PublishArtifactResult =
  | { uploaded: true; id?: number; size?: number }
  | { uploaded: false; reason: string };

export async function publishReportArtifact(
  options: PublishArtifactOptions,
  deps: PublishArtifactDeps = {},
): Promise<PublishArtifactResult> {
  const env = deps.env ?? process.env;
  if (!isArtifactServiceAvailable(env)) {
    return {
      uploaded: false,
      reason:
        'not running on GitHub Actions (ACTIONS_RUNTIME_TOKEN / ACTIONS_RESULTS_URL missing); ' +
        'report files were written to disk but no artifact was uploaded',
    };
  }

  const uploader = deps.uploader ?? createDefaultArtifactUploader();
  const response = await uploader.upload(options.name, options.files, options.rootDirectory, {
    retentionDays: options.retentionDays,
  });
  return { uploaded: true, id: response.id, size: response.size };
}
