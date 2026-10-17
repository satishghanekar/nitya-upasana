// Contents list inside the contents + search overlay (built from the home page contents)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { goHomeNav } from "./history.js";

export var ul;

export function init() {
  ul = document.getElementById("jl");
  (function () {
    var li = document.createElement("li");
    li.className = "jhome";
    var b = document.createElement("button");
    b.type = "button";
    b.id = "jhb";
    b.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.6 5.5c.5-1.9 1.8-3.1 3.4-3.7 1.6.6 2.9 1.8 3.4 3.7"/><path d="M8.4 5.6h7.2"/><path d="M8.4 5.6c-.4 3.6.6 6.3 2.4 7.4.1 3.3 0 6.3 1.9 7.6 1.6 1 3.5 0 3.2-1.8-.2-1-1.3-1.3-1.8-.6"/><path d="M15.6 5.6c.4 3.6-.6 6.2-2.6 7.2"/><path d="M8.4 5.6C5.6 4.5 2.4 6 2.8 9.6c.3 2.6 2.4 3.7 4.8 3"/><path d="M15.6 5.6c2.8-1.1 6 .4 5.6 4-.3 2.6-2.4 3.7-4.8 3"/><path d="M12 7v1.8"/><path d="M9.3 13.6l-.9 1.6"/></svg><span class="mr">' + SCR.to("मुखपृष्ठ") + '</span><span class="en" lang="en">Home</span>';
    b.onclick = goHomeNav;
    li.appendChild(b);
    ul.appendChild(li);
  })();
  [].forEach.call(document.querySelectorAll(".tocg"), function (g) {
    var as = g.querySelectorAll("ol.toc li a");
    if (!as.length) return;
    var h = document.createElement("li");
    h.className = "jh";
    h.innerHTML = g.querySelector(".gh").innerHTML;
    ul.appendChild(h);
    [].forEach.call(as, function (a) {
      var li = document.createElement("li"),
        b = document.createElement("a");
      b.href = a.getAttribute("href");
      b.setAttribute("data-go", a.getAttribute("data-go"));
      var m = a.querySelector(".m");
      b.innerHTML = m ? m.innerHTML : a.innerHTML;
      li.appendChild(b);
      ul.appendChild(li);
    });
  });
}
