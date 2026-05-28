import { MessageBox } from './components/message_box.js';

console.log('messagw!');
const box = new MessageBox();
document.body.appendChild(box);

async function displayText(text) {
    // await box.messageBoxShow();
    // setTimeout(() => box.messageBoxDisplayImmediately(), 1000);
    const repeatedText = [];
    for (let i = 0; i < 10; i++) {
        repeatedText.push(text);
    }
    const fullText = repeatedText.join('\n');
    await box.messageBoxDisplayText(fullText);
    await box.messageBoxDisplayText(fullText);
}

displayText(/*html*/`Test123!!! <span style="color:green">GREEN</span> Text!!! <span style="visibility:hidden;position:relative">should be invisible <span style="position:absolute;top:0px;left:0px">this by extension too</span> after</span> After span`);
document.addEventListener('click', () => {
    console.log('click');
    box.input();
});