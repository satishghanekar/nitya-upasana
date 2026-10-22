// @ts-check
// The library's categories: the bundled ones from content/categories.json
// (Vedic Chant, Aarti, Stotra, Ashtak), plus what the family changed on this phone: categories they added, new names
// for any category (a bundled one can be renamed here but never deleted) and texts moved to another category.
// Pure: no page, no storage. js/store/store.js keeps the family's part (LibraryLocal) in IndexedDB (meta.library,
// per phone, for everyone on it) and in the backup file; js/features/library.js shows the result.
// Unit-tested in tests/unit/library.test.mjs.
//
// Every function returns a new LibraryLocal and leaves the one passed in as it was.

/**
 * @typedef {{ mr: string, en: string }} Name
 * @typedef {{ id: string, name: Name, order: number }} BundledCategory   one entry of content/categories.json
 * @typedef {{ id: string, name: Name, order: number }} AddedCategory      a category the family added
 * @typedef {{ added: AddedCategory[], renames: Record<string, Name>, moves: Record<string, string> }} LibraryLocal
 *   added: the family's categories; renames: category id → its name on this phone; moves: text id → category id
 * @typedef {{ id: string, name: Name, order: number, origin: "bundled" | "family", original: Name | null }} Category
 *   original: a bundled category's name from categories.json when it was renamed here, else null
 * @typedef {{ id: string, category: string }} TextRef   a text and the category library.json gives it
 * @typedef {{ category: Category, texts: string[] }} Shelf   a category and its texts, in reading order
 * @typedef {"empty" | "taken" | "full" | "missing" | "bundled"} Problem
 */

// at most this many categories of the family's own, and this many letters in a name
export const MAX_ADDED = 20;
export const NAME_MAX = 40;

/** @returns {LibraryLocal} */
export function emptyLocal() {
  return { added: [], renames: {}, moves: {} };
}

/** @param {LibraryLocal} l @returns {LibraryLocal} */
function copy(l) {
  return {
    added: l.added.map(function (a) {
      return { id: a.id, name: { mr: a.name.mr, en: a.name.en }, order: a.order };
    }),
    renames: Object.assign({}, l.renames),
    moves: Object.assign({}, l.moves),
  };
}

/**
 * One name part as typed: spaces trimmed and run together, control characters dropped, at most NAME_MAX letters
 * (letters counted as the code points they are, so a Devanagari name is never cut inside a code point)
 * @param {any} s
 */
function part(s) {
  if (typeof s !== "string") return "";
  var t = s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(t).slice(0, NAME_MAX).join("").trim();
}

/**
 * A category name as typed: { mr, en }; when only one is given, it is used for both. Null when both are empty.
 * @param {any} n
 * @returns {Name | null}
 */
export function cleanName(n) {
  if (!n || typeof n !== "object") return null;
  var mr = part(n.mr),
    en = part(n.en);
  if (!mr && !en) return null;
  return { mr: mr || en, en: en || mr };
}

/** @param {any} s */
function isId(s) {
  return typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(s);
}

/**
 * What IndexedDB or a backup file holds, checked: anything damaged or unknown is dropped, never trusted as it is.
 * @param {any} x
 * @returns {LibraryLocal}
 */
export function cleanLocal(x) {
  var out = emptyLocal();
  if (!x || typeof x !== "object") return out;
  /** @type {Record<string, boolean>} */
  var seen = {};
  (Array.isArray(x.added) ? x.added : []).forEach(function (/** @type {any} */ a) {
    if (!a || !isId(a.id) || seen[a.id] || out.added.length >= MAX_ADDED) return;
    var name = cleanName(a.name);
    if (!name) return;
    seen[a.id] = true;
    out.added.push({ id: a.id, name: name, order: typeof a.order === "number" && isFinite(a.order) ? a.order : 100 + out.added.length });
  });
  if (x.renames && typeof x.renames === "object")
    Object.keys(x.renames).forEach(function (k) {
      var name = cleanName(x.renames[k]);
      if (isId(k) && name) out.renames[k] = name;
    });
  if (x.moves && typeof x.moves === "object")
    Object.keys(x.moves).forEach(function (k) {
      if (isId(k) && isId(x.moves[k])) out.moves[k] = x.moves[k];
    });
  return out;
}

/**
 * Every category, bundled and the family's, with the names used on this phone, in order
 * @param {BundledCategory[]} bundled
 * @param {LibraryLocal} local
 * @returns {Category[]}
 */
export function categoriesOf(bundled, local) {
  /** @type {Category[]} */
  var out = bundled.map(function (b) {
    var r = local.renames[b.id];
    return { id: b.id, name: r ? { mr: r.mr, en: r.en } : { mr: b.name.mr, en: b.name.en }, order: b.order, origin: "bundled", original: r ? { mr: b.name.mr, en: b.name.en } : null };
  });
  local.added.forEach(function (a) {
    if (out.some(function (c) { return c.id === a.id; })) return;
    var r = local.renames[a.id] || a.name;
    out.push({ id: a.id, name: { mr: r.mr, en: r.en }, order: a.order, origin: "family", original: null });
  });
  return out
    .map(function (c, i) {
      return { c: c, i: i };
    })
    .sort(function (a, b) {
      return a.c.order - b.c.order || a.i - b.i;
    })
    .map(function (x) {
      return x.c;
    });
}

/**
 * The category a text is in on this phone: where the family moved it, else library.json's (a move to a category
 * that no longer exists is ignored)
 * @param {TextRef} t
 * @param {Category[]} cats
 * @param {LibraryLocal} local
 */
export function categoryOf(t, cats, local) {
  var m = local.moves[t.id];
  if (m && cats.some(function (c) { return c.id === m; })) return m;
  return t.category;
}

/**
 * The library as shelves: every category in order with its texts in reading order (empty categories included;
 * the page decides whether to show them). A text whose category is unknown goes on the first shelf.
 * @param {TextRef[]} texts  in reading order
 * @param {Category[]} cats
 * @param {LibraryLocal} local
 * @returns {Shelf[]}
 */
export function shelves(texts, cats, local) {
  /** @type {Shelf[]} */
  var out = cats.map(function (c) {
    return { category: c, texts: [] };
  });
  texts.forEach(function (t) {
    var id = categoryOf(t, cats, local),
      s = out.filter(function (x) {
        return x.category.id === id;
      })[0] || out[0];
    if (s) s.texts.push(t.id);
  });
  return out;
}

/** @param {string} s */
function key(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Why a name can't be used: "empty", or "taken" when another category already has it (in either language)
 * @param {any} name
 * @param {Category[]} cats
 * @param {string} [except]  the category being renamed
 * @returns {"empty" | "taken" | null}
 */
export function nameProblem(name, cats, except) {
  var n = cleanName(name);
  if (!n) return "empty";
  var mine = [key(n.mr), key(n.en)];
  var clash = cats.some(function (c) {
    if (c.id === except) return false;
    return mine.indexOf(key(c.name.mr)) >= 0 || mine.indexOf(key(c.name.en)) >= 0;
  });
  return clash ? "taken" : null;
}

/**
 * A readable id for a new category, from its English name ("Bhajan" → "bhajan"), different from every id in use
 * @param {Name} name
 * @param {string[]} taken
 */
export function makeId(name, taken) {
  var base =
    name.en
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30)
      .replace(/-+$/, "") || "category";
  if (!/^[a-z0-9]/.test(base)) base = "category";
  var id = base,
    n = 2;
  while (taken.indexOf(id) >= 0) id = base + "-" + n++;
  return id;
}

/**
 * Add a category of the family's own, after the others
 * @param {LibraryLocal} local
 * @param {BundledCategory[]} bundled
 * @param {any} name
 * @returns {{ ok: true, local: LibraryLocal, id: string } | { ok: false, problem: Problem }}
 */
export function addCategory(local, bundled, name) {
  if (local.added.length >= MAX_ADDED) return { ok: false, problem: "full" };
  var cats = categoriesOf(bundled, local),
    pr = nameProblem(name, cats);
  if (pr) return { ok: false, problem: pr };
  var n = /** @type {Name} */ (cleanName(name)),
    id = makeId(
      n,
      cats.map(function (c) {
        return c.id;
      }),
    ),
    order = cats.reduce(function (m, c) {
      return Math.max(m, c.order);
    }, 0) + 1,
    l = copy(local);
  l.added.push({ id: id, name: n, order: order });
  return { ok: true, local: l, id: id };
}

/**
 * Give a category another name on this phone. A bundled category given back its own name loses the rename.
 * @param {LibraryLocal} local
 * @param {BundledCategory[]} bundled
 * @param {string} id
 * @param {any} name
 * @returns {{ ok: true, local: LibraryLocal } | { ok: false, problem: Problem }}
 */
export function renameCategory(local, bundled, id, name) {
  var cats = categoriesOf(bundled, local),
    c = cats.filter(function (x) {
      return x.id === id;
    })[0];
  if (!c) return { ok: false, problem: "missing" };
  var pr = nameProblem(name, cats, id);
  if (pr) return { ok: false, problem: pr };
  var n = /** @type {Name} */ (cleanName(name)),
    l = copy(local),
    b = bundled.filter(function (x) {
      return x.id === id;
    })[0];
  if (b && b.name.mr === n.mr && b.name.en === n.en) delete l.renames[id];
  else if (!b) {
    // the family's own category: its name is kept with it
    l.added.forEach(function (a) {
      if (a.id === id) a.name = n;
    });
    delete l.renames[id];
  } else l.renames[id] = n;
  return { ok: true, local: l };
}

/**
 * A bundled category gets its name from categories.json back
 * @param {LibraryLocal} local
 * @param {string} id
 * @returns {LibraryLocal}
 */
export function resetName(local, id) {
  var l = copy(local);
  delete l.renames[id];
  return l;
}

/**
 * Delete a category of the family's own (never a bundled one). Its texts go back to their own categories.
 * @param {LibraryLocal} local
 * @param {BundledCategory[]} bundled
 * @param {string} id
 * @returns {{ ok: true, local: LibraryLocal } | { ok: false, problem: Problem }}
 */
export function removeCategory(local, bundled, id) {
  if (
    bundled.some(function (b) {
      return b.id === id;
    })
  )
    return { ok: false, problem: "bundled" };
  if (
    !local.added.some(function (a) {
      return a.id === id;
    })
  )
    return { ok: false, problem: "missing" };
  var l = copy(local);
  l.added = l.added.filter(function (a) {
    return a.id !== id;
  });
  delete l.renames[id];
  Object.keys(l.moves).forEach(function (t) {
    if (l.moves[t] === id) delete l.moves[t];
  });
  return { ok: true, local: l };
}

/**
 * Move a text to a category. Moving it back to the category library.json gives it forgets the move.
 * @param {LibraryLocal} local
 * @param {Category[]} cats
 * @param {TextRef} t
 * @param {string} to
 * @returns {{ ok: true, local: LibraryLocal } | { ok: false, problem: Problem }}
 */
export function moveText(local, cats, t, to) {
  if (
    !cats.some(function (c) {
      return c.id === to;
    })
  )
    return { ok: false, problem: "missing" };
  var l = copy(local);
  if (to === t.category) delete l.moves[t.id];
  else l.moves[t.id] = to;
  return { ok: true, local: l };
}

/**
 * How many texts each category holds
 * @param {Shelf[]} sh
 * @returns {Record<string, number>}
 */
export function counts(sh) {
  /** @type {Record<string, number>} */
  var o = {};
  sh.forEach(function (s) {
    o[s.category.id] = s.texts.length;
  });
  return o;
}
