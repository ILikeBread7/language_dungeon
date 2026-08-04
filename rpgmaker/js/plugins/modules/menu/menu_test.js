import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { MainMenuComponent } from './components/main_menu.js';

/**
 * @type {Object<string,import('./components/main_menu.js').MainMenuOption>}
 */
const MAIN_MENU_CHOICES = /** @type {const} */ Object.freeze({
    ITEM: { text: 'Item', id: 1, explanation: 'Use and manage items' },
    FLOOR: { text: 'Floor', id: 2, explanation: 'Pick up items from the floor' },
    OPTIONS: { text: 'Options', id: 3, explanation: "Adjust the game's settings" },
    SAVE: { text: 'Save', id: 4, explanation: 'Save your progress' },
    EXIT: { text: 'Exit', id: 5, explanation: 'Close this menu, and return to the game' }
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
    await mainMenu.closeAndHide();
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