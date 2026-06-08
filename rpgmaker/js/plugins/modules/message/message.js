import { MessageBox } from './components/message_box.js';

export function addMessageBox() {
    MessageBox.register();
    const messageBox = new MessageBox();
    messageBox.shadowRoot.getElementById('message-box').style.setProperty('z-index', 999);
    document.body.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('margin', '0px');
    document.body.appendChild(messageBox);
    return messageBox;
}