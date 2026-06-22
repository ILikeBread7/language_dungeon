import { ChoicesList } from './components/choices_list.js';
import { MessageBox } from './components/message_box.js';
MessageBox.register();
ChoicesList.register();

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
    await box.messageBoxDisplaySingleMessage(fullText);
    await box.messageBoxDisplayText(fullText);
    await box.messageBoxDisplayText(fullText);
    await box.messageBoxHide();
}

displayText(/*html*/`Test123!!! <span style="color:green">GREEN</span> Text!!!`);
document.addEventListener('click', () => {
    console.log('click');
    box.input();
});

const choicesList = new ChoicesList();
document.body.appendChild(choicesList);
const options = [];
for (let i = 1; i <= 5; i++) {
    options.push({ text: `Option: ${i}`, enabled: i % 2 === 0, visible: i % 3 !== 0, cssClass: ' test  qqqq '  });
}

(async () => {
    const result = await choicesList.choicesListSetChoices(options);
    console.log(result);
    await choicesList.choicesListHide();
})();

document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'ArrowDown':
            choicesList.choicesListSelectNextOption();
            break;
        case 'ArrowUp':
            choicesList.choicesListSelectPreviousOption();
            break;
        case 'Enter':
            choicesList.choicesListConfirmCurrent();
            break;
        case 'Escape':
            choicesList.choicesListCancel();
    }
})