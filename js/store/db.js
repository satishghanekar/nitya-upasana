// @ts-check
// IndexedDB, small: open the database with a time limit and one retry, then simple promise helpers. Safari has had
// IndexedDB bugs (early iOS 15: the first open could hang forever; private windows in older browsers refuse it), so
// when it can't be opened the app keeps its data in memory for this visit, and js/features/profiles.js shows a
// warning with "Save a backup file" (docs/architecture.md §4.2, risk R5).
// No page work here; the unit tests (tests/unit/store.test.mjs) run it in Node with fake-indexeddb.
//
// Database "nitya", version 1. Stores:
//   meta      device-wide records, by key: "meta" (active person, device settings, backup dates)
//   profiles  one record per person, by its id (js/store/profiles.js)
// A later version adds stores (texts, categories…) in onupgradeneeded, in order, as js/store/migrate.js does for
// settings.

export const DB_NAME = "nitya";
export const DB_VERSION = 1;

/**
 * @typedef {{
 *   kind: "idb" | "memory",
 *   reason: string,
 *   get(store: string, key: string): Promise<any>,
 *   all(store: string): Promise<any[]>,
 *   put(store: string, value: any, key?: string): Promise<void>,
 *   del(store: string, key: string): Promise<void>,
 *   replace(store: string, values: any[]): Promise<void>
 * }} DB
 */

/**
 * Open the database: each try waits at most `timeout` ms, and a second try follows a failed or hung first one.
 * Never rejects: when both fail, the result is a database in memory (kind "memory", with the reason).
 * @param {{ idb?: IDBFactory | null, name?: string, timeout?: number, tries?: number }} [o]
 * @returns {Promise<DB>}
 */
export function openDB(o) {
  o = o || {};
  /** @type {IDBFactory | null} */
  var idb = null;
  try {
    idb = o.idb !== undefined ? o.idb : typeof indexedDB !== "undefined" ? indexedDB : null;
  } catch (e) {}
  var name = o.name || DB_NAME,
    timeout = o.timeout || 1000,
    tries = o.tries || 2;
  if (!idb) return Promise.resolve(memoryDB("none"));
  var factory = idb;
  /** @param {number} n @returns {Promise<DB>} */
  function attempt(n) {
    return once(factory, name, timeout).then(
      function (db) {
        return wrap(db);
      },
      function (why) {
        return n + 1 < tries ? attempt(n + 1) : memoryDB(String(why));
      },
    );
  }
  return attempt(0);
}

/**
 * One try at opening
 * @param {IDBFactory} idb
 * @param {string} name
 * @param {number} timeout
 * @returns {Promise<IDBDatabase>}
 */
function once(idb, name, timeout) {
  return new Promise(function (resolve, reject) {
    var done = false,
      t = setTimeout(function () {
        done = true;
        reject("timeout");
      }, timeout);
    /** @type {IDBOpenDBRequest} */
    var rq;
    try {
      rq = idb.open(name, DB_VERSION);
    } catch (e) {
      clearTimeout(t);
      reject("open: " + ((e && /** @type {any} */ (e).name) || e));
      return;
    }
    rq.onupgradeneeded = function () {
      var db = rq.result;
      // version 1
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "id" });
    };
    rq.onsuccess = function () {
      var db = rq.result;
      if (done) {
        // it answered after the time limit: the retry has its own connection
        try {
          db.close();
        } catch (e) {}
        return;
      }
      done = true;
      clearTimeout(t);
      // another tab with a newer version asks to upgrade: let it
      db.onversionchange = function () {
        db.close();
      };
      resolve(db);
    };
    rq.onerror = function () {
      if (done) return;
      done = true;
      clearTimeout(t);
      reject("error: " + ((rq.error && rq.error.name) || "unknown"));
    };
    rq.onblocked = function () {
      // an older connection (another tab) is open; wait for it within the time limit
    };
  });
}

/**
 * @param {IDBDatabase} db
 * @returns {DB}
 */
function wrap(db) {
  /**
   * @param {string} store
   * @param {IDBTransactionMode} mode
   * @param {(s: IDBObjectStore) => IDBRequest | void} fn
   * @returns {Promise<any>}
   */
  function run(store, mode, fn) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(store, mode),
          rq = fn(tx.objectStore(store));
        tx.oncomplete = function () {
          resolve(rq ? rq.result : undefined);
        };
        tx.onerror = tx.onabort = function () {
          reject(tx.error || "aborted");
        };
      } catch (e) {
        reject(e);
      }
    });
  }
  return {
    kind: "idb",
    reason: "",
    get: function (store, key) {
      return run(store, "readonly", function (s) {
        return s.get(key);
      });
    },
    all: function (store) {
      return run(store, "readonly", function (s) {
        return s.getAll();
      });
    },
    put: function (store, value, key) {
      return run(store, "readwrite", function (s) {
        return key === undefined ? s.put(value) : s.put(value, key);
      });
    },
    del: function (store, key) {
      return run(store, "readwrite", function (s) {
        return s.delete(key);
      });
    },
    // every record of a store replaced at once (a restore), in one transaction: all or nothing
    replace: function (store, values) {
      return run(store, "readwrite", function (s) {
        s.clear();
        values.forEach(function (v) {
          s.put(v);
        });
      });
    },
  };
}

/**
 * The stand-in when IndexedDB can't be used: the same helpers, kept in memory for this visit only
 * @param {string} reason
 * @returns {DB}
 */
export function memoryDB(reason) {
  /** @type {Record<string, Map<string, any>>} */
  var m = { meta: new Map(), profiles: new Map() };
  /** @param {string} s */
  function st(s) {
    return m[s] || (m[s] = new Map());
  }
  /** @param {any} v */
  function copy(v) {
    return v === undefined ? v : JSON.parse(JSON.stringify(v));
  }
  return {
    kind: "memory",
    reason: reason,
    get: function (store, key) {
      return Promise.resolve(copy(st(store).get(key)));
    },
    all: function (store) {
      return Promise.resolve(Array.from(st(store).values()).map(copy));
    },
    put: function (store, value, key) {
      st(store).set(key === undefined ? value.id : key, copy(value));
      return Promise.resolve();
    },
    del: function (store, key) {
      st(store).delete(key);
      return Promise.resolve();
    },
    replace: function (store, values) {
      st(store).clear();
      values.forEach(function (v) {
        st(store).set(v.id, copy(v));
      });
      return Promise.resolve();
    },
  };
}
