import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

/**
 * MV3 manifest. StyleSpy runs on all sites (the user can still scope it down
 * via Chrome's per-site access controls). The side panel is the primary UI;
 * the content script is the inspection engine injected into the top frame.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'StyleSpy — CSS & State Inspector',
  version: pkg.version,
  description:
    'Inspect CSS of static, hidden and dynamic elements. Freeze hover/focus states, reveal ghost DOM, track mutations.',
  minimum_chrome_version: '114',
  permissions: ['activeTab', 'storage', 'tabs', 'sidePanel'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      // Top frame only. Injecting into every sub-frame multiplied the runtime
      // footprint on ad/tracker-heavy pages, and a page-wide capture from N
      // frames raced (each frame's `capture-result` overwrote the last). It
      // was also misleading: a selector/XPath built inside an iframe's document
      // does not resolve when applied at the top level, so a merged cross-frame
      // locator list would hand QA broken locators — the opposite of the goal.
      all_frames: false,
    },
  ],
  action: {
    default_title: 'Open StyleSpy',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  // No global `side_panel.default_path`: the panel is enabled per-tab in the
  // service worker so it appears only on the tab where it was opened, not
  // window-wide across every tab.
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  commands: {
    'freeze-states': {
      suggested_key: { default: 'Ctrl+Shift+F', mac: 'Command+Shift+F' },
      description: 'Freeze current hover / focus / active states on the page',
    },
    'toggle-picker': {
      suggested_key: { default: 'Ctrl+Shift+E', mac: 'Command+Shift+E' },
      description: 'Toggle the element picker',
    },
  },
});
