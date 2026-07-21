import { MainMenu } from './components/main_menu.js';

/**
 * @type {MainMenu}
 */
let mainMenu;

export function initializeMainMenu() {
    MainMenu.register();
    mainMenu = new MainMenu();
    Object.assign(mainMenu.style, {
        position: 'absolute',
        width: '100%',
        height: '100%'
    });
    mainMenu.style.position = 'absolute';
    document.body.appendChild(mainMenu);
}

Scene_Menu.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    mainMenu.mainMenuOpen().then(shouldExit => {
        mainMenu.mainMenuHide();
        this.popScene();
        if (shouldExit) {
            this.fadeOutAll();
            SceneManager.goto(Scene_Title);
        }
    });
}

Scene_Menu.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    mainMenu.style.zIndex = 1000;
}

const _Scene_Menu_update = Scene_Menu.prototype.update;
Scene_Menu.prototype.update = function() {
    _Scene_Menu_update.call(this);
    const input = window.Input;
    const touchInput = window.TouchInput;

    if (input.isTriggered('up')) {
        mainMenu.mainMenuSelectPreviousOption();
    } else if (input.isTriggered('down')) {
        mainMenu.mainMenuSelectNextOption();
    } else if (input.isTriggered('ok')) {
        mainMenu.mainMenuConfirmCurrentOption();
    } else if (input.isTriggered('cancel') || touchInput.isCancelled()) {
        mainMenu.mainMenuCancel();
    }
}