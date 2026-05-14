import { MessageBox } from './components/message_box.js';

console.log('messagw!');
const box = new MessageBox();
document.body.appendChild(box);

async function setText(text) {
    box.messageBoxSetText(text);
    await box.messageBoxShow();
    // await box.messageBoxHide();
}

async function displayText(text) {
    await box.messageBoxShow();
    setTimeout(() => box.messageBoxDisplayImmediately(), 1000)
    await box.messageBoxDisplayText(text);
    await box.messageBoxDisplayText('\n' + text);
}

setTimeout(() => displayText(/*html*/`Test123!!! <span style="color:green">GREEN</span> Text!!!`));

