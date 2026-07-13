import { MainMenu } from './components/main_menu.js';

export function initializeMainMenu() {
    MainMenu.register();
    const mainMenu = new MainMenu();
    document.body.appendChild(mainMenu);
}

Scene_Menu.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
}

Scene_Menu.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
}