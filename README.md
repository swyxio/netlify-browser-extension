# swyxio-browser-extension

Get it:

- [for Chrome](https://chrome.google.com/webstore/detail/netlify-chrome-extension/dkhfpnphbcckigklfkaemnjdmghhcaoh)
- [for Firefox](https://addons.mozilla.org/en-US/firefox/addon/netlify-browser-extension) [thanks to @nero2009!](https://github.com/netlify/netlify-browser-extension/pull/2#issuecomment-440616828)
- for Edge (not available yet)

---


## Explanation

This is a tiny little browser extension that does a couple things:

- tells you if a site is hosted on Netlify
- if it is:
  - if it is a `.netlify.com` host, check if it is open source:
    - if it is:
      - show you a link to deploy log AND github page
    - else:
      - show you a link to deploy log, only useful if you own it
  - else:
    - nothing else we can do
- if you're on `github.com`
  - makes it easy to one click deploy the repo to netlify
  - adds a button for [Cognition DeepWiki](https://news.smol.ai/issues/25-04-25-cognition-deepwiki)
- else:
  - not active

PRs/feature suggestions welcome

---

## How it works

Honestly its probably more complicated than needs to be but i based it off of other extensions that do the same thing.

- inject `content-script` into every page
- script pings `background.js` that there is a new page
- `background.js` activates the "browser action" (the little logo on the browser bar) if its a Netlify site by sniffing the `Server` field in the response header.
- if it is a Netlify site and you click the "browser action":
  - if it is on `.netlify.com` host, `popup.js` checks if it is open source and manipulates `popup.html` accordingly.


---

## dev notes for swyx

- update manifest.json version
- zip this folder up
- https://chrome.google.com/webstore/devconsole/bd7a2950-c079-4c4e-9d34-18b345736841/dkhfpnphbcckigklfkaemnjdmghhcaoh/edit/package