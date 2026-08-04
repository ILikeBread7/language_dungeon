import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { MainMenuComponent } from './components/main_menu.js';

/**
 * @typedef {import('../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

/**
 * @type {Object<string,ChoiceListChoice>}
 */
const MAIN_MENU_CHOICES = /** @type {const} */ Object.freeze({
    ITEM: { text: 'Item', id: 1 },
    FLOOR: { text: 'Floor', id: 2 },
    OPTIONS: { text: 'Options', id: 3 },
    SAVE: { text: 'Save', id: 4 },
    EXIT: { text: 'Exit', id: 5 }
});

MainMenuComponent.register();

const mainMenu = new HideableOpenable(new MainMenuComponent());
const menu = mainMenu.element;
document.body.appendChild(mainMenu.topElement);

setTimeout(async () => {
    menu.mainMenuSetOptions(Object.values(MAIN_MENU_CHOICES));
    mainMenu.showAndOpen();

    let playerChoice;
    do {
        playerChoice = await menu.mainMenuTakeChoice();
        if (playerChoice.element) {
            playerChoice.element.removeAttribute('data-chosen');
        }
        console.log(playerChoice);
    } while (!playerChoice.cancelled && playerChoice.id !== MAIN_MENU_CHOICES.EXIT.id);
}, 100)

let choicesList = menu.choicesList;
document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'ArrowDown':
            choicesList.choicesListSelectNextOption();
            break;
        case 'ArrowUp':
            choicesList.choicesListSelectPreviousOption();
            break;
        case 'Enter':
            choicesList.choicesListConfirmCurrentOption();
            break;
        case 'Escape':
            choicesList.choicesListCancel();
        // case 'ArrowRight':
        //     choicesList.choicesListSetNextValue();
        // break;
        // case 'ArrowLeft':
        //     choicesList.choicesListSetPreviousValue();
        // break;
    }
})