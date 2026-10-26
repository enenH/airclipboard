(() => {
    const config = window.AIRCLIPBOARD_CONFIG || {};
    if (config.httpsOnly && location.protocol === 'http:') {
        const target = new URL(location.href);
        target.protocol = 'https:';
        location.replace(target.href);
        return;
    }
    const scriptBase = new URL('../', document.currentScript.src);
    const apiBase = (config.apiBase || location.origin).replace(/\/+$/, '');
    const normalizeBoard = value => Array.from(String(value || '').trim())
        .filter(char => /[\p{L}\p{N}_-]/u.test(char)).slice(0, 6).join('');
    let stored = '';
    try { stored = localStorage.getItem('airclipboard-board') || ''; } catch (_) {}
    const pageURL = new URL(location.href);
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const generated = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
    const board = normalizeBoard(pageURL.searchParams.get('board')) || normalizeBoard(stored) || generated;
    try { localStorage.setItem('airclipboard-board', board); } catch (_) {}
    pageURL.searchParams.set('board', board);
    history.replaceState({}, '', pageURL.href);
    window.AirClipboard = {
        board,
        normalizeBoard,
        api: path => apiBase + path,
        asset: path => new URL(path, scriptBase).href,
        boardURL(value) {
            const url = new URL(location.href);
            url.searchParams.set('board', normalizeBoard(value) || board);
            url.hash = '';
            return url.href;
        },
        websocket() {
            const path = window.isRtcSupported ? '/server/webrtc' : '/server/fallback';
            const url = new URL(apiBase + path);
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            url.searchParams.set('board', board);
            return url.href;
        }
    };
    window.board = board;
})();
