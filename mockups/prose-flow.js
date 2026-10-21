// Mockup: keep each danda (। ॥ |) on the row of the word before it
document.querySelectorAll(".ash.prose .verse p").forEach(function (p) {
  var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), ns = [], n;
  while ((n = w.nextNode())) ns.push(n);
  ns.forEach(function (n) {
    var re = /\S+(?: +(?:[।॥|]+|[0-9०-९]+(?= +[॥|])))+/g, t = n.data, f = document.createDocumentFragment(), at = 0, m;
    while ((m = re.exec(t))) {
      var s = document.createElement("span");
      s.className = "nb";
      s.textContent = m[0];
      f.appendChild(document.createTextNode(t.slice(at, m.index)));
      f.appendChild(s);
      at = m.index + m[0].length;
    }
    if (!at) return;
    f.appendChild(document.createTextNode(t.slice(at)));
    n.parentNode.replaceChild(f, n);
  });
});
// a line written on two rows runs on too
document.querySelectorAll(".ash.prose .verse p br").forEach(function (b) {
  b.replaceWith(document.createTextNode(" "));
});
