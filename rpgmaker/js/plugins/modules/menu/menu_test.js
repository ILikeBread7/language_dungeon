import { MainMenu } from './components/main_menu.js';

MainMenu.register();
const menu = new MainMenu();
document.body.appendChild(menu);

setTimeout(() => {
    menu.mainMenuSetOptions([
        { text: 'Test1' },
        { text: 'Test2' },
        { text: 'Test3' },
        { text: 'Test4' },
        { text: 'Test5' },
    ]);
}, 100)