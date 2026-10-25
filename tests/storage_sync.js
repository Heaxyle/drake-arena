// Before a test reloads a page to see the game's own save survive (as it must in OBS), wait until that save has
// reached the browser. Chromium writes localStorage (and commits IndexedDB) from the page asynchronously, so a page
// reloaded at once can still read the state from before the write: on a slow machine (CI) it did, three times.
// storageSettled(page) reads the page's localStorage, then reads it again from a second page in the same context (a
// blank page of the same file:// origin, tests/storage_probe.html) until the two match; with { idb } it also waits until
// that page sees the same number of records in each of the IndexedDB stores named, e.g. the play log's.
// It fails loudly (throws) if they never match: the test would otherwise check a reload of state the browser never had.
// Setting up state is different: inject it before the page loads (an init script tied to a one-time URL token), as
// tests/tourney_layout.js does, instead of writing it and reloading.
const path = require('path');
const PROBE = 'file:///' + path.join(__dirname, 'storage_probe.html').replace(/\\/g, '/');

const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]));
// Record counts per store of one IndexedDB database: { store: count }, or null when it can't be opened
const idbCounts = ([name, stores]) => new Promise(resolve => {
    try {
        const req = indexedDB.open(name);
        req.onerror = () => resolve(null);
        req.onsuccess = () => {
            const db = req.result, out = {};
            const present = stores.filter(s => db.objectStoreNames.contains(s));
            if (!present.length) { db.close(); resolve(out); return; }
            const tx = db.transaction(present);
            present.forEach(s => { const c = tx.objectStore(s).count(); c.onsuccess = () => { out[s] = c.result; }; });
            tx.oncomplete = () => { db.close(); resolve(out); };
            tx.onerror = tx.onabort = () => { db.close(); resolve(null); };
        };
    } catch (e) { resolve(null); }
});

async function storageSettled(page, { idb = null, timeout = 10000 } = {}) {
    const want = JSON.stringify(await page.evaluate(snapshot));
    const wantIdb = idb ? JSON.stringify(await page.evaluate(idbCounts, [idb.name, idb.stores])) : null;
    const probe = await page.context().newPage();
    try {
        await probe.goto(PROBE);
        const deadline = Date.now() + timeout;
        for (;;) {
            const got = JSON.stringify(await probe.evaluate(snapshot));
            const gotIdb = idb ? JSON.stringify(await probe.evaluate(idbCounts, [idb.name, idb.stores])) : null;
            if (got === want && gotIdb === wantIdb) return;
            if (Date.now() > deadline) {
                const a = JSON.parse(want), b = JSON.parse(got), keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => a[k] !== b[k]);
                throw new Error(`storage never reached the browser in ${timeout} ms: keys ${keys.join(', ') || '(none)'}${idb && gotIdb !== wantIdb ? `; IndexedDB ${gotIdb} vs ${wantIdb}` : ''}`);
            }
            await probe.waitForTimeout(25);
        }
    } finally {
        await probe.close();
    }
}

module.exports = { storageSettled };
