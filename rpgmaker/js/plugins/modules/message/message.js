import { MessageBox } from './components/message_box.js';

console.log('messagw!');
const box = new MessageBox();
document.body.appendChild(box);

async function addText(text) {
    box.messageBoxSetText(text);
    await box.messageBoxShow();
    await box.messageBoxHide();
}

setTimeout(() => addText('Test123!!!'), 1000)

