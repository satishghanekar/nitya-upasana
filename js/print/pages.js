// Print: the pages themselves
// Called by js/features/print.js after js/print/fit.js has sized the lines, in the page-sized copy of the print view.
//
// The rules every printout follows, for every text, now and when texts are added (ARCHITECTURE.md, "Printing"):
//   1. Each printed page is a box of its own (.pvpg) with a forced page break after it. The browser is never left to
//      decide where a page ends, so Safari, Chrome and Firefox print exactly the pages planned here, and the contents'
//      page numbers are read off these boxes.
//   2. What goes on a page are blocks (.pvk), each one of a few kinds, marked by the print view (js/features/print.js):
//        - data-keep: kept on the same page as the block after it (a title, the dhrupad at the top, a note that heads
//          what follows);
//        - data-flow: may run on to the next page between two of its lines (a Vedic paragraph, or its rows side by
//          side), never leaving one line alone at the foot or the top of a page;
//        - every other block (a stanza with its marker or repeated dhrupad) is never split.
//   3. A text in one language is set in one column, centred on the page as wide as its longest line, or in two columns
//      when that takes fewer pages or allows a larger size. A block too wide for half the page (a long closing line)
//      runs across both columns rather than stopping the text from being set in two (data-span).
//   4. A whole text is set at one size (a zoom on its pages): the largest step of the fixed scale that takes no more
//      pages, or smaller, down to the floor, when that saves a page (LAYOUT in js/print/profiles.js).
// Nothing here is particular to a text: a new text prints by these rules as soon as its file exists.

/** @typedef {{ h: number, span?: boolean, keep?: boolean, flow?: boolean }} Item  a block's height (px), as laid out */
/** @typedef {{ span: number } | { cols: number[][] }} Row  a block across the page, or a run of blocks in columns */

/**
 * The best split of a run of blocks between two columns: the left column takes the first j, the right the rest, so
 * that the taller column is as short as it can be (a tie: the left column the longer, as a book reads).
 * @param {number[]} hs @returns {{ j: number, h: number }}
 */
export function balance(hs) {
  var total = hs.reduce(function (a, b) { return a + b; }, 0),
    best = { j: 0, h: Infinity },
    left = 0;
  for (var j = 1; j <= hs.length; j++) {
    left += hs[j - 1];
    var h = Math.max(left, total - left);
    if (h <= best.h + 1e-6) best = { j: j, h: h };
  }
  return best;
}

/**
 * Plan the pages of one text from its blocks' heights (pure: the unit tests check it).
 * One column (cols 1): blocks top to bottom; a flowing block runs on to the next page, others start a new page when
 * they do not fit. Two columns (cols 2): runs of blocks between blocks that span are set down the left column and on
 * down the right, balanced where the run ends on the page.
 * A block kept with the next (keep) starts a new page with it when the two do not fit together.
 * @param {Item[]} items  @param {number} C  a page's height  @param {1 | 2} cols
 * @returns {{ n: number, pages: Row[][], last: number }}  n: pages (a block taller than a page counts for each page it
 *   takes); last: how full the last page is (0 to 1)
 */
export function plan(items, C, cols) {
  /** @type {Row[][]} */
  var pages = [[]],
    used = 0,
    extra = 0,
    i = 0;
  function newPage() {
    pages.push([]);
    used = 0;
  }
  function row(/** @type {number} */ k) {
    var page = pages[pages.length - 1],
      last = page[page.length - 1];
    if (items[k].span) page.push({ span: k });
    else if (last && "cols" in last) last.cols[0].push(k);
    else page.push({ cols: [[k]] });
  }
  // the height a block needs below it on its page: with the blocks kept with it, or for a paragraph that runs on, two
  // of its lines
  function need(/** @type {number} */ k) {
    var h = 0;
    for (var m = k; m < items.length; m++) {
      var x = items[m];
      h += x.flow ? Math.min(x.h, 2 * LINE) : x.h;
      if (!x.keep) break;
    }
    return Math.min(h, C);
  }
  while (i < items.length) {
    var it = items[i];
    if (it.span || cols === 1) {
      if (used > 0 && used + need(i) > C + 0.5) {
        newPage();
        continue;
      }
      row(i);
      if (it.flow && used + it.h > C + 0.5) {
        // a paragraph runs on: what fits here, the rest from the top of the next pages
        var rest = it.h - (C - used);
        while (rest > 0.5) {
          newPage();
          row(i);
          used = Math.min(rest, C);
          rest -= C;
        }
      } else if (it.h > C + 0.5) {
        // a block taller than a page runs on and counts for every page it takes
        extra += Math.ceil(it.h / C) - 1;
        used = it.h - Math.floor(it.h / C) * C;
      } else used += it.h;
      i++;
      continue;
    }
    // two columns: the run of blocks up to the next block that spans
    var j = i;
    while (j < items.length && !items[j].span) j++;
    var run = [];
    for (var k = i; k < j; k++) run.push(items[k].h);
    var rem = C - used,
      b = balance(run);
    if (b.h <= rem + 0.5) {
      pages[pages.length - 1].push({ cols: [range(i, i + b.j), range(i + b.j, j)] });
      used += b.h;
      i = j;
      continue;
    }
    // the run does not end on this page: fill the left column, then the right, then go on overleaf
    var L = [],
      R = [],
      hl = 0,
      hr = 0,
      m = i;
    while (m < j && hl + items[m].h <= rem + 0.5) {
      hl += items[m].h;
      L.push(m++);
    }
    while (m < j && hr + items[m].h <= rem + 0.5) {
      hr += items[m].h;
      R.push(m++);
    }
    if (!L.length) {
      if (used > 0) {
        newPage();
        continue;
      }
      // a block taller than a column: alone in the left column, running on
      extra += Math.ceil(items[m].h / C) - 1;
      L.push(m++);
    }
    pages[pages.length - 1].push({ cols: [L, R] });
    newPage();
    i = m;
  }
  if (!pages[pages.length - 1].length && pages.length > 1) pages.pop();
  return { n: pages.length + extra, pages: pages, last: Math.min(1, used / C) };
}
// about the height of one line of a paragraph, in px at the printed sizes
var LINE = 30;
function range(a, b) {
  var r = [];
  for (var i = a; i < b; i++) r.push(i);
  return r;
}

/**
 * The size and layout of one text: of the sizes it may take (largest first) and the layouts it may take (one column,
 * and two where allowed), the one with the fewest pages, then the largest size, then one column (pure).
 * @param {(k: number, cols: 1 | 2) => { n: number, last: number } | null} pagesAt  the pages at a size and layout, or
 *   null where that layout is not possible (a line too wide for a column)
 * @param {number[]} sizes  largest first
 * @param {number} [own]  the pages at the text's own size may not grow (a text set larger never takes more pages)
 * @returns {{ k: number, cols: 1 | 2, n: number }}
 */
export function choose(pagesAt, sizes, own) {
  var best = null;
  sizes.forEach(function (k) {
    /** @type {(1 | 2)[]} */ ([1, 2]).forEach(function (c) {
      var r = pagesAt(k, c);
      if (!r) return;
      if (k > 1 && own && r.n > own) return;
      if (!best || r.n < best.n || (r.n === best.n && k > best.k + 1e-6)) best = { k: k, cols: c, n: r.n };
    });
  });
  return best || { k: 1, cols: 1, n: own || 1 };
}

// ---- Building the pages in the page-sized copy (the browser lays out each page box as it will print) ----

/**
 * A block's lines that can end a page: the rows of its tables, or the words of its running paragraph. Returns a DOM
 * point to split at so that what comes before ends above `limit` (a y coordinate), keeping two lines on each side, or
 * null when the block cannot be split there. y: the top of the line (or row) that then starts the next page. A block
 * already split above (from: the y its current page starts at) counts its two lines from there.
 * @param {HTMLElement} k @param {number} limit @param {number} [from]
 * @returns {{ node: Node, offset: number, y: number } | null}
 */
export function splitPoint(k, limit, from) {
  var f = from === undefined ? -Infinity : from - 1;
  var rows = [].filter.call(k.querySelectorAll("tr"), function (/** @type {HTMLElement} */ r) {
    return r.getClientRects().length > 0;
  });
  if (rows.length) {
    var r = 0,
      r0 = 0;
    while (r0 < rows.length && rows[r0].getBoundingClientRect().top < f) r0++;
    r = r0;
    while (r < rows.length && rows[r].getBoundingClientRect().bottom <= limit) r++;
    if (r - r0 < 2 || r > rows.length - 1) return r - r0 >= 1 && r < rows.length ? at(rows[r]) : null;
    return at(rows[r]);
  }
  // the words of its paragraphs, in order (a block may hold several: it splits in any of them)
  var ps = [].filter.call(k.querySelectorAll("p"), function (/** @type {HTMLElement} */ x) {
    return x.getClientRects().length > 0;
  });
  if (!ps.length) return null;
  var doc = k.ownerDocument,
    words = [],
    n;
  ps.forEach(function (/** @type {HTMLElement} */ p) {
    var walk = doc.createTreeWalker(p, 4);
    while ((n = walk.nextNode())) {
      var re = /\S+/g,
        m;
      while ((m = re.exec(n.data))) words.push({ node: n, offset: m.index });
    }
  });
  if (words.length < 4) return null;
  var rng = doc.createRange();
  function box(i) {
    var w = words[i];
    rng.setStart(w.node, w.offset);
    rng.setEnd(w.node, w.offset + 1);
    return rng.getBoundingClientRect();
  }
  // the first word that ends below the limit
  var lo = 0,
    hi = words.length;
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (box(mid).bottom > limit) hi = mid;
    else lo = mid + 1;
  }
  if (lo >= words.length) return null;
  function lineStart(i) {
    var t = box(i).top;
    while (i > 0 && Math.abs(box(i - 1).top - t) < 2) i--;
    return i;
  }
  var s = lineStart(lo);
  // two lines at least before the break, and two after it
  var before = 0,
    last = null;
  for (var i = 0; i < s; i++) {
    var t = Math.round(box(i).top);
    if (t < f) continue;
    if (t !== last) before++, (last = t);
  }
  var after = 0;
  last = null;
  for (i = s; i < words.length && after < 2; i++) {
    t = Math.round(box(i).top);
    if (t !== last) after++, (last = t);
  }
  if (after < 2) s = s > 0 ? lineStart(s - 1) : 0, before--;
  if (before < 2 || s <= 0) return null;
  return { node: words[s].node, offset: words[s].offset, y: box(s).top };
}
function at(/** @type {HTMLElement} */ el) {
  return { node: /** @type {Node} */ (el.parentNode), offset: [].indexOf.call(el.parentNode.childNodes, el), y: el.getBoundingClientRect().top };
}

/**
 * Split a block at a point: what comes after it moves into a copy of the block (its own copies of the elements around
 * it, as the Range API makes them), which is returned. Tables keep their column widths.
 * @param {HTMLElement} k @param {{ node: Node, offset: number }} pt @returns {HTMLElement}
 */
export function splitAt(k, pt) {
  var doc = k.ownerDocument,
    r = doc.createRange();
  r.setStart(pt.node, pt.offset);
  r.setEnd(k, k.childNodes.length);
  var rest = /** @type {HTMLElement} */ (k.cloneNode(false));
  rest.appendChild(r.extractContents());
  rest.classList.add("pvcont");
  // a table carried over keeps its column widths
  [].forEach.call(rest.querySelectorAll("table"), function (/** @type {HTMLTableElement} */ t) {
    if (t.querySelector("colgroup")) return;
    var src = k.querySelector("table colgroup");
    if (src) t.insertBefore(src.cloneNode(true), t.firstChild);
  });
  // nothing left of a paragraph's first part but its spaces: drop the empty shells
  [].forEach.call(k.querySelectorAll("p, tr"), function (/** @type {HTMLElement} */ x) {
    if (!x.textContent.trim()) x.remove();
  });
  return rest;
}
