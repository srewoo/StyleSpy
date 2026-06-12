/** Clipboard + file-download helpers shared by the panel and table views. */

/** Copy text to the clipboard; resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Trigger a browser download of in-memory text. */
export function downloadText(
  filename: string,
  text: string,
  mime = 'text/plain',
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Key used to hand a capture from the side panel to the full-table tab. */
export const CAPTURE_STORAGE_KEY = 'stylespy:capture';
/** Key for the panel's own persisted capture (survives panel close). */
export const PANEL_STORAGE_KEY = 'stylespy:panel';
/** Key for the persisted theme preference. */
export const THEME_KEY = 'stylespy:theme';

export type Theme = 'light' | 'dark';

/** Read the saved theme (defaults to light). */
export async function loadTheme(): Promise<Theme> {
  const data = await chrome.storage.local.get(THEME_KEY);
  return data[THEME_KEY] === 'dark' ? 'dark' : 'light';
}

/** Persist the theme preference. */
export async function saveTheme(theme: Theme): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: theme });
}
