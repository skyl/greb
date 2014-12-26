// using a bit of global state to our advantage.
var allLinks = []; // on the current page
window.sLinks = new Set(); // as Set of Links seen
var results;  // = document.getElementById("results")
var innerResults;
var query;
var h4;
var insensitive;
var recurse;
var match;

window.C = 0


function matches(inputstring, text) {
  var regParts = inputstring.match(/^\/(.*?)\/([gim]*)$/);
  if (regParts) {
    // the parsed pattern had delimiters and modifiers. handle them.
    var regexp = new RegExp(regParts[1], regParts[2]);

  } else {
    // we got pattern string without delimiters
    var regexp = new RegExp(inputstring);
  }
  return text.match(regexp);
}



function hrefsFromText(text) {
  var doc = document.createElement("html");
  doc.innerHTML = text;
  var links = doc.getElementsByTagName("a");
  var hrefs = [];

  for (var i=0; i<links.length; i++) {
    href = links[i].getAttribute("href");
    if (href && href.indexOf("http") === 0) {
      //console.log("adding", href);
      hrefs.push(href);
    }
  }
  return hrefs;
}




function get(link, cb) {
  //console.log('GET!', link);

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



function testText(link, text, r) {
  if (insensitive) {
    text = text.toLowerCase();
    query = query.toLowerCase();
  }
  if (text.indexOf(query) > -1) {
    //console.log(text.indexOf(query));
    var a = document.createElement("a");
    a.appendChild(document.createTextNode(link));
    a.setAttribute("href", link);
    a.addEventListener("click", openAnchor);
    a.addEventListener("contextmenu", openAnchorNewWindow);
    innerResults.appendChild(a);
    innerResults.appendChild(document.createElement("br"));

    //console.log("recurse?", r, recurse)
    if (r < recurse) {
      var subLinks = hrefsFromText(text);
      //console.log("sublinks!", link, subLinks);
      for (var i = subLinks.length - 1; i >= 0; i--) {
        link = subLinks[i];
        // only see a link once! muahah?!
        // console.log("in sublinks", link);
        if (sLinks.has(link)) {
          //console.log("already have", link)
          continue;
        }
        sLinks.add(link);
        //console.log("get", link);
        if (matches(document.getElementById("m").value, link)) {
          get(link, function(slink, stext) {
            testText(slink, stext, r + 1);
          });
        }
      };
    }
  }
}


function submitQuery() {
  query = document.getElementById("greb").value;

  insensitve = document.getElementById("i").checked;
  recurse = parseInt(document.getElementById("r").value) || 1;
  match = document.getElementById("m").value || "";

  innerResults = document.createElement("div");

  // secure
  h4 = document.createElement("h4");
  var r = document.getElementById("r").value
  h4.appendChild(
    document.createTextNode(
      query
      + (document.getElementById("i").checked ? " -i" : "")
      + (r ? " r(" + r + ")" : "")
    )
  );
  innerResults.appendChild(h4);
  results.insertBefore(innerResults, results.firstChild);

  sLinks = new Set(allLinks);

  sLinks.forEach(function(val) {
    if (matches(match, val)) {
      get(val, function(slink, stext) {
        testText(slink, stext, 1);
      });
    }
  });
}



function onKeyUp(ev) {
  if (ev.which === 13) {
    submitQuery();
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
  results = document.getElementById("results");
  document.getElementById("greb").onkeyup = onKeyUp;
  document.getElementById("r").onkeyup = onKeyUp;
  document.getElementById("i").onkeyup = onKeyUp;
  document.getElementById("m").onkeyup = onKeyUp;

  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query(
      {active: true, windowId: currentWindow.id},
      function(activeTabs) {
        // console.log('activeTabs!');
        // console.log(activeTabs)
        chrome.tabs.executeScript(
          activeTabs[0].id, {file: 'send_links.js', allFrames: true}
        );
      }
    );
  });
};
