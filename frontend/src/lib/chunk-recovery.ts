/** Recover an open tab whose lazy asset was replaced by a newer deployment. */
export function recoverStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (!/dynamically imported module|module script|Loading chunk|Importing a module script failed/i.test(message) || !navigator.onLine) return false;
  try {
    const key = "creo_chunk_recovery";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
    return true;
  } catch { return false; }
}
