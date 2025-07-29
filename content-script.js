// https://stackoverflow.com/questions/220231/accessing-the-web-pages-http-headers-in-javascript
// but using fetch cos sync xmlhttp is blocked
// but using webview cos fetch is blocked https://developer.chrome.com/extensions/manifest/sandbox
// nvm lol you can do async xmlhttp

// Use browser namespace from the polyfill
let webExtensionAPI = browser;

// let DEBUG = true
let DEBUG = false

// Only run header sniffing in the top frame to avoid noise when all_frames=true
if (window.top === window.self) {
  var req = new XMLHttpRequest()
  req.open("GET", document.location)
  req.send(null)
  req.onreadystatechange = function() {
    if (req.readyState === XMLHttpRequest.DONE) {
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
      // Get the raw header string
      var headers = req.getAllResponseHeaders()

      // Convert the header string into an array
      // of individual headers
      var arr = headers.trim().split(/[\r\n]+/)

      // Create a map of header names to values
      var headerMap = {}
      arr.forEach(function(line) {
        var parts = line.split(": ")
        var header = parts.shift()
        var value = parts.join(": ")
        headerMap[header] = value
      })

      // var header = req.getResponseHeader("server")
      // if (DEBUG) console.log({ header })
      webExtensionAPI.runtime.sendMessage({
  netlifyPage: headerMap
}).catch((e) => {
  try { console.warn('[YT-GEM] sendMessage netlifyPage error', e); } catch (_) {}
})
    }
  }
}

var { host, pathname } = document.location
// if (DEBUG) console.log({ location: document.location })
webExtensionAPI.runtime.sendMessage({ method: "setHost", url: host }).catch((e) => {
  try { console.warn('[YT-GEM] sendMessage setHost error', e); } catch (_) {}
})

var PHActions = document.getElementsByClassName("pagehead-actions")
if (host === "github.com" && typeof pathname === "string" && PHActions.length) {
  const pathsplit = pathname.split("/")
  if (pathsplit.length > 2) {
    var el = PHActions[0].children[0]
    const user = pathsplit[1]
    const repo = pathsplit[2]
    const netlifyUrl = `https://app.netlify.com/start/deploy?repository=https://github.com/${user}/${repo}`
    const deepWikiUrl = `https://deepwiki.com/${user}/${repo}`

    // Create Netlify button
    var netlifyContainer = document.createElement("li") 
    var netlifyBtn = document.createElement("a")
    netlifyBtn.setAttribute("class", "btn btn-sm")
    netlifyBtn.setAttribute("href", netlifyUrl)
    netlifyBtn.setAttribute("target", "_blank")
    var netlifyContent = document.createTextNode("💎 Deploy To Netlify")
    netlifyBtn.appendChild(netlifyContent)
    netlifyContainer.appendChild(netlifyBtn)

    // Create DeepWiki button
    var deepWikiContainer = document.createElement("li")
    var deepWikiBtn = document.createElement("a") 
    deepWikiBtn.setAttribute("class", "btn btn-sm")
    deepWikiBtn.setAttribute("href", deepWikiUrl)
    deepWikiBtn.setAttribute("target", "_blank")
    var deepWikiContent = document.createTextNode("🧠 View on DeepWiki")
    deepWikiBtn.appendChild(deepWikiContent)
    deepWikiContainer.appendChild(deepWikiBtn)

    // Insert both buttons
    el.parentNode.insertBefore(deepWikiContainer, el)
    el.parentNode.insertBefore(netlifyContainer, el)
  }
}

// =========================
// YouTube ↔ Gemini integration
// =========================
;(function YTGemIntegration() {
  const LOG_PREFIX = "[YT-GEM]";
  const GEM_URL = "https://gemini.google.com/gem/da23325c2fca";
  const STORE_KEY = "yt_gem_current_url";
  const EMBED_DENIED_KEY = "yt_gem_embed_denied";
  const isTop = window.top === window.self;
  const isYouTube = location.hostname.endsWith("youtube.com");
  const isGemini = location.hostname === "gemini.google.com";

  function log(...args) {
    try { console.log(LOG_PREFIX, ...args) } catch (_) {}
  }

  // Keep the current YouTube URL in storage and inject a bottom tab with an iframe.
  if (isTop && isYouTube) {
    try {
      startYouTubeUrlSync();
      ensureSummarizeButton();
    } catch (e) {
      log("Init error on YouTube:", e);
    }
  }

  // When running on Gemini, auto-fill the gem's input with the stored YouTube URL or vurl param
  if (isGemini) {
    try {
      bootGemAutoFill();
    } catch (e) {
      log("Init error on Gemini:", e);
    }
  }

  // -----------------
  // YouTube helpers
  // -----------------
  function getCurrentYouTubeUrl() {
    const canon = document.querySelector('link[rel="canonical"][href*="youtube.com"]');
    const href = canon?.href || location.href;
    return href;
  }

  function startYouTubeUrlSync() {
    log("Starting URL sync on YouTube");
    let last = "";
    const write = (url) => {
      if (!url || url === last) return;
      last = url;
      try {
        chrome.storage?.local?.set?.({ [STORE_KEY]: url });
      } catch (_) {}
      log("Stored video URL:", url);
    };

    write(getCurrentYouTubeUrl());

    window.addEventListener('yt-navigate-finish', () => write(getCurrentYouTubeUrl()));
    window.addEventListener('popstate', () => write(getCurrentYouTubeUrl()));

    let lastHref = location.href;
    setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        write(getCurrentYouTubeUrl());
      }
    }, 500);
  }

  function ensureSummarizeButton() {
    const BTN_ID = 'yt-gem-summarize-btn';

    function currentGemUrlWithParam() {
      const vurl = encodeURIComponent(getCurrentYouTubeUrl());
      const sep = GEM_URL.includes('?') ? '&' : '?';
      return `${GEM_URL}${sep}vurl=${vurl}`;
    }

    function createButton() {
      let existing = document.getElementById(BTN_ID);
      if (existing) return existing;
      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.innerHTML = `
        <span class="yt-gem-btn-contents" style="display:inline-flex;align-items:center;gap:6px;">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 3h7v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 3l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20 14v5a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Summarize</span>
        </span>
      `;
      btn.title = 'Summarize with Gemini';
      btn.setAttribute('aria-label', 'Summarize with Gemini');
      btn.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'height:36px',
        'padding:0 12px',
        'margin-left:8px',
        'border-radius:18px',
        'border:1px solid rgba(255,255,255,0.2)',
        'background:#272727',
        'color:#fff',
        'font-size:14px',
        'line-height:20px',
        'cursor:pointer',
        'vertical-align:middle'
      ].join(';');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = currentGemUrlWithParam();
        try { chrome.storage?.local?.set?.({ [STORE_KEY]: getCurrentYouTubeUrl() }); } catch (_) {}
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) {}
      });
      return btn;
    }

    function findFlexRowContainerNearSubscribe() {
      const sub = document.querySelector('ytd-subscribe-button-renderer');
      if (!sub) return null;
      let anchor = sub;
      let parent = anchor.parentElement;
      for (let i = 0; i < 6 && parent; i++) {
        const cs = getComputedStyle(parent);
        const isFlexRow = (cs.display.includes('flex') && (cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse'));
        if (isFlexRow) {
          return { container: parent, anchor };
        }
        anchor = parent;
        parent = parent.parentElement;
      }
      return null;
    }

    function tryPlaceNextToSubscribe() {
      const found = findFlexRowContainerNearSubscribe();
      if (!found) return false;
      const { container, anchor } = found;
      const btn = createButton();
      if (!btn) return false;
      if (btn.parentNode !== container) {
        container.insertBefore(btn, anchor.nextSibling);
      }
      return true;
    }

    function tryPlaceInActionsRow() {
      const actions = document.querySelector('ytd-menu-renderer #top-level-buttons-computed');
      if (actions) {
        const btn = createButton();
        if (!btn) return false;
        if (btn.parentNode !== actions) actions.appendChild(btn);
        return true;
      }
      return false;
    }

    function ensurePlaced() {
      const btn = document.getElementById(BTN_ID);
      if (btn && document.body.contains(btn)) return true;
      if (tryPlaceNextToSubscribe()) return true;
      if (tryPlaceInActionsRow()) return true;
      return false;
    }

    ensurePlaced();

    window.addEventListener('yt-navigate-finish', () => {
      const btn = document.getElementById(BTN_ID);
      if (btn && !document.body.contains(btn)) {
        try { btn.remove(); } catch (_) {}
      }
      ensurePlaced();
    });

    let rafScheduled = false;
    const observer = new MutationObserver(() => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        ensurePlaced();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function ensureBottomPanel() {
    if (document.getElementById('yt-gem-panel')) {
      log('Panel already exists');
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
    #yt-gem-panel { position: fixed; left: 0; right: 0; bottom: 0; height: 40px; z-index: 2147483646; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #fff; pointer-events: auto; }
    #yt-gem-panel.yt-gem-open { height: 50vh; }
    #yt-gem-header { height: 40px; background: rgba(20,20,20,0.95); display: flex; align-items: center; justify-content: space-between; padding: 0 12px; border-top: 1px solid rgba(255,255,255,0.1); cursor: pointer; user-select: none; }
    #yt-gem-title { font-weight: 600; font-size: 13px; letter-spacing: 0.2px; }
    #yt-gem-toggle { font-size: 12px; opacity: 0.8; }
    #yt-gem-body { height: calc(100% - 40px); background: #0f0f0f; }
    #yt-gem-iframe { width: 100%; height: 100%; border: 0; background: #0f0f0f; }
    #yt-gem-overlay { position: absolute; left: 0; right: 0; bottom: 0; height: calc(50vh - 40px); display: none; align-items: center; justify-content: center; text-align: center; padding: 16px; gap: 8px; background: rgba(0,0,0,0.85); }
    #yt-gem-panel.yt-gem-open #yt-gem-overlay.yt-gem-show { display: flex; }
    #yt-gem-overlay a { color: #8ab4f8; text-decoration: underline; }
    `;
    document.documentElement.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'yt-gem-panel';
    panel.innerHTML = `
      <div id="yt-gem-header" role="button" aria-label="Toggle Gemini panel">
        <div id="yt-gem-title">Gemini · YouTube Assistant</div>
        <div id="yt-gem-toggle">Show</div>
      </div>
      <div id="yt-gem-body" style="position: relative;">
        <iframe id="yt-gem-iframe" title="Gemini" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" referrerpolicy="no-referrer-when-downgrade"></iframe>
        <div id="yt-gem-overlay">
          <div>
            <div style="margin-bottom:6px;">Gemini cannot be embedded here. Opening in a new tab…</div>
            <a id="yt-gem-open-link" target="_blank" rel="noopener noreferrer">Open Gemini in a new tab</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const header = panel.querySelector('#yt-gem-header');
    const toggleEl = panel.querySelector('#yt-gem-toggle');
    const iframe = panel.querySelector('#yt-gem-iframe');
    const overlay = panel.querySelector('#yt-gem-overlay');
    const openLink = panel.querySelector('#yt-gem-open-link');

    let isOpen = false;
    let iframeLoaded = false;
    let loadTimer = null;
    let embedDeniedKnown = false;

    // Restore persisted embed-denied flag
    try {
      chrome.storage?.local?.get?.([EMBED_DENIED_KEY], (res) => {
        embedDeniedKnown = !!(res && res[EMBED_DENIED_KEY]);
        if (embedDeniedKnown) log('Embed previously denied; will auto-open new tab');
      });
    } catch (_) {}

    function currentGemUrlWithParam() {
      const vurl = encodeURIComponent(getCurrentYouTubeUrl());
      const sep = GEM_URL.includes('?') ? '&' : '?';
      return `${GEM_URL}${sep}vurl=${vurl}`;
    }

    function openInNewTab(targetUrl) {
      try { window.open(targetUrl, '_blank', 'noopener,noreferrer'); } catch (_) {}
    }

    function markEmbedDenied() {
      if (embedDeniedKnown) return;
      embedDeniedKnown = true;
      try { chrome.storage?.local?.set?.({ [EMBED_DENIED_KEY]: true }); } catch (_) {}
    }

    function setOpen(next) {
      if (isOpen === next) return;
      isOpen = next;
      panel.classList.toggle('yt-gem-open', isOpen);
      toggleEl.textContent = isOpen ? 'Hide' : 'Show';
      if (!isOpen) {
        overlay.classList.remove('yt-gem-show');
        return;
      }

      const target = currentGemUrlWithParam();
      openLink.setAttribute('href', target);

      if (embedDeniedKnown) {
        overlay.classList.add('yt-gem-show');
        openInNewTab(target);
        return;
      }

      if (!iframe.getAttribute('src')) iframe.setAttribute('src', target);

      iframeLoaded = false;
      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = setTimeout(() => {
        if (!iframeLoaded) {
          log('Embedding blocked (XFO). Persisting flag and showing fallback link.');
          markEmbedDenied();
          overlay.classList.add('yt-gem-show');
          openInNewTab(target);
        }
      }, 1500);
    }

    header.addEventListener('click', () => setOpen(!isOpen));

    iframe.addEventListener('load', () => {
      iframeLoaded = true;
      overlay.classList.remove('yt-gem-show');
      log('Gemini iframe loaded');
    });

    iframe.addEventListener('error', () => {
      log('Gemini iframe error event');
      markEmbedDenied();
      overlay.classList.add('yt-gem-show');
      const target = currentGemUrlWithParam();
      openLink.setAttribute('href', target);
      openInNewTab(target);
    });

    log('YouTube panel injected');
  }

  // -----------------
  // Gemini helpers
  // -----------------
  function bootGemAutoFill() {
    const shouldHandleThisGem = location.pathname.includes('/gem/da23325c2fca');
    if (!shouldHandleThisGem) {
      log('On Gemini but not target gem; skipping auto-fill');
      return;
    }

    log('Gemini auto-fill boot');

    const params = new URLSearchParams(location.search);
    const urlFromParam = params.get('vurl');

    if (urlFromParam) {
      tryFillWhenReady(urlFromParam);
    } else {
      try {
        chrome.storage?.local?.get?.([STORE_KEY], (res) => {
          const url = res && res[STORE_KEY];
          if (url) tryFillWhenReady(url);
          else log('No URL found in storage for auto-fill');
        });
      } catch (e) {
        log('storage.get error', e);
      }
    }

    try {
      chrome.storage?.onChanged?.addListener((changes, area) => {
        if (area !== 'local') return;
        if (!changes[STORE_KEY]) return;
        const next = changes[STORE_KEY].newValue;
        if (!next) return;
        tryFillWhenReady(next, /*onlyIfEmpty*/ false);
        log('Incoming URL via storage.onChanged:', next);
      });
    } catch (_) {}
  }

  function tryFillWhenReady(text, onlyIfEmpty = true) {
    const start = Date.now();
    const timeoutMs = 8000;
    const intervalMs = 250;

    const stop = () => clearInterval(timer);

    const timer = setInterval(() => {
      const editor = document.querySelector('rich-textarea .ql-editor.textarea');
      if (!editor) {
        if (Date.now() - start > timeoutMs) {
          stop();
          log('Input editor not found within timeout');
        }
        return;
      }

      const hasText = (editor.textContent || '').trim().length > 0;
      if (onlyIfEmpty && hasText) {
        stop();
        log('Editor already has content; skipping auto-fill');
        return;
      }

      const ok = insertIntoGemEditor(editor, text);
      if (ok) {
        stop();
        log('Auto-filled Gemini input');
      }
    }, intervalMs);
  }

  function insertIntoGemEditor(editor, text) {
    try {
      editor.focus();
      const inserted = document.execCommand && document.execCommand('insertText', false, text);
      if (!inserted) {
        editor.textContent = text;
      }
      editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      log('Failed to insert into editor', e);
      return false;
    }
  }
})();
