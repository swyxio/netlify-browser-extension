// https://stackoverflow.com/questions/220231/accessing-the-web-pages-http-headers-in-javascript
// but using fetch cos sync xmlhttp is blocked
// but using webview cos fetch is blocked https://developer.chrome.com/extensions/manifest/sandbox
// nvm lol you can do async xmlhttp

let webExtensionAPI = chrome;

// let DEBUG = true
let DEBUG = false

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
    })
  }
}

var { host, pathname } = document.location
// if (DEBUG) console.log({ location: document.location })
webExtensionAPI.runtime.sendMessage({ method: "setHost", url: host })

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
