matches = (inputstring, text) ->
  regParts = inputstring.match(/^\/(.*?)\/([gim]*)$/)
  if (regParts)
    regexp = new RegExp(regParts[1], regParts[2])
  else
    regexp = new RegExp(inputstring);
  return text.match(regexp)


hrefsFromText = (text) ->
  doc = document.createElement("html")
  doc.innerHTML = text
  links = doc.getElementsByTagName("a")
  hrefs = []
  i = 0
  while i < links.length
    href = links[i].getAttribute("href")
    hrefs.push href if href and href.indexOf("http") is 0
    i++
  hrefs


openAnchor = (ev) ->
  chrome.tabs.create url: ev.target.href
  return


openAnchorNewWindow = (ev) ->
  chrome.windows.create url: ev.target.href
  return



class Query

  constructor: (@greb, @insensitive, @recurse, @match) ->

  renderInElement: (element) =>
    # must be called - choose element to bind list to
    @innerResults = document.createElement("div");
    h4 = document.createElement("h4")
    console.log @greb, @insensitive, @recurse
    h4.appendChild(
      document.createTextNode(
        @greb +
        (if @insensitive then " -i" else "") +
        (if @recurse then " r(#{@recurse})" else "")
      )
    )
    @innerResults.appendChild(h4)
    element.insertBefore(@innerResults, element.firstChild)

  get: (link, cb) =>
    req = new XMLHttpRequest()
    req.open("GET", link)
    req.send(null)
    req.onreadystatechange = () ->
      if (req.readyState==4 && req.status==200)
        cb(link, req.responseText)

  run: (links) =>
    self = @
    self.sLinks = new Set(links)
    self.sLinks.forEach (link) ->
      if matches self.match, link
        self.get link, (slink, stext) ->
          self.testText(slink, stext, 1)

  appendLinkToPopupDOM: (link) ->
    a = document.createElement("a")
    a.appendChild document.createTextNode(link)
    a.setAttribute "href", link
    a.addEventListener "click", openAnchor
    a.addEventListener "contextmenu", openAnchorNewWindow
    @innerResults.appendChild a
    @innerResults.appendChild document.createElement("br")

  testText: (link, text, r) =>
    self = @
    greb = self.greb
    if @insensitive
      text = text.toLowerCase()
      greb = greb.toLowerCase()
    # TODO: RegEx
    if text.indexOf(greb) > -1
      # add to DOM
      self.appendLinkToPopupDOM(link)

      if r < @recurse
        subLinks = hrefsFromText(text)
        i = subLinks.length - 1

        while i >= 0
          link = subLinks[i]

          if self.sLinks.has(link)
            i--
            continue
          self.sLinks.add link

          if matches self.match, link
            self.get link, (slink, stext) ->
              self.testText slink, stext, r + 1
              return

          i--
    return


window.allLinks = []

submitQuery = ->
  greb = document.getElementById("greb").value
  insensitive = document.getElementById("i").checked
  recurse = parseInt(document.getElementById("r").value) or 1
  match = document.getElementById("m").value or ""
  query = new Query(greb, insensitive, recurse, match)
  query.renderInElement document.getElementById("results")
  query.run allLinks
  return


onKeyUp = (ev) ->
  submitQuery() if ev.which is 13
  return


chrome.extension.onRequest.addListener (links) ->
  for index of links
    allLinks.push links[index]
  return


window.onload = ->
  results = document.getElementById("results")
  document.getElementById("greb").onkeyup = onKeyUp
  document.getElementById("r").onkeyup = onKeyUp
  document.getElementById("i").onkeyup = onKeyUp
  document.getElementById("m").onkeyup = onKeyUp
  chrome.windows.getCurrent (currentWindow) ->
    chrome.tabs.query
      active: true
      windowId: currentWindow.id
    , (activeTabs) ->
      chrome.tabs.executeScript activeTabs[0].id,
        file: "send_links.js"
        allFrames: true
      return
    return
  return
