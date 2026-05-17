export const PROJECT_INDEX_KEY = "graphlab:index";
export const MIGRATION_SENTINEL_KEY = "graphlab:migrated";
export const LEGACY_STORAGE_KEY = "graphlab-storage";
export const PROJECT_INDEX_VERSION = 1;

export function projectPayloadKey(id: string): string {
  return `graphlab:project:${id}`;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
