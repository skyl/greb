matches = (inputstring, text) ->
  regParts = inputstring.match(/^\/(.*?)\/([gim]*)$/)
  if (regParts)
    regexp = new RegExp(regParts[1], regParts[2])
  else
    regexp = new RegExp(inputstring);
  return text.match(regexp)

# set onload
window.tabUrl = ""

badStarts = [
  "chrome-extension",
  "mailto",
  "ftp",
  "#",
  "javascript",
  # ...
]


testHREF = (href) ->
  if not href
    return false

  for start in badStarts
    if href.indexOf(start) is 0
      return false

  return true


hrefsFromText = (text) ->
  doc = document.createElement("html")
  doc.innerHTML = text
  links = doc.getElementsByTagName("a")
  hrefs = []
  i = 0
  while i < links.length
    href = links[i].getAttribute("href")

    # no href
    if href is null
      i++
      continue

    # starts with some funky protocol or #
    if not testHREF(href)
      i++
      continue

    hrefs.push href

    i++
  hrefs


correctLink = (base, link) ->
  # make relative link absolute, if needed
  if (link.indexOf("http") isnt 0) and (link.indexOf("//") isnt 0)

    if link.indexOf("/") isnt 0
      # it/is/relative
      link = base + link
    else
      # /it/is/like/this
      rebase = base.split('/')
      rebase = rebase[0] + '//' + rebase[2];
      link = rebase + link
  return link


openAnchor = (ev) ->
  chrome.tabs.create url: ev.target.href
  return


openAnchorNewWindow = (ev) ->
  chrome.windows.create url: ev.target.href
  return

window.qs = 0

class Query

  constructor: (@greb, @insensitive, @recurse, @all, @match) ->
    @seenLinks = new Set()

  renderInElement: (element) =>
    # must be called - choose element to bind list to
    @innerResults = document.createElement("div");
    h4 = document.createElement("h4")
    h4.appendChild(
      document.createTextNode(
        @greb +
        (if @insensitive then " -i" else "") +
        (if @recurse then " -r #{@recurse}" else "") +
        (if @all then " -a" else "") +
        (if @match then " -m #{@match}" else "")
      )
    )
    @innerResults.appendChild(h4)
    element.insertBefore(@innerResults, element.firstChild)

  get: (link, cb) =>
    if link.indexOf("http") isnt 0
      return

    window.qs += 1

    isPDF = link.indexOf(".pdf", link.length - 4) isnt -1

    if isPDF
      (new Pdf2Text()).pdfToText link, (() ->), (text) ->
        cb link, text

    # not a pdf, process as text
    else
      req = new XMLHttpRequest()
      req.open("GET", link)
      req.send(null)
      req.onreadystatechange = () ->
        if (req.readyState==4 && req.status==200)
          cb(link, req.responseText)

  run: (base, links, r) =>
    # r is the level that we have recursed
    # starts with 1, while r is less than or

    self = @
    links = new Set(links)
    links.forEach (link) ->

      link = correctLink(base, link)
      if self.seenLinks.has link
        return
      self.seenLinks.add link

      potential = matches(self.match, link)

      if potential or r < self.recurse

        self.get link, (slink, stext) ->
          cb = if potential then self.appendLinkToPopupDOM else () ->
          found = self.testText(slink, stext, cb)

          if (not found) and (not self.all)
            return

          sublinks = hrefsFromText(stext)
          if r < self.recurse
            if (slink.indexOf("http") is 0) or (slink.indexOf("//") is 0)
              base = slink.replace(slink.substr(slink.lastIndexOf('/') + 1), '')
            else
              base = tabUrl

            self.run(base, sublinks, r + 1)

  appendLinkToPopupDOM: (link) =>
    a = document.createElement("a")
    a.appendChild document.createTextNode(link)
    a.setAttribute "href", link
    a.addEventListener "click", openAnchor
    a.addEventListener "contextmenu", openAnchorNewWindow
    @innerResults.appendChild a
    @innerResults.appendChild document.createElement("br")

  testText: (link, text, cb) =>
    text = text.replace(/<(?:.|\n)*?>/gm, ' ')

    self = @
    greb = self.greb
    # https://developer.mozilla.org/
    # en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    flags = "gm"
    if @insensitive
      text = text.toLowerCase()
      #greb = greb.toLowerCase()
      flags += "i"

    re = new RegExp(greb, flags)
    if re.test(text)

      cb(link)
      return true

    return false


window.allLinks = []

submitQuery = ->
  greb = document.getElementById("greb").value
  insensitive = document.getElementById("i").checked
  recurse = parseInt(document.getElementById("r").value) or 1
  #all = document.getElementById("a").checked
  all = false
  match = document.getElementById("m").value or ""
  window.query = new Query(greb, insensitive, recurse, all, match)
  query.renderInElement document.getElementById("results")
  query.run tabUrl, allLinks, 1
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
  #document.getElementById("a").onkeyup = onKeyUp
  document.getElementById("i").onkeyup = onKeyUp
  document.getElementById("m").onkeyup = onKeyUp

  chrome.tabs.getSelected null, (tab) ->
    # tabId = tab.id
    window.tabUrl = tab.url
    # just the base
    window.tabUrl = tabUrl.replace(
      tabUrl.substr(tabUrl.lastIndexOf('/') + 1), '')

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
