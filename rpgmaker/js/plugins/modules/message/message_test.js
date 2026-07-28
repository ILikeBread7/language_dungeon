import { HideableComponent } from '../common/components/hideable_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { OpenableComponent } from '../common/components/openable_component.js';
import { ChoicesListComponent } from './components/choices_list.js';
import { MessageBox } from './components/message_box.js';
import { takeOneChoice } from './components/utils.js';

MessageBox.register();
ChoicesListComponent.register();
OpenableComponent.register();
HideableComponent.register();

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
    box.messageBoxInput();
});

const options = [];
for (let i = 1; i <= 5; i++) {
    options.push({ text: `Option: ${i}`, enabled: i % 2 === 0, visible: i % 3 !== 0, cssClass: ' test  qqqq '  });
}

const choicesList = new HideableOpenable(new ChoicesListComponent());
choicesList.topComponent.classList.add('centered', 'with-message-box', 'half-screen');
document.body.appendChild(choicesList.topComponent);

(async () => {
    choicesList.hideable.hideableShow();
    choicesList.element.choicesListSetChoices(options);
    choicesList.element.choicesListActivate();
    choicesList.element.choicesListSelectNextOption();
    choicesList.openable.openableOpen();
    let choice;
    do {
        choice = await choicesList.element.choicesListTakeChoice();
        console.log(choice);
    } while (!choice.cancelled);
    choicesList.element.choicesListDeactivate();
    await choicesList.openable.openableClose();
    choicesList.hideable.hideableHide();

    setTimeout(async () => {
        console.log(await takeOneChoice(choicesList, options, 3));
    }, 500);
})();

document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'ArrowDown':
            choicesList.element.choicesListSelectNextOption();
            break;
        case 'ArrowUp':
            choicesList.element.choicesListSelectPreviousOption();
            break;
        case 'Enter':
            choicesList.element.choicesListConfirmCurrentOption();
            break;
        case 'Escape':
            choicesList.element.choicesListCancel();
    }
})