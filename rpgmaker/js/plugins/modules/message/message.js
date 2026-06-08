import { MessageBox } from './components/message_box.js';

const messageBoxStyle = document.createElement('style');
let messageBox = null;

export function addMessageBox() {
    MessageBox.register();
    messageBox = new MessageBox();
    messageBox.shadowRoot.getElementById('message-box').style.setProperty('z-index', 999);
    messageBox.shadowRoot.appendChild(messageBoxStyle);
    document.body.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('margin', '0px');
    document.body.appendChild(messageBox);
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