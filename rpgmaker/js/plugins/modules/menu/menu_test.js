import { MainMenu } from './components/main_menu.js';

MainMenu.register();
const menu = new MainMenu();
document.body.appendChild(menu);

setTimeout(async () => {
    menu.mainMenuOpen().then(shouldExit => {
        if (shouldExit) {
            menu.mainMenuHide();
        }
    });
    setTimeout(() => menu.currentChoicesList.choicesListConfirmOption(2), 200);
}, 100)

document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'ArrowDown':
            menu.mainMenuSelectNextOption();
            break;
        case 'ArrowUp':
            menu.mainMenuSelectPreviousOption();
            break;
        case 'Enter':
            menu.mainMenuConfirmCurrentOption();
            break;
        case 'Escape':
            menu.mainMenuCancel();
        case 'ArrowRight':
            menu.mainMenuSetNextValue();
        break;
        case 'ArrowLeft':
            menu.mainMenuSetPreviousValue();
        break;
    }
})