import { MessageBox } from './components/message_box.js';

const messageBoxStyle = document.createElement('style');
/**
 * @type {MessageBox}
 */
let messageBox = null;

export function addMessageBox() {
    MessageBox.register();
    messageBox = new MessageBox();
    const boxInlineStyle = messageBox.shadowRoot.getElementById('message-box').style;
    boxInlineStyle.setProperty('z-index', 999);
    boxInlineStyle.setProperty('bottom', '0px');

    messageBox.shadowRoot.appendChild(messageBoxStyle);
    document.body.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('margin', '0px');
    document.body.appendChild(messageBox);

    window.$messageBox = {
        messageBox,
        setMessageBoxCss,
        appendMessageBoxCss
    };
    setTimeout(registerMessageBoxForRpgMaker, 1000);

    return messageBox;
}

/**
 * 
 * @param {string} css 
 */
export function setMessageBoxCss(css) {
    if (!messageBox) {
        console.warn('Message Box not added');
        return;
    }
    messageBoxStyle.innerHTML = css;
    messageBox.forceUpdateAfterCssChange();
}

/**
 * 
 * @param {string} css 
 */
export function appendMessageBoxCss(css) {
    if (!messageBox) {
        console.warn('Message Box not added');
        return;
    }
    messageBoxStyle.innerHTML += '\n' + css;
    messageBox.forceUpdateAfterCssChange();
}

// polyfill for RPG Maker MV's older nw.js version
if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = function() {
        const style = getComputedStyle(this);
        return style.display !== 'hidden' && style.visibility !== 'none' && style.opacity !== '0';
    }
}

function registerMessageBoxForRpgMaker() {
    const gameMessagePrototype = window.Game_Message.prototype;
    gameMessagePrototype.add = text => messageBox.messageBoxDisplayText(text);
}