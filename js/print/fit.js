// Print layout: fitting the text to the paper
// Called by js/features/print.js while it lays the print view out on a page-sized copy (to plan the
// pages), before the page breaks are planned. The numbers it works with are in js/print/profiles.js.
//
// A printed line should stay whole: on one line, or broken only where it has its own line breaks. Side by
// side, each line of the original should take as many lines as its English, so the rows stay in step.
// The print styles give every line its size; this adjusts them, in five steps:
//   1. collect: each piece, with its columns (the original, the English) and their lines, in any
//      layout: side by side (a table per stanza), stacked, single or two columns (a .verse per stanza);
//   1b. match (side by side): a line written in two lines (<br>) in one language and as one line in the
//      other is broken in the other too, at its preferred break nearest the same place, so the row takes
//      as many lines on both sides however wide the page;
//   2. measure: every line once, unwrapped, in the page-sized copy: where it may break and how wide
//      each part is. A line may break between its parts (.zs, see js/text/line-breaks.js), and in plain
//      text between any two words, which reads as a break in the middle of a phrase;
//   3. plan: arithmetic on those widths only. For each piece, the size of each column that leaves the
//      fewest rows out of step, the fewest lines broken mid-phrase and the fewest wrapped lines, shrinking
//      as little as possible (and no further than the script allows). Side by side, the share of the width
//      each column gets is chosen the same way, once for each piece;
//      Side by side, a row whose one side would wrap once where the other fits on one line is kept in step
//      by breaking the other side at its preferred break nearest the same place;
//   4. apply: the chosen sizes (and column widths) to the copy and to the print view. Side by side, every
//      line also gets a line break (<br>) where it was planned to wrap at a preferred break: a line within
//      LAYOUT.margin of its column may or may not wrap on paper (computers differ by about that much), so
//      the plan's breaks are written in rather than left to the browser, and the rows stay in step.
// A piece is set at one size per language, so its stanzas and its dhrupad always match.
import { SCRIPTS, OTHER, scriptOf, sizeOf, LAYOUT } from "./profiles.js";

export function fit(w, d, mode, pv) {
  var side = mode === "side",
    sel = side ? ["table.pvside", "td.pvm, td.pve"] : [".verse", ".verse p"],
    lines = [].slice.call(d.querySelectorAll("#pv " + sel[1].replace(", ", ", #pv "))),
    mine = pv.querySelectorAll(sel[1]),
    at = new Map(),
    fnt = d.documentElement.getAttribute("data-font") || "std";
  if (!lines.length || lines.length !== mine.length) return;
  lines.forEach(function (el, i) {
    at.set(el, mine[i]);
  });
  var groups = collect(w, d, side, sel[0]);
  if (!groups.length) return;
  if (side) match(groups, at);
  var geo = measure(w, d, groups, side, fnt);
  // side by side: each piece's share of the width for the original
  var split = {};
  if (side)
    groups.forEach(function (g) {
      split[g.sid] = chooseSplit([g], geo);
    });
  groups.forEach(function (g) {
    var shares = side ? [split[g.sid], 1 - split[g.sid]] : null,
      pick = best(g, shares, geo),
      s = pick.s;
    // side by side: each line breaks where it was planned to wrap, and where it keeps its row in step
    var brk = (pick.joins || []).slice();
    if (side)
      g.cols.forEach(function (c, k) {
        c.lines.forEach(function (ln) {
          predict(ln, width(ln, shares[k], geo), c.size * s[k]).at.forEach(function (part) {
            brk.push({ ln: ln, part: part });
          });
        });
      });
    brk
      .sort(function (x, y) {
        return y.part.ci - x.part.ci || y.part.off - x.part.off;
      })
      .forEach(function (j) {
        [j.ln.el, at.get(j.ln.el)].forEach(function (el) {
          breakBefore(el, j.part);
        });
      });
    g.cols.forEach(function (c, k) {
      var f = c.size * s[k];
      if (Math.abs(f - 1) < 0.005) return;
      c.lines.forEach(function (ln) {
        var px = ln.base * f + "px";
        ln.el.style.fontSize = px;
        at.get(ln.el).style.fontSize = px;
      });
    });
  });
  if (side)
    [d.querySelectorAll("#pv col.pvcm"), pv.querySelectorAll("col.pvcm")].forEach(function (cs) {
      [].forEach.call(cs, function (c) {
        var x = split[c.closest(".pvs").getAttribute("data-sid")];
        if (x) c.style.width = Math.round(x * 1000) / 10 + "%";
      });
    });
}

// A line break (<br>) the fitting writes in: .pvfb, so the print audit can tell it from the text's own
// breaks, and also .pvmid when it falls between two words of a phrase, so the audit counts it as a line
// broken mid-phrase
function fitBreak(d, mid) {
  var br = d.createElement("br");
  br.className = mid ? "pvfb pvmid" : "pvfb";
  return br;
}

// a line break before a part of a line (see parts)
function breakBefore(el, part) {
  var n = el.childNodes[part.ci];
  if (!n) return;
  if (n.nodeType === 3 && part.off > 0) n = n.splitText(part.off);
  el.insertBefore(fitBreak(el.ownerDocument, !part.pref), n);
}

function shown(w, el) {
  return w.getComputedStyle(el).display !== "none" && el.getClientRects().length > 0;
}

// 1. the pieces: { sid, cols: [{ lines: [{ el }] }] (one per language), rows: [[line, line]] (side by side) }
function collect(w, d, side, groupSel) {
  var out = [];
  [].forEach.call(d.querySelectorAll("#pv " + groupSel), function (g) {
    if (!shown(w, g)) return;
    if (side) {
      var o = { lines: [] },
        e = { lines: [] },
        rows = [];
      [].forEach.call(g.querySelectorAll("tr"), function (tr) {
        var a = tr.querySelector("td.pvm"),
          b = tr.querySelector("td.pve");
        if (!a || !b || !shown(w, tr)) return;
        var la = { el: a },
          lb = { el: b };
        o.lines.push(la);
        e.lines.push(lb);
        rows.push([la, lb]);
      });
      if (rows.length) out.push({ cols: [o, e], keys: ["o", "e"], rows: rows, sid: g.closest(".pvs").getAttribute("data-sid") });
    } else {
      var cols = [],
        keys = [];
      [].forEach.call(g.children, function (c) {
        if (!c.classList.contains("mr") && !c.classList.contains("en")) return;
        if (!shown(w, c)) return;
        var ls = [].filter
          .call(c.querySelectorAll("p"), function (p) {
            return shown(w, p);
          })
          .map(function (p) {
            return { el: p };
          });
        if (ls.length) {
          cols.push({ lines: ls });
          keys.push(c.classList.contains("en") ? "en" : "mr");
        }
      });
      if (cols.length) out.push({ cols: cols, keys: keys, rows: null, sid: g.closest(".pvs").getAttribute("data-sid") });
    }
  });
  // one size per language for a whole piece: its stanzas (and its dhrupad, however often it is printed)
  // match each other, so the stanzas of a piece are planned together
  var pieces = {},
    merged = [];
  out.forEach(function (g) {
    var m = pieces[g.sid];
    if (!m) {
      m = pieces[g.sid] = { cols: [], keys: [], rows: g.rows ? [] : null, sid: g.sid };
      merged.push(m);
    }
    g.keys.forEach(function (k, i) {
      var j = m.keys.indexOf(k);
      if (j < 0) {
        j = m.keys.push(k) - 1;
        m.cols.push({ lines: [] });
      }
      [].push.apply(m.cols[j].lines, g.cols[i].lines);
    });
    if (g.rows) [].push.apply(m.rows, g.rows);
  });
  return merged;
}

// 1b. Side by side: a row whose two lines have a different number of their own line breaks (<br>) gets
// the missing ones in the line that has fewer, each at the preferred break (.zs) nearest the same share of
// the line's text, if one is near enough (within LAYOUT.matchBreak of the line). The print view (pv) gets
// the same breaks as the page-sized copy, through the map from one's lines to the other's.
function match(groups, at) {
  function brs(el) {
    return [].filter.call(el.childNodes, function (n) {
      return n.nodeType === 1 && n.tagName === "BR";
    }).length;
  }
  // where each of a line's breaks falls, as a share of its text: before each <br>, or before each .zs
  function shares(el, what) {
    var all = el.textContent.length || 1,
      done = 0,
      out = [];
    [].forEach.call(el.childNodes, function (n, i) {
      if (n.nodeType === 1 && (what === "br" ? n.tagName === "BR" : n.classList.contains("zs") && done > 0)) out.push({ at: done / all, i: i });
      done += n.textContent.length;
    });
    return out;
  }
  groups.forEach(function (g) {
    g.rows.forEach(function (row) {
      var a = row[0].el,
        b = row[1].el,
        na = brs(a),
        nb = brs(b);
      if (na === nb) return;
      var more = na > nb ? a : b,
        fewer = na > nb ? b : a,
        want = shares(more, "br"),
        can = shares(fewer, "zs"),
        put = [];
      want.forEach(function (x) {
        var best = null;
        can.forEach(function (c) {
          if (put.indexOf(c.i) < 0 && Math.abs(c.at - x.at) <= LAYOUT.matchBreak && (!best || Math.abs(c.at - x.at) < Math.abs(best.at - x.at))) best = c;
        });
        if (best) put.push(best.i);
      });
      if (!put.length) return;
      [fewer, at.get(fewer)].forEach(function (el) {
        var kids = [].slice.call(el.childNodes);
        put.forEach(function (i) {
          el.insertBefore(fitBreak(el.ownerDocument, false), kids[i]);
        });
      });
    });
  });
}

// 2. every line, unwrapped: its segments (its own line breaks), each a list of parts { l, r, pref } with
// pref = a preferred place to break before this part. Side by side, also the width of the table and how
// much of each column is not text (padding, rule), to work out a column's text width for any share.
function measure(w, d, groups, side, fnt) {
  var st = d.createElement("style"),
    r = d.createRange(),
    geo = null;
  st.textContent = "#pv .verse p, #pv td.pvm, #pv td.pve { white-space: nowrap !important }";
  d.head.appendChild(st);
  groups.forEach(function (g) {
    g.cols.forEach(function (c) {
      // the column's script, from its letters (one column holds one language)
      var sc =
        SCRIPTS[
          scriptOf(
            c.lines
              .map(function (ln) {
                return ln.el.textContent;
              })
              .join("")
          )
        ] || OTHER;
      c.size = sizeOf(sc, fnt);
      c.minFit = sc.minFit;
      c.lines.forEach(function (ln) {
        var cs = w.getComputedStyle(ln.el);
        ln.base = parseFloat(cs.fontSize);
        // the part of its box that is not text: padding, and a column's rule
        ln.box = ln.el.getBoundingClientRect().width;
        ln.extra = ln.box - ln.el.clientWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        ln.segs = parts(ln.el, r);
      });
    });
    if (side && !geo) {
      var a = g.rows[0][0],
        b = g.rows[0][1];
      geo = { table: a.box + b.box };
    }
  });
  d.head.removeChild(st);
  return geo;
}

// Each part also says where it starts in the line (ci: which child node, off: where in its text), so a line
// can be broken there (step 4).
function parts(el, r) {
  var segs = [[]],
    prevZs = true; // the start of a line counts as a preferred break
  function add(rect, pref, zs, ci, off) {
    if (!rect.width) return;
    segs[segs.length - 1].push({ l: rect.left, r: rect.right, pref: pref || prevZs, ci: ci, off: off });
    prevZs = zs;
  }
  [].forEach.call(el.childNodes, function (n, ci) {
    if (n.nodeType === 1 && n.tagName === "BR") {
      segs.push([]);
      prevZs = true;
    } else if (n.nodeType === 1 && n.classList.contains("zs")) add(n.getBoundingClientRect(), true, true, ci, 0);
    else if (n.nodeType === 1) add(n.getBoundingClientRect(), false, false, ci, 0);
    else if (n.nodeType === 3) {
      var re = /\S+/g,
        m;
      while ((m = re.exec(n.data))) {
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        add(r.getBoundingClientRect(), false, false, ci, m.index);
      }
    }
  });
  return segs.filter(function (s) {
    return s.length;
  });
}

// How a line comes out at scale s (against its measured size) in a text width of W: the lines it takes
// and how many of its breaks fall in the middle of a phrase. The browser fills each line with as many
// parts as fit, so this does the same.
function predict(ln, W, s) {
  var lines = 0,
    mid = 0,
    cut = null, // where it first wraps, as a share of its width (a line of one segment)
    at = [], // the parts it wraps before (none when a part is too wide and breaks inside itself)
    inside = false,
    room = W * LAYOUT.margin;
  ln.segs.forEach(function (seg) {
    var start = seg[0].l;
    lines++;
    seg.forEach(function (p, j) {
      if ((p.r - p.l) * s > room) {
        // a part wider than the column breaks inside itself
        var n = Math.ceil(((p.r - p.l) * s) / room);
        lines += n - 1;
        mid += n - 1;
        inside = true;
      }
      if (j && (p.r - start) * s > room) {
        if (cut === null) cut = (p.l - seg[0].l) / (seg[seg.length - 1].r - seg[0].l);
        lines++;
        if (!p.pref) mid++;
        at.push(p);
        start = p.l;
      }
    });
  });
  return { lines: lines, mid: mid, segs: ln.segs.length, cut: cut, at: inside ? [] : at };
}

// Side by side, a row whose one side wraps once and whose other fits on one line: the other side's
// break nearest where the first wraps (within LAYOUT.matchBreak), to break it there too, so the row stays
// in step. A preferred break if it has one there; otherwise, when the first side itself wraps in the
// middle of a phrase (any:true), the space between two words. Returns the part to break before, or null.
function joinAt(ln, cut, any) {
  if (ln.segs.length !== 1 || cut === null) return null;
  var seg = ln.segs[0],
    w = seg[seg.length - 1].r - seg[0].l,
    pick = null;
  [true, false].forEach(function (pref) {
    if (pick || (!pref && !any)) return;
    seg.forEach(function (p, j) {
      if (!j || p.pref !== pref) return;
      var d = Math.abs((p.l - seg[0].l) / w - cut);
      if (d <= LAYOUT.matchBreak && (!pick || d < pick.d)) pick = { d: d, part: p };
    });
  });
  return pick && pick.part;
}

// The text width a line has: as laid out, or side by side, its column's share of the table
function width(ln, share, geo) {
  return (share ? share * geo.table : ln.box) - ln.extra;
}

// The scales worth trying for a column: as it is, and each scale at which one of its lines just fits
function candidates(c, share, geo) {
  var out = [1];
  c.lines.forEach(function (ln) {
    var W = width(ln, share, geo) * LAYOUT.margin;
    ln.segs.forEach(function (seg) {
      var need = (seg[seg.length - 1].r - seg[0].l) * c.size,
        s = (W / need) * 0.999;
      if (s < 1 && s >= c.minFit) out.push(s);
    });
  });
  return out;
}

// 3. the best scale for each column of a piece (shares: side by side, each column's share of the width)
function best(g, shares, geo) {
  var C = LAYOUT.cost;
  function colCost(c, k, s) {
    var W0 = shares ? shares[k] : 0,
      res = [],
      cost = (1 - s) * 100 * C.shrink;
    c.lines.forEach(function (ln) {
      var p = predict(ln, width(ln, W0, geo), c.size * s);
      res.push(p);
      cost += p.mid * C.midPhrase + (p.lines - p.segs) * C.wrap;
    });
    return { cost: cost, res: res };
  }
  var cand = g.cols.map(function (c, k) {
    return candidates(c, shares && shares[k], geo).map(function (s) {
      return { s: s, r: colCost(c, k, s) };
    });
  });
  if (!g.rows) {
    // columns stacked or alone: each on its own
    var s = cand.map(function (cs) {
      return cs.reduce(function (a, b) {
        return b.r.cost < a.r.cost ? b : a;
      }).s;
    });
    return { s: s, cost: 0 };
  }
  // side by side: the two columns together, so their rows take as many lines as each other
  var bestPick = null;
  cand[0].forEach(function (a) {
    cand[1].forEach(function (b) {
      var cost = a.r.cost + b.r.cost,
        joins = [];
      for (var i = 0; i < g.rows.length; i++) {
        var ra = a.r.res[i],
          rb = b.r.res[i];
        if (ra.lines === rb.lines) continue;
        // one side wraps once where the other fits: break the other at its matching preferred break
        var one = ra.lines < rb.lines ? 0 : 1,
          two = [ra, rb][1 - one],
          part = [ra, rb][one].lines === 1 && two.lines === 2 && two.segs === 1 && two.at.length ? joinAt(g.rows[i][one], two.cut, two.mid > 0) : null;
        if (part) {
          cost += part.pref ? C.wrap : C.midPhrase;
          joins.push({ ln: g.rows[i][one], part: part });
        } else cost += C.outOfStep;
      }
      if (!bestPick || cost < bestPick.cost - 1e-9) bestPick = { s: [a.s, b.s], cost: cost, joins: joins };
    });
  });
  return bestPick;
}

// Side by side: the original's share of the width that leaves a piece with the fewest problems
// (ties: the share nearest an even split)
function chooseSplit(groups, geo) {
  var L = LAYOUT.side,
    pick = null;
  for (var x = L.min; x <= L.max + 1e-9; x += L.step) {
    var cost = 0;
    for (var i = 0; i < groups.length; i++) cost += best(groups[i], [x, 1 - x], geo).cost;
    if (!pick || cost < pick.cost - 1e-9 || (Math.abs(cost - pick.cost) < 1e-9 && Math.abs(x - 0.5) < Math.abs(pick.x - 0.5))) pick = { x: x, cost: cost };
  }
  return pick.x;
}
