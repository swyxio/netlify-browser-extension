var urlHost, requestHeader
var getLocation = function(href) {
  var l = document.createElement("a")
  l.href = href
  return l
}

let webExtensionAPI = chrome;

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
    return true; // Keep the message channel open for async response
  } else if (request.method === "getHost") {
    console.log("getHost", { urlHost })
    sendResponse({ urlHost, requestHeader })
    return true; // Keep the message channel open for async response
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
