window.copyClipboardText = function (text) {
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(() => true);
    }
    const previousFocus = document.activeElement;
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    input.remove();
    if (previousFocus) previousFocus.focus();
    if (!copied) window.prompt('请手动复制以下文本 / Copy this text:', text);
    return Promise.resolve(copied);
};
