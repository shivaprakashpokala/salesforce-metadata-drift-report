export function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
