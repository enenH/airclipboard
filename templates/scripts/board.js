NProgress.configure({showSpinner: false});

const version = 'v2.3.1-http';

function boardAPI(id) {
    return AirClipboard.api('/boardapi/' + encodeURIComponent(board) + (id ? '/' + encodeURIComponent(id) : ''));
}

async function downloadMessage(message) {
    const response = await fetch(boardAPI(message.id));
    if (!response.ok) throw new Error('Download failed: ' + response.status);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = message.fileName || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}


window.collapsed = false

let isSmallScreen = false;

const contentData = {
    small: `
        <div class="airdrop">
        <div style="width: 145px; text-align: center">
            <div id="self-display" class="column-center">
                <svg class="icon logo">
                    <use xlink:href="#wifi-tethering"/>
                </svg>
                <div id="displayName" placeholder="文件传输" data-i18n-placeholder="file-transfer"></div>
                <div class="font-body2" data-i18n="tip2">同网络设备可自动发现</div>
                <div id="qrcode"></div>
            </div>
        </div>
        <div style="flex: 1">
            <x-peers class="center"></x-peers>
            <x-no-peers>
                <h3 data-i18n="no-peers">在其他设备上打开当前页面或扫描左侧二维码</h3>
            </x-no-peers>
            <x-instructions class="center" desktop="点击发送文件或右键点击发送消息"
                            mobile="轻触发送文件或长按发送消息"></x-instructions>
        </div>
    </div>
    <div class="clipboard">
        <div style="display: flex; align-items: center;">
            <h2 class="mt-3" data-i18n="clipboard">隔空剪贴板</h2>
            <span class="font-body3"
                  style="margin-left: 10px; font-weight: bold; background-color: var(--primary-color); padding: 2px; border-radius: 5px;">
        <input id="board-input" type="text" value="${board}" class="board-input" onkeydown="handleKeyDown(event)"
               onblur="handleBlur()"/>
        </span>
            <div class="tooltip-icon" id="tooltip-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z"
                          fill="red"/>
                </svg>
            </div>
        </div>
        <div class="input-container">
        <textarea id="messageInput"
                  placeholder="不同网络设备间传输文本、图片和文件，复制粘贴在这里！或者在此处编辑文本, 按 Shift+Enter 换行, 按 Enter 即可自动添加记录。"
                  data-i18n-placeholder="message-input"></textarea>
        </div>
        <div>
            <button id="sendButton" class="btn btn-primary" data-i18n="send" style="width: 100px">发送</button>
            <button id="uploadButton" type="button" class="btn btn-secondary" data-i18n="upload-file">上传文件</button>
            <input id="fileInput" type="file" multiple hidden>
        </div>
        <span style="color: red; font-size: 12px;"
              data-i18n="declaration">声明：请勿在此传输涉及重要机密或个人隐私的信息。如造成信息泄露、丢失或其他任何后果，AirClipboard 概不承担责任！
        </span>
        <div style="display: flex; align-items: center;">
            <h2 class="mt-3" data-i18n="history">剪贴板历史</h2>
            <span id="countdown" class="countdown"></span>
        </div>
        <div>
            <ul id="messages" class="messages"></ul>
        </div>
    </div>

    <div style="margin-bottom: 2rem;">
        <p style="text-align: center; font-size: 10px;">
            Powered by <a target="_blank" href="https://github.com/r0n9/airclipboard">AirClipboard</a>
            ${version}
        </p>
    </div>
    `,
    large: `
    <div class="snapdrop-body">
        <!-- Peers -->
        <x-peers class="center"></x-peers>
        <x-no-peers>
            <h2 data-i18n="no-peers">在其他设备上打开当前页面\n或扫描左侧二维码</h2>
        </x-no-peers>
        <x-instructions desktop="Click to send files or right click to send a message" mobile="Tap to send files or long tap to send a message">
        </x-instructions>
        <!-- Footer -->
        <footer class="column">
            <svg class="icon logo" style="--icon-size: 80px">
                <use xlink:href="#wifi-tethering" />
            </svg>
            <div id="displayName" placeholder="跨设备传输文件的最简便的方法"></div>
            <div class="font-body2" data-i18n="tip2">同一个局网线下的设备可自动发现</div>
        </footer>
    </div>
    <div id="card" class="clipboard card">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; width: 100%;">
            <div id="qrcode"></div>
            <button id="toggleButton">
                <!-- SVG 图标，点击后收缩或展开 -->
                <svg id="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M14 7l-5 5 5 5z"></path> <!-- 向左箭头 -->
                </svg>
            </button>
        </div>
        <div id="collapsed-space">
            <div style="display: flex; align-items: center;">
                <h2 class="mt-3" data-i18n="clipboard">隔空剪贴板</h2>
                <span class="font-body3" style="margin-left: 10px; font-weight: bold; background-color: var(--primary-color); padding: 2px; border-radius: 5px;">
                    <input id="board-input" type="text" value="${board}" class="board-input" onkeydown="handleKeyDown(event)" onblur="handleBlur()"/>
                </span>
                <div class="tooltip-icon" id="tooltip-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z"
                              fill="red"/>
                    </svg>
                </div>
            </div>
            <div class="input-container">
                <textarea id="messageInput"
                      placeholder="不同网络设备间传输文本、图片和文件，复制粘贴在这里！或者在此处编辑文本, 按 Shift+Enter 换行, 按 Enter 即可自动添加记录。"
                      data-i18n-placeholder="message-input"></textarea>
            </div>
            <div>
                <button id="sendButton" class="btn btn-primary" data-i18n="send" style="width: 100px">发送</button>
            <button id="uploadButton" type="button" class="btn btn-secondary" data-i18n="upload-file">上传文件</button>
            <input id="fileInput" type="file" multiple hidden>
            </div>
            <span style="color: red; font-size: 12px;"
                  data-i18n="declaration">声明：请勿在此传输涉及重要机密或个人隐私的信息。如造成信息泄露、丢失或其他任何后果，AirClipboard 概不承担责任！
            </span>
            <div style="display: flex; align-items: center;">
                <h2 class="mt-3" data-i18n="history">剪贴板历史</h2>
                <span id="countdown" class="countdown"></span>
            </div>
            <div>
                <ul id="messages" class="messages"></ul>
            </div>

            <div style="margin-bottom: 2rem;">
                <p style="text-align: center; font-size: 10px;">
                    Powered by <a target="_blank" href="https://github.com/r0n9/airclipboard">AirClipboard</a>
                    ${version}
                </p>
            </div>
        </div>
    </div>
    `
};

updateContent();

function addMessageInputListener(event) {

    document.getElementById('messageInput').addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addMessage();
        }
    });

    document.getElementById("sendButton").addEventListener("click", addMessage);
    document.getElementById('uploadButton').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', async event => {
        for (const file of event.target.files) await uploadFile(file);
        event.target.value = '';
    });

    document.getElementById('messageInput').addEventListener('paste', function (event) {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        const maxSize = 20 * 1024 * 1024; // 20MB

        const handleFile = file => uploadFile(file);

        const handleText = (item) => {
            item.getAsString((text) => {
                if (new Blob([text]).size > maxSize) {
                    alert('The text size exceeds the 20MB limit.');
                    return;
                }
                sendMessage(text);
            });
        };

        for (const item of items) {
            // alert(`item.kind: ${item.kind} item.type: ${item.type}`);
            // if (item.kind === 'file' && item.type.startsWith('image/')) {
            if (item.kind === 'file') {
                handleFile(item.getAsFile());
                event.preventDefault();
            } else if (item.kind === 'string' && item.type === 'text/plain') {
                handleText(item);
                event.preventDefault();
            }
        }
    });

    if (document.getElementById('toggleButton')) {
        document.getElementById('toggleButton').addEventListener('click', function () {
            const card = document.getElementById('card');
            // 切换卡片的收缩状态
            card.classList.toggle('collapsed');

            const collapsedSpace = document.getElementById('collapsed-space');
            if (window.collapsed) {
                collapsedSpace.style.display = 'block';
                window.collapsed = false;
                // 更改为向左箭头
                const icon = document.getElementById('icon');
                icon.innerHTML = '<path d="M14 7l-5 5 5 5z"></path>'; // 向左箭头
            } else {
                collapsedSpace.style.display = 'none';
                window.collapsed = true;
                // 更改为向右箭头
                const icon = document.getElementById('icon');
                icon.innerHTML = '<path d="M10 7l5 5-5 5z"></path>'; // 向右箭头
            }
        });
    }
}

function uploadFile(file) {
    if (!file || file.size > 20 * 1024 * 1024) {
        alert('文件不能超过 20MB / Maximum file size: 20MB');
        return Promise.resolve();
    }
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = async () => {
            const result = String(reader.result).replace(/^data:;base64,/, 'data:application/octet-stream;base64,');
            await sendMessage(`${file.name}#${result}`);
            resolve();
        };
        reader.onerror = () => { alert('无法读取文件 / Cannot read file'); resolve(); };
        reader.readAsDataURL(file);
    });
}

function fetchMessages() {
    NProgress.start();
    fetch(boardAPI())
        .then(response => response.json())
        .then(data => {
            if (data.code == 200) {
                updateCountdown(data.data.expireAt)
                const messages = data.data.messages;
                const messageList = document.getElementById('messages');
                messageList.innerHTML = '';  // 清空现有的消息

                if (messages && messages.length == 0) {
                    const card = document.getElementById('card');
                    if (card) {
                        card.style.width = '26%';
                        card.style.backgroundColor = 'var(--bg-color-card)';
                    }
                    const messageList = document.getElementById('messages');
                    const alertMessage = document.createElement('div');
                    alertMessage.className = 'alert alert-primary';
                    if (language == 'zh') {
                        alertMessage.innerText = '暂无内容';
                    } else {
                        alertMessage.innerText = 'No items now';
                    }
                    alertMessage.setAttribute("data-i18n", "no-messages");
                    alertMessage.style = 'margin-top: 10px;';
                    alertMessage.id = 'alert-message';
                    messageList.appendChild(alertMessage);
                } else {
                    const card = document.getElementById('card');
                    if (card) {
                        card.style.width = '70%';
                        card.style.backgroundColor = 'var(--bg-color)';
                    }
                    messages.forEach(message => {
                        appendMessage(message, false);
                    });
                }
            } else {
                console.error('Error fetching messages:', data);
                alert(data.message);
                if (board !== 'public') window.location.href = AirClipboard.boardURL('public');
            }
        })
        .catch(error => console.error('Error fetching messages:', error))
        .finally(() => {
            // Complete the progress bar
            NProgress.done();
        });
}

async function addMessage() {
    const input = document.getElementById('messageInput');
    const button = document.getElementById('sendButton');
    const submittedValue = input.value;
    const messageText = submittedValue.trim();
    if (!messageText || button.disabled) return;

    button.disabled = true;
    try {
        const sent = await sendMessage(messageText);
        if (sent && input.value === submittedValue) {
            input.value = '';
        }
    } finally {
        button.disabled = false;
    }
}

function sendMessage(content) {
    NProgress.start();
    return fetch(boardAPI(), {
        method: 'POST', headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify({content: content})
    }).then(response => response.json())
        .then(data => {
            if (data.code == 200 && data.data.messages && data.data.messages.length > 0) {
                const card = document.getElementById('card');
                if (card) {
                    card.style.width = '70%';
                    card.style.backgroundColor = 'var(--bg-color)';
                }
                updateCountdown(data.data.expireAt)
                fetchMessages();

                if (language == 'zh') {
                    Events.fire('notify-user', '剪贴板记录添加成功');
                } else {
                    Events.fire('notify-user', 'Clipboard record added successfully');
                }
                return true;
            } else {
                console.error('Error adding message:', data);
                alert(data.message);
                return false;
            }
        })
        .catch(error => {
            console.error('Error adding message:', error);
            alert('Error adding message: ' + error);
            return false;
        })
        .finally(() => {
            // Complete the progress bar
            NProgress.done();
        });
}

function appendMessage(message, appendMessageToFirst) {
    // messageList 中如果有div的Element，全部删除
    const alertEle = document.getElementById('alert-message');
    if (alertEle != null) {
        alertEle.remove();
    }

    const messageList = document.getElementById('messages');
    const newMessage = document.createElement('li');
    newMessage.setAttribute('data-id', message.id);

    // console.log("message.content: " + message.content);

    const isFile = message.isFile;

    if (isFile && message.fileType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = boardAPI(message.id);
        newMessage.appendChild(img);

        img.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.classList.add('overlay');

            const largeImage = document.createElement('img');
            largeImage.src = img.src;
            largeImage.classList.add('expanded');

            overlay.appendChild(largeImage);
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.classList.add('active');
            }, 10);

            overlay.addEventListener('click', () => {
                overlay.classList.remove('active');
                largeImage.classList.remove('expanded');
                setTimeout(() => overlay.remove(), 300);
            });
        });

    } else if (isFile) {
        // 其他文件
        const filenameDisplay = document.createElement('a');
        filenameDisplay.href = boardAPI(message.id) + '?download=1';
        filenameDisplay.innerText = message.fileName;
        filenameDisplay.download = message.fileName;
        filenameDisplay.addEventListener('click', event => {
            event.preventDefault();
            downloadMessage(message).catch(error => alert(error.message));
        });
        newMessage.appendChild(filenameDisplay);
    } else {
        if (isValidURL(message.content)) {
            const link = document.createElement('a');
            link.href = message.content;
            link.textContent = message.content;
            link.target = '_blank';
            newMessage.appendChild(link);
        } else {
            newMessage.textContent = message.content;
        }
    }

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'buttons';

    if (!message.isFile || (message.fileType === 'image/png' && window.isSecureContext && window.ClipboardItem && navigator.clipboard?.write)) {
        const copyButton = document.createElement('button');
        copyButton.className = 'btn btn-primary btn-sm';
        copyButton.title = "复制";
        copyButton.setAttribute("aria-label", "复制");
        const copyIcon = document.createElement('i');
        copyIcon.className = 'iconfont icon-copy';
        copyButton.addEventListener('click', () => copyToClipboard(message));
        copyButton.appendChild(copyIcon);
        buttonsDiv.appendChild(copyButton);
    }

    if (message.isFile) {
        const download = document.createElement('a');
        download.className = 'btn btn-primary btn-sm';
        download.textContent = language === 'zh' ? '下载' : 'Download';
        download.href = boardAPI(message.id) + '?download=1';
        download.download = message.fileName;
        download.addEventListener('click', event => {
            event.preventDefault();
            downloadMessage(message).catch(error => alert(error.message));
        });
        buttonsDiv.appendChild(download);
    }

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-secondary btn-sm';
    deleteButton.title = "删除";
    deleteButton.setAttribute("aria-label", "删除");
    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'iconfont icon-remove';
    deleteButton.addEventListener('click', () => deleteMessage(message.id, newMessage));
    deleteButton.appendChild(deleteIcon);
    buttonsDiv.appendChild(deleteButton);

    newMessage.appendChild(buttonsDiv);

    if (appendMessageToFirst) {
        messageList.insertBefore(newMessage, messageList.firstChild);
    } else {
        messageList.appendChild(newMessage);
    }

    // 保证 messageList 最多只保留前面 5 条
    while (messageList.children.length > 5) {
        messageList.removeChild(messageList.lastChild);
    }
}

function copyToClipboard(message) {
    if (message.isFile && message.fileType == 'image/png') {
        const url = boardAPI(message.id)
        fetch(url).then(res => {
            if (!res.ok) {
                throw new Error(`Network response was not ok: ${res.statusText}`);
            }
            return res.blob();
        }).then(blob => {
            const item = new ClipboardItem({'image/png': blob});
            navigator.clipboard.write([item]).then(() => {
                if (language == 'zh') {
                    Events.fire('notify-user', '已复制到剪贴板');
                } else {
                    Events.fire('notify-user', 'Copied to clipboard');
                }
            }).catch(error => {
                console.error('Error copying to clipboard:', error);
            });
        }).catch(error => {
            console.error('Failed to get messege:', error);
        });
    } else if (!message.isFile) {
        copyClipboardText(message.content).then(copied => {
            if (copied) Events.fire('notify-user', language === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
        }).catch(error => console.error('Copy failed:', error));
    } else {
        if (language == 'zh') {
            Events.fire('notify-user', '不支持的文件格式');
        } else {
            Events.fire('notify-user', 'Not supported');
        }
    }
}

function isValidURL(str) {
    const pattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
    return pattern.test(str);
}

function copyUrlToClipboard() {
    const urlText = document.getElementById('url').innerText;
    copyClipboardText(urlText).then(function () {
        if (language == 'zh') {
            Events.fire('notify-user', '已复制到剪贴板');
        } else {
            Events.fire('notify-user', 'Copied to clipboard');
        }
    }, function (err) {
        console.error('无法复制内容：', err);
    });
}

function deleteMessage(id, messageElement) {
    NProgress.start();
    fetch(boardAPI(id), {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.code == 200) {
                messageElement.remove();

                if (data.data.messages && data.data.messages.length == 0) {
                    const card = document.getElementById('card');
                    if (card) {
                        card.style.width = '26%';
                        card.style.minWidth = '400px';
                        card.style.backgroundColor = 'var(--bg-color-card)';
                    }
                    const messageList = document.getElementById('messages');
                    messageList.innerHTML = '';  // 清空现有的消息
                    const alertMessage = document.createElement('div');
                    alertMessage.className = 'alert alert-primary';
                    if (language == 'zh') {
                        alertMessage.innerText = '暂无内容';
                    } else {
                        alertMessage.innerText = 'No items now';
                    }
                    alertMessage.setAttribute("data-i18n", "no-messages");
                    alertMessage.style = 'margin-top: 10px;';
                    alertMessage.id = 'alert-message';
                    messageList.appendChild(alertMessage);
                }

                updateCountdown(data.data.expireAt)


                if (language == 'zh') {
                    Events.fire('notify-user', '剪贴板记录删除成功');
                } else {
                    Events.fire('notify-user', 'Clipboard record deleted');
                }
            } else {
                console.error('Error deleting message:', data);
            }
        })
        .catch(error => console.error('Error deleting message:', error))
        .finally(() => {
            // Complete the progress bar
            NProgress.done();
        });
}

let translations_zh = {};
let translations_en = {};

let language = 'zh';

function loadTranslations(callback) {
    const loadJSON = (lang) => {
        return fetch(AirClipboard.asset(`css/board-${lang}.json`))
            .then(response => response.json())
            .then(data => {
                if (lang === 'en') {
                    translations_en = data;
                } else if (lang === 'zh') {
                    translations_zh = data;
                }
            })
            .catch(error => console.error(`Error loading ${lang} translation file:`, error));
    };

    Promise.all([loadJSON('en'), loadJSON('zh')])
        .then(() => {
            if (callback) {
                callback();
            }
        });
}

function switchLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (lang == 'en') {
            if (translations_en[key]) {
                el.textContent = translations_en[key];
            }
        } else {
            if (translations_zh[key]) {
                el.textContent = translations_zh[key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (lang == 'en') {
            if (translations_en[key]) {
                el.setAttribute('placeholder', translations_en[key]);
            }
        } else {
            if (translations_zh[key]) {
                el.setAttribute('placeholder', translations_zh[key]);
            }
        }
    });

    document.querySelectorAll('x-instructions').forEach(el => {
        if (lang == 'en') {
            if (translations_en["desktop-instructions"]) {
                el.setAttribute('desktop', translations_en["desktop-instructions"]);
            }
            if (translations_en["mobile-instructions"]) {
                el.setAttribute('mobile', translations_en["mobile-instructions"]);
            }
        } else {
            if (translations_zh["desktop-instructions"]) {
                el.setAttribute('desktop', translations_zh["desktop-instructions"]);
            }
            if (translations_zh["mobile-instructions"]) {
                el.setAttribute('mobile', translations_zh["mobile-instructions"]);
            }
        }
    });


}

function switchLanguageOnload(lang) {
    loadTranslations(() => {
        switchLanguage(lang);
    });
}

// 函数：更新倒计时
let interval;

function updateCountdown(expireAt) {
    // 清除之前的倒计时
    if (interval) {
        clearInterval(interval);
    }

    // 将过期时间转换为时间戳
    const expireTime = new Date(expireAt).getTime();

    // 更新倒计时的内部函数
    function countdown() {
        const now = new Date().getTime();
        const distance = expireTime - now;

        // 计算天、小时、分钟和秒
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // 补足两位数
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        const secondsStr = String(seconds).padStart(2, '0');


        // 获取倒计时显示元素
        const countdownElement = document.getElementById('countdown');// 设置提示文本
        countdownElement.title = "到期将自动清理剪切板";

        // 更新倒计时显示内容
        countdownElement.innerHTML = `
            <span class="countdown-part">${hoursStr}</span>
            <span class="countdown-separator">:</span>
            <span class="countdown-part">${minutesStr}</span>
            <span class="countdown-separator">:</span>
            <span class="countdown-part">${secondsStr}</span>
        `;

        // 如果倒计时结束，停止更新
        if (distance < 0) {
            clearInterval(interval);
            countdownElement.innerText = "已过期";
        }
    }

    // 每秒更新一次倒计时
    interval = setInterval(countdown, 1000);

    // 立即调用一次以显示初始倒计时
    countdown();
}

document.addEventListener("DOMContentLoaded", function () {
    const boardInput = document.getElementById("board-input");

    boardInput.addEventListener("click", function () {
        boardInput.select();
    });

    const tooltipIcon = document.getElementById('tooltip-icon');
    if (board === "public") {
        tooltipIcon.style.visibility = "visible";

        const tipSpan = document.createElement('span');
        tipSpan.className = 'tooltip-text';
        tipSpan.setAttribute("data-i18n", "tooltip");
        if (language == 'en') {
            tipSpan.textContent = 'This is the public clipboard space. You can customize the clipboard space in the blue box.';
        } else {
            tipSpan.textContent = '这里是公共剪贴板空间 public，您可以在蓝色框内自定义剪贴板空间。';
        }

        tooltipIcon.appendChild(tipSpan)
    } else {
        tooltipIcon.style.visibility = "hidden";
    }
});

function handleKeyDown(event) {
    if (event.key === "Enter") {
        navigateToBoard();
    }
}

function handleBlur() {
    navigateToBoard();
}

function navigateToBoard() {
    const newBoard = AirClipboard.normalizeBoard(document.getElementById('board-input').value);
    if (newBoard && newBoard !== board) location.href = AirClipboard.boardURL(newBoard);
}

function updateContent() {
    const width = window.innerWidth;
    const contentDiv = document.getElementById('content');

    if (width < 768) {
        isSmallScreen = true;
        contentDiv.innerHTML = contentData.small;
    } else {
        isSmallScreen = false
        contentDiv.innerHTML = contentData.large;
    }

    // 获取当前页面的URL
    const currentUrl = window.location.href;

    // 获取传入的Board参数
    console.log(board);
    window.board = board

    // 生成二维码并展示在页面上
    const qrcodeUrl = AirClipboard.boardURL(board);
    const qrcode = new QRCode(document.getElementById("qrcode"), {
        text: qrcodeUrl, width: 128, height: 128
    });

    addMessageInputListener();

    fetchMessages();

    window.collapsed = false;

}

function handleResize() {
    const width = window.innerWidth;

    if (width < 768 && !isSmallScreen) {
        location.reload()
    }

    if (width >= 768 && isSmallScreen) {
        location.reload()
    }
}

let resizeTimeout;

function debounce(func, delay) {
    return function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(func, delay);
    };
}

window.addEventListener('resize', debounce(handleResize, 300));

