// Preview bridge, written into each template's preview.html (never into a download). The studio
// sends the replacements a person has typed; this swaps them into the page's text, its picture
// addresses and a few attributes, and keeps doing so as the template's own code changes the page.
// Each node remembers its original text, so a later change starts again from the template's words.
(function () {
  var reps = [];
  try {
    var m = location.hash.match(/xp=([^&]+)/);
    if (m) reps = JSON.parse(decodeURIComponent(m[1]));
  } catch (e) {}
  var ATTRS = ["alt", "placeholder", "aria-label", "title", "content", "src", "style", "poster"];
  var orig = new WeakMap();
  var last = new WeakMap();
  var cache = {};
  function rx(s) {
    return cache[s] || (cache[s] = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/(\\s|\s)+/g, "\\s+"), "g"));
  }
  function swap(str, attr) {
    for (var i = 0; i < reps.length; i++) {
      var r = reps[i];
      if (r.type === "image" ? attr !== "src" && attr !== "style" && attr !== "poster" : attr === "src") continue;
      if (str.indexOf(r.from.split(/\s/)[0]) === -1) continue;
      str = str.replace(rx(r.from), function () {
        return r.to;
      });
    }
    return str;
  }
  function text(n) {
    var cur = n.data;
    var o = last.get(n) === cur ? orig.get(n) : cur;
    orig.set(n, o);
    var v = swap(o, null);
    if (v !== cur) n.data = v;
    last.set(n, v);
  }
  function attrs(el) {
    var o = orig.get(el) || {};
    var l = last.get(el) || {};
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      var cur = el.getAttribute(a);
      if (cur == null) continue;
      if (l[a] !== cur) o[a] = cur;
      var v = swap(o[a], a);
      if (v !== cur) el.setAttribute(a, v);
      l[a] = v;
    }
    orig.set(el, o);
    last.set(el, l);
  }
  function walk(root) {
    if (!root) return;
    var w = document.createTreeWalker(root, 5);
    for (var n = w.currentNode; n; n = w.nextNode()) {
      if (n.nodeType === 3) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p !== "SCRIPT" && p !== "STYLE") text(n);
      } else if (n.nodeType === 1) attrs(n);
    }
  }
  window.__xpApply = function () {
    walk(document.documentElement);
  };
  var queued = false;
  var mo = new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      window.__xpApply();
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  addEventListener("message", function (e) {
    if (e.source !== parent || !e.data || e.data.type !== "xp-template") return;
    reps = e.data.reps || [];
    window.__xpApply();
  });
  document.addEventListener("DOMContentLoaded", window.__xpApply);
})();
