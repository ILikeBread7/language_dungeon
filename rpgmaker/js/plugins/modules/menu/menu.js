import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { takeAreYouSure } from '../message/components/utils.js';
import { ARE_YOU_SURE_IDS, AreYouSureComponent } from './components/are_you_sure.js';
import { MainMenuComponent } from './components/main_menu.js';

/**
 * @type {HideableOpenable<MainMenuComponent>}
 */
let mainMenu;

/**
 * @type {HideableOpenable<AreYouSureComponent>}
 */
let gameEnd;

/**
 * @type {import('../message/components/choices_list.js').ChoicesListComponent}
 */
let choicesList;

/**
 * @type {Object<string,import('./components/main_menu.js').MainMenuOption>}
 */
const MAIN_MENU_CHOICES = /** @type {const} */ Object.freeze({
    ITEM: { text: 'Item', explanation: 'Use and manage items' },
    FLOOR: {
        text: 'Floor',
        explanation: 'Pick up items from the floor',
        isEnabled() {
            const f = window.$f;
            return f.isFloorItem();
        }
    },
    OPTIONS: { text: 'Options', explanation: "Adjust the game's settings" },
    SAVE: { text: 'Save', explanation: 'Save your progress' },
    BACK: { text: 'Go back', explanation: 'Close this menu, and return to the game' },
    EXIT: { text: 'Exit', explanation: 'Exit the game, and return to the title screen' }
});
Object.values(MAIN_MENU_CHOICES).forEach((choice, index) => choice.id = index + 1);

const step = 10;
const mod = 100 + step;
const options = [
    {
        text: 'Always Dash',
        explanation: 'Make the character always run, without holding the run button.',
        get value() { return mapToOnOff(ConfigManager.alwaysDash); },
        setValue() {
            ConfigManager.alwaysDash = !ConfigManager.alwaysDash;
        }
    },
    {
        text: 'BGM Volume',
        explanation: 'Volume of the background music.',
        get value() { return mapToPercentage(ConfigManager.bgmVolume) },
        setNextValue() {
            ConfigManager.bgmVolume = (ConfigManager.bgmVolume + step + mod) % mod;
        },
        setPreviousValue() {
            ConfigManager.bgmVolume = (ConfigManager.bgmVolume - step + mod) % mod;
        }
    },
    {
        text: 'BGS Volume',
        explanation: 'Volume of the background sounds.',
        get value() { return mapToPercentage(ConfigManager.bgsVolume); },
        setNextValue() {
            ConfigManager.bgsVolume = (ConfigManager.bgsVolume + step + mod) % mod;
        },
        setPreviousValue() {
            ConfigManager.bgsVolume = (ConfigManager.bgsVolume - step + mod) % mod;
        }
    },
    {
        text: 'ME Volume',
        explanation: 'Volume of the musical effects.',
        get value() { return mapToPercentage(ConfigManager.meVolume); },
        setNextValue() {
            ConfigManager.meVolume = (ConfigManager.meVolume + step + mod) % mod;
        },
        setPreviousValue() {
            ConfigManager.meVolume = (ConfigManager.meVolume - step + mod) % mod;
        }
    },
    {
        text: 'SE Volume',
        explanation: 'Volume of the sound effects.',
        get value() { return mapToPercentage(ConfigManager.seVolume); },
        setNextValue() {
            ConfigManager.seVolume = (ConfigManager.seVolume + step + mod) % mod;
        },
        setPreviousValue() {
            ConfigManager.seVolume = (ConfigManager.seVolume - step + mod ) % mod;
        }
    },
    {
        text: 'Go back',
        explanation: 'Save changes, and go back to the game.',
        goBack: true
    }
];

/**
 * 
 * @param {HTMLElement} [container] 
 */
export function initializeMainMenu(container = document.body) {
    MainMenuComponent.register();
    mainMenu = new HideableOpenable(new MainMenuComponent());
    mainMenu.element.mainMenuSetOptions(Object.values(MAIN_MENU_CHOICES));

    AreYouSureComponent.register();
    gameEnd = new HideableOpenable(new AreYouSureComponent());
    gameEnd.topElement.classList.add('vertical-center');

    container.append(
        mainMenu.topElement,
        gameEnd.topElement
    );
}

Scene_Menu.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    const gameTemp = window.$gameTemp;
    const f = window.$f;
    choicesList = mainMenu.element.choicesList;

    mainMenu.showAndOpen();
    mainMenu.element.mainMenuTakeChoice().then(choice => {
        mainMenu.closeAndHide();

        if (choice.cancelled || choice.id === MAIN_MENU_CHOICES.BACK.id) {
            this.popScene();
            return;
        }
        
        switch(choice.id) {
            case MAIN_MENU_CHOICES.EXIT.id:
                SceneManager.push(Scene_GameEnd);
            break;
            case MAIN_MENU_CHOICES.ITEM.id:
                SceneManager.push(Scene_Item);
            break;
            case MAIN_MENU_CHOICES.FLOOR.id:
                this.popScene();
                f.triggerFloorItemEvents();
            break;
            case MAIN_MENU_CHOICES.OPTIONS.id:
                SceneManager.push(Scene_Options);
            break;
            case MAIN_MENU_CHOICES.SAVE.id:
                SceneManager.push(Scene_Save);
            break;
        }
    });
}

Scene_GameEnd.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    choicesList = gameEnd.element.choicesList;

    takeAreYouSure(gameEnd, {
        explanation: /*html*/`Are you sure you want to exit the game and return to the title screen?<br>All unsaved progress will be lost.`,
        choices: [
            { text: 'Return to title', id: ARE_YOU_SURE_IDS.YES },
            { text: 'Cancel', id: ARE_YOU_SURE_IDS.NO }
        ]
    }).then(playerChoice => {
        if (playerChoice.id === ARE_YOU_SURE_IDS.YES) {
            this.fadeOutAll();
            SceneManager.goto(Scene_Title);
        } else {
            this.popScene();
        }
    });
}

for (const scene of [
        Scene_Menu,
        Scene_GameEnd,
        Scene_Options
]) {
    const _scene_update = scene.prototype.update;
    scene.prototype.update = function() {
        _scene_update.call(this);
        handleMenuInputs(scene);
    }

    scene.prototype.create = Scene_MenuBase.prototype.create;
    scene.prototype.stop = Scene_MenuBase.prototype.stop;
}

function handleMenuInputs(scene) {
    const input = window.Input;
    const touchInput = window.TouchInput;

    if (input.isTriggered('up')) {
        choicesList.choicesListSelectPreviousOption();
    } else if (input.isTriggered('down')) {
        choicesList.choicesListSelectNextOption();
    } else if (input.isTriggered('ok')) {
        choicesList.choicesListConfirmCurrentOption();
    } else if (input.isTriggered('cancel') || touchInput.isCancelled()) {
        choicesList.choicesListCancel();
    } else if (scene === Scene_Options) {
        if (input.isTriggered('right')) {
            // mainMenu.mainMenuSetNextValue();
        } else if (input.isTriggered('left')) {
            // mainMenu.mainMenuSetPreviousValue();
        }
    }
    
}