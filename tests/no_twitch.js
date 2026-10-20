// Keeps the browser tests off Twitch. The page carries tmi.js inside it, so left alone it would connect to Twitch's chat
// and let live messages into a test. offTwitch(page) runs before the page:
//  - window.tmi becomes a stand-in whose Client connects to nothing; the embedded library's own `window.tmi = …` is
//    ignored. The stand-in keeps the page's chat handler, so window.__chat(user, message, extra) "types" into chat the
//    way Twitch would (ui.js uses it; the other tests call handleChatMessage directly)
//  - and should anything still open a WebSocket to Twitch, Playwright holds it: it never reaches the server
//  - an older page (main's, for comparisons) still loads tmi.js from unpkg: that request gets an empty script
function twitchStub() {
    class Client {
        constructor(opts) { this.opts = opts || {}; this.handlers = {}; window.__tmiClient = this; }
        connect() { return Promise.resolve(); }
        on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; }
    }
    const stub = { Client, client: Client };
    Object.defineProperty(window, 'tmi', { configurable: true, get: () => stub, set: () => {} });
    window.__chat = (user, message, extra) => {
        const c = window.__tmiClient;
        if (!c) throw new Error('page never created a tmi.Client');
        let ch = (c.opts.channels || ['test'])[0];
        if (!ch.startsWith('#')) ch = '#' + ch;
        const ctx = Object.assign({ username: user, 'display-name': user, color: '#8ab4f8' }, extra || {});
        (c.handlers.message || []).forEach(fn => fn(ch, ctx, message, false));
    };
}

async function offTwitch(page) {
    await page.addInitScript(twitchStub);
    await page.routeWebSocket(/twitch\.tv/, () => {});
    await page.route(/tmi(\.min)?\.js/, r => r.fulfill({ contentType: 'application/javascript', body: '' }));
}

module.exports = { offTwitch };
