# swyx-browser-extension

A lightweight MV3 browser extension that adds a YouTube “Summarize” button next to Subscribe. Clicking it opens your Gemini gem prefilled with the current video URL for instant summaries and analysis.

It also keeps a few handy utilities:
- Detects Netlify-hosted sites and shows details in the popup.
- On GitHub repo pages, adds quick links to “Deploy to Netlify” and “View on DeepWiki”.

---

## Features

- YouTube
  - Injects a Summarize button next to the Subscribe button (falls back to the action row if the layout changes).
  - Opens your Gemini gem at `https://gemini.google.com/gem/da23325c2fca?vurl=<current-video-url>` in a new tab.
  - The content script running on gemini.google.com auto-fills the input (Quill editor) with the video URL and triggers proper input events.
- GitHub
  - Adds “💎 Deploy to Netlify” and “🧠 View on DeepWiki” buttons on repo pages.
- Netlify detection
  - The popup displays basic site info if the current page is hosted on Netlify.

Known limitation: Gemini cannot be embedded on YouTube (X-Frame-Options: DENY), so we open the gem in a new tab and auto-fill there.

---

## Install

### From source (developer mode)
1. Open Chrome and go to `chrome://extensions`.
2. Enable “Developer mode”.
3. Click “Load unpacked” and select this folder (`netlify-chrome-extension`).
4. Visit a YouTube video; you should see a “Summarize” button next to “Subscribe”.

### From the Chrome Web Store
If you maintain a listing:
- Go to the Developer Dashboard: https://chromewebstore.google.com/devconsole
- Upload a zipped package and submit for review.

Packaging command (macOS):
```bash
cd "/Users/shawnwang/Desktop/Work/netlify-chrome-extension"
zip -r swyx-browser-extension-1.5.0.zip . \
  -x "*.git*" "*node_modules/*" "*.DS_Store" "yarn-error.log"
```

---

## Permissions and matches

Minimal required permissions:
- `activeTab` – to interact with the current tab for popup/netlify detection.
- `storage` – to pass the YouTube URL to Gemini and remember small flags.

The content script currently matches all HTTPS/HTTP pages to preserve original Netlify/GitHub utilities. For a leaner publish, consider narrowing `content_scripts.matches` to:
- `https://*.youtube.com/*`
- `https://gemini.google.com/*`
- `https://github.com/*` (optional, only if you want the GitHub buttons)

---

## How it works

- Manifest V3 with a service worker (`background.js`).
- `content-script.js` runs on page load and:
  - YouTube: inserts a “Summarize” button next to Subscribe using a MutationObserver and `yt-navigate-finish` to handle SPA navigation. On click, opens the gem in a new tab with `vurl` set to the current video URL; also writes the URL to `chrome.storage.local` for redundancy.
  - Gemini: on `gemini.google.com/gem/da23325c2fca`, it finds the Quill editor (`rich-textarea .ql-editor.textarea`), focuses it, inserts the URL, and dispatches `input`/`change` events.
  - GitHub: adds “Deploy to Netlify” and “View on DeepWiki” buttons on repo pages.
  - Netlify detection: header sniffing (top frame only) reads response headers and updates the popup state via the background service worker.

Logging: look for `[YT-GEM]` messages in the console for integration diagnostics.

---

## Development

- Update `manifest.json` version before packaging.
- Load the unpacked extension via `chrome://extensions` for quick iteration.
- Useful files:
  - `content-script.js` – YouTube/Gemini/GitHub logic.
  - `background.js` – message handling and popup activation.
  - `popup.html`/`popup.js` – Netlify info UI.
  - `references/` – DOM snapshots for YouTube and Gemini for selector reference.

### Common tweaks
- Move the Summarize button: adjust `ensureSummarizeButton()` in `content-script.js`.
- Change the target Gemini gem: update the `GEM_URL` constant.
- Scope matches/permissions: edit `manifest.json` and reload.

---

## Publishing (Chrome Web Store)
1. Bump `version` in `manifest.json`.
2. Zip the folder with `manifest.json` at the zip root (see command above).
3. Upload the zip in the Developer Dashboard and complete listing details:
   - Title, descriptions, screenshots, 128×128 icon.
   - Privacy: this extension does not send data off-device; it uses `storage` only locally.
4. Submit for review. Expect hours to a couple of days.

---

## Troubleshooting
- The Summarize button is stacked vertically below Subscribe
  - YouTube’s layout wrappers change; the code walks up to the nearest flex row container. If alignment looks off, update the placement logic or fallback target (`#top-level-buttons-computed`).
- Gemini opens but the input isn’t filled
  - The gem might still be loading; the script retries for a few seconds. If it still fails, selectors may have changed—check the DOM and adjust the `rich-textarea` selector.
- I see “Uncaught (in promise)” from the polyfill
  - We now catch message errors and always respond to `setHost/getHost`. Reload the extension. If you still see errors, grab console logs with `[YT-GEM]`.

---

## License
MIT