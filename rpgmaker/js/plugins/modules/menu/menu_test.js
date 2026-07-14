import { MainMenu } from './components/main_menu.js';

MainMenu.register();
const menu = new MainMenu();
document.body.appendChild(menu);

setTimeout(async () => {
    const promise = menu.mainMenuSetOptions([
        { text: 'Test1' },
        { text: 'Test2' },
        { text: 'Test3' },
        { text: 'Test4' },
        { text: 'Test5' },
    ]);
    menu.mainMenuSelectNextOption();
    await promise;
    menu.mainMenuHide();
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
    }
})