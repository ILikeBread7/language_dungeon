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
    // setTimeout(() => box.messageBoxDisplayImmediately(), 1000);
    const repeatedText = [];
    for (let i = 0; i < 5; i++) {
        repeatedText.push(text);
    }
    await box.messageBoxDisplayText(repeatedText.join('\n'));
    await box.messageBoxDisplayText(repeatedText.join('\n'));
}

setTimeout(() => displayText(/*html*/`Test123!!! <hr> <span style="color:green">GREEN</span> Text!!!`));

