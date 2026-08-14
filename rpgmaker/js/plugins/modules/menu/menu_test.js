import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { takeAreYouSure } from '../message/components/utils.js';
import { ARE_YOU_SURE_IDS, AreYouSureComponent } from './components/are_you_sure.js';
import { MainMenuComponent } from './components/main_menu.js';
import { OptionsMenuComponent } from './components/options_menu.js';

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

OptionsMenuComponent.register();
const optionsMenuHideableOpenable = new HideableOpenable(new OptionsMenuComponent());
optionsMenuHideableOpenable.topElement.classList.add('centered', 'full-width');
const optionsMenu = optionsMenuHideableOpenable.element;

AreYouSureComponent.register();
const areYouSure = new HideableOpenable(new AreYouSureComponent());
areYouSure.topElement.classList.add('centered', 'full-width');
const confirmMenu = areYouSure.element;

/**
 * @type {import('../message/components/choices_list.js').ChoicesListComponent}
 */
let choicesList;

const tests = {
    async menu() {
        choicesList = mainMenu.element.choicesList;
        document.body.appendChild(mainMenu.topElement);
        menu.mainMenuSetOptions(Object.values(MAIN_MENU_CHOICES));
        mainMenu.showAndOpen();

        let playerChoice;
        do {
            playerChoice = await menu.mainMenuTakeChoice();
            console.log(playerChoice);
        } while (!playerChoice.cancelled && playerChoice.id !== MAIN_MENU_CHOICES.EXIT.id);
        await mainMenu.closeAndHide();
    },

    async areYouSure() {
        choicesList = areYouSure.element.choicesList;
        document.body.appendChild(areYouSure.topElement);

        let playerChoice;
        do {
            playerChoice = await takeAreYouSure(areYouSure);
        } while(playerChoice.cancelled || playerChoice.id === ARE_YOU_SURE_IDS.NO);
    },

    async options() {
        choicesList = optionsMenu.choicesList;
        document.body.appendChild(optionsMenuHideableOpenable.topElement);

        const ConfigManager = globalThis.ConfigManager || {
            alwaysDash: false,
            bgmVolume: 0,
            bgsVolume: 100,
            meVolume: 100,
            seVolume: 100,
        
            save() { console.log('Config manager saved!') }
        };

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
            },
            {
                text: 'Return to title',
                cssClass: 'danger',
                explanation: 'Exit the game, and return to the title screen.',
                goBack: true,
                returnToTitle: true
            }
        ];

        optionsMenu.optionsMenuSetOptions(options);
        let choice;
        do {
            optionsMenuHideableOpenable.showAndOpen();
            choice = await optionsMenu.optionsMenuStart();
            ConfigManager.save();
            await optionsMenuHideableOpenable.closeAndHide();
        } while (choice.cancelled || !options[choice.index].returnToTitle);
    }
};
tests.areYouSure();

const keyActionMap = new Map([
    [ 'ArrowDown', () => choicesList.choicesListSelectNextOption() ],
    [ 'ArrowUp', () => choicesList.choicesListSelectPreviousOption() ],
    [ 'Enter', () => choicesList.choicesListConfirmCurrentOption() ],
    [ 'Escape', () => choicesList.choicesListCancel() ],
    [ 'ArrowRight', () => optionsMenu.optionsMenuSetNextValue() ],
    [ 'ArrowLeft', () => optionsMenu.optionsMenuSetPreviousValue() ]
]);
document.addEventListener('keydown', event => {
    const action = keyActionMap.get(event.key);
    if (action) {
        action();
    }
});

function mapToOnOff(boolValue) {
    return boolValue ? 'ON' : 'OFF';
}

function mapToPercentage(value) {
    return `${value}%`;
}