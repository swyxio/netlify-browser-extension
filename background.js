// Import browser polyfill for Firefox compatibility
import './browser-polyfill.js';

var urlHost, requestHeader
var getLocation = function(href) {
  var l = document.createElement("a")
  l.href = href
  return l
}

// Use browser namespace from the polyfill
let webExtensionAPI = browser;

function onMessage(request, sender, sendResponse) {
  console.log("onMessage", { request })
  if (request.netlifyPage && request.netlifyPage["x-nf-request-id"] && sender.tab) {
    var url = getLocation(sender.url)
    var slug = url.hostname
    webExtensionAPI.action.setIcon({
      path: "logo16.png",
      tabId: sender.tab.id
    })
    webExtensionAPI.action.setTitle({
      title: "It's a Netlify Site!",
      tabId: sender.tab.id
    })
    webExtensionAPI.action.setPopup({
      tabId: sender.tab.id,
      popup: "popup.html"
    })
    requestHeader = request.netlifyPage
    sendResponse({
      // goes to popup.js
      hiFrom: "backgroundjs",
      slug
    })
    return true; // Keep the message channel open for async response
  }
  
  if (request.method === "setHost") {
    console.log("setHost", { request })
    urlHost = request.url
    try { sendResponse({ ok: true }); } catch (e) { console.warn('sendResponse error for setHost', e); }
    return; // respond synchronously; do not keep channel open
  } else if (request.method === "getHost") {
    console.log("getHost", { urlHost })
    try { sendResponse({ urlHost, requestHeader }); } catch (e) { console.warn('sendResponse error for getHost', e); }
    return; // respond synchronously; do not keep channel open
  }
  
  if (request.get_version) {
    webExtensionAPI.tabs.query(
      {
        active: true,
        currentWindow: true
      },
      function(tabs) {
        if (tabs && tabs.length > 0) {
          webExtensionAPI.tabs.sendMessage(
            tabs[0].id,
            {
              check: "version"
            },
            function(response) {
              return response
            }
          )
        }
      }
    )
    return true; // Keep the message channel open for async response
  }
}

// Service worker needs to be explicitly activated
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// Service worker needs to handle installation
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting(); // Ensures the service worker activates immediately
});

webExtensionAPI.runtime.onMessage.addListener(onMessage)

//Checks if version in use is lower than the current version
function lowerVersion(in_use_version, current_version) {
  return false
}
