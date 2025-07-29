/**
 * Mozilla WebExtension browser API Polyfill
 * This is a simplified version of Mozilla's webextension-polyfill
 * https://github.com/mozilla/webextension-polyfill
 */

(function(globalThis) {
  'use strict';

  if (typeof globalThis.browser !== 'undefined') {
    // Firefox already has a browser namespace, so we don't need to create one
    return;
  }
  
  // Chrome has a chrome namespace
  if (typeof globalThis.chrome !== 'undefined') {
    globalThis.browser = {};
    
    // API namespaces that need wrapping with Promise
    const BROWSER_APIS = [
      'action',
      'browserAction',
      'runtime',
      'tabs',
      'storage',
      'webRequest',
      'windows'
    ];
    
    // Copy Chrome's API and wrap callbacks with Promises
    for (const namespace of BROWSER_APIS) {
      if (chrome[namespace]) {
        globalThis.browser[namespace] = {};
        
        // Copy methods from chrome to browser
        for (const key in chrome[namespace]) {
          if (typeof chrome[namespace][key] === 'function') {
            // Wrap async methods with Promise
            globalThis.browser[namespace][key] = function(...args) {
              return new Promise((resolve, reject) => {
                chrome[namespace][key](...args, function(result) {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(result);
                  }
                });
              });
            };
          } else {
            // Copy non-function properties directly
            globalThis.browser[namespace][key] = chrome[namespace][key];
          }
        }
      }
    }
    
    // For APIs that don't return promises but are essential
    // Initialize them directly
    const DIRECT_APIS = ['i18n', 'extension'];
    for (const namespace of DIRECT_APIS) {
      if (chrome[namespace]) {
        globalThis.browser[namespace] = chrome[namespace];
      }
    }
    
    // Special handling for onMessage to preserve the return value for async responses
    if (chrome.runtime && chrome.runtime.onMessage) {
      const originalAddListener = chrome.runtime.onMessage.addListener;
      globalThis.browser.runtime.onMessage = {
        addListener: function(listener) {
          return originalAddListener.call(chrome.runtime.onMessage, (message, sender, sendResponse) => {
            const result = listener(message, sender, sendResponse);
            return result === true; // Return true to keep message channel open for async
          });
        }
      };
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this); 