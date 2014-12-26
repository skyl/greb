// using a bit of global state to our advantage.
var allLinks = []; // on the current page
window.sLinks = new Set(); // as Set of Links seen
var results;  // = document.getElementById("results")
var innerResults;
var query;
var h4;
var insensitive;
var recurse;

window.C = 0


function hrefsFromText(text) {
  var doc = document.createElement("html");
  doc.innerHTML = text;
  var links = doc.getElementsByTagName("a");
  var hrefs = [];

  for (var i=0; i<links.length; i++) {
    href = links[i].getAttribute("href");
    if (href && href.indexOf("http") === 0) {
      console.log("adding", href);
      hrefs.push(href);
    }
  }
  return hrefs;
}




function get(link, cb) {
  console.log('GET!', link);

  window.C += 1;
  var req = new XMLHttpRequest();
  req.open("GET", link);
  req.send(null);

  req.onreadystatechange = function() {
    if (req.readyState==4 && req.status==200) {
      cb(link, req.responseText);
    }
  }
}

function openAnchor(ev) {
  chrome.tabs.create({url: ev.target.href});
}

function openAnchorNewWindow(ev) {
  chrome.windows.create({url: ev.target.href});
}



function match(link, text, r) {
  if (insensitive) {
    text = text.toLowerCase();
    query = query.toLowerCase();
  }
  if (text.indexOf(query) > -1) {
    console.log(text.indexOf(query));
    var a = document.createElement("a");
    a.appendChild(document.createTextNode(link));
    a.setAttribute("href", link);
    a.addEventListener("click", openAnchor);
    a.addEventListener("contextmenu", openAnchorNewWindow);
    innerResults.appendChild(a);
    innerResults.appendChild(document.createElement("br"));

    console.log("recurse?", r, recurse)
    if (r < recurse) {
      var subLinks = hrefsFromText(text);
      console.log("sublinks!", link, subLinks);
      for (var i = subLinks.length - 1; i >= 0; i--) {
        link = subLinks[i];
        // only see a link once! muahah?!
        console.log("in sublinks", link);
        if (sLinks.has(link)) {
          console.log("already have", link)
          continue;
        }
        sLinks.add(link);
        console.log("get", link);
        get(link, function(slink, stext) {
          match(slink, stext, r + 1);
        });
      };
    }
  }
}



function onKeyUp(ev) {
  //console.log('KEYUP!');
  //console.log(ev)

  if (ev.which === 13) {
    //console.log(allLinks);

    recurse = parseInt(document.getElementById("r").value) || 1;
    insensitve = document.getElementById("i").checked;

    query = document.getElementById("greb").value;
    innerResults = document.createElement("div");
    // make header and secure?
    h4 = document.createElement("h4");
    h4.appendChild(
      document.createTextNode(
        query
        + (document.getElementById("i").checked ? " -i" : "")
      )
    );
    innerResults.appendChild(h4);
    results.insertBefore(innerResults, results.firstChild);
    //results.appendChild(innerResults);

    sLinks = new Set(allLinks);

    sLinks.forEach(function(val) {
      get(val, function(slink, stext) {
        match(slink, stext, 1);
      })
    });

    /*
    for (var i = sLinks.size - 1; i >= 0; i--) {
      get(allLinks[i], function(slink, stext){
        match(slink, stext, 1);
      });
    }
    */
  }
}


// Add links to allLinks and visibleLinks, sort and show them.  send_links.js is
// injected into all frames of the active tab, so this listener may be called
// multiple times.
chrome.extension.onRequest.addListener(function(links) {
  //allLinks = new Set(links);
  for (var index in links) {
    allLinks.push(links[index]);
  }
});



// Set up event handlers and inject send_links.js into all frames in the active
// tab.
window.onload = function() {
  console.log('onload!');
  var el = document.getElementById('greb');
  results = document.getElementById("results");
  //console.log(el);
  el.onkeyup = onKeyUp;

  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query(
      {active: true, windowId: currentWindow.id},
      function(activeTabs) {
        console.log('activeTabs!');
        // console.log(activeTabs)
        chrome.tabs.executeScript(
          activeTabs[0].id, {file: 'send_links.js', allFrames: true}
        );
      }
    );
  });
};
