import { SCROLLABLE_LIST_EVENTS, ScrollableListComponent } from '../common/components/scrollable_list_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { CHOICES_LIST_EVENTS } from '../message/components/choices_list.js';
import { addChoiceIds, takeAreYouSure } from '../message/components/utils.js';
import { ARE_YOU_SURE_IDS, AreYouSureComponent } from './components/are_you_sure.js';
import { ItemsMenuComponent } from './components/items_menu.js';
import { MainMenuComponent } from './components/main_menu.js';
import { OptionsMenuComponent } from './components/options_menu.js';
import { TitleMenuComponent } from './components/title_menu.js';

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

ItemsMenuComponent.register();
const itemsMenu = new HideableOpenable(new ItemsMenuComponent());
const items = itemsMenu.element;

TitleMenuComponent.register();
const titleMenu = new HideableOpenable(new TitleMenuComponent());
const title = titleMenu.element;

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

    async items() {
        // items.choicesList.scrollableListSwitchToHorizontal();
        document.body.appendChild(itemsMenu.topElement);

        const itemChoices = [];
        for (let i = 1; i <= 28 * 5; i++) {
            itemChoices.push({
                // isEnabled: () => Math.random() > 0.5,
                // isVisible: () => Math.random() > 0.1,
                text: `Item ${i}`,
                explanation: `Item ${i} explanation`,
                id: i
            });
        }

        items.itemsMenuStartOpenFirst(itemChoices);
        itemsMenu.showAndOpen();
        choicesList = items.choicesList;

        // for (const eventName of [ ...Object.values(CHOICES_LIST_EVENTS), ...Object.values(SCROLLABLE_LIST_EVENTS) ]) {
        //     items.choicesList.addEventListener(eventName, event => {
        //         console.log(eventName, event.detail);
        //     });
        // }

        for (const list of [ items._listWithExplanation.choicesList, items._itemUseDialog.element.choicesList ]) {
            list.addEventListener(CHOICES_LIST_EVENTS.ACTIVATED, () => {
                console.log('activated', list)
                choicesList = list;
            });
        }
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
        optionsMenuHideableOpenable.showAndOpen();
        await optionsMenu.optionsMenuStart();
        ConfigManager.save();
        await optionsMenuHideableOpenable.closeAndHide();
    },

    async title() {
        choicesList = title.choicesList;
        document.body.appendChild(titleMenu.topElement);
        document.body.appendChild(areYouSure.topElement);

        /**
         * @type {Object<string,import('../message/components/choices_list.js').ChoiceListChoice>}
         */
        const choices = {
            NEW_GAME: { text: 'New game' },
            CONTINUE: { text: 'Continue' },
            OPTIONS: { text: 'Options' },
            EXIT: { text: 'Exit' }
        };
        addChoiceIds(choices);

        /**
         * @type {import('../message/components/choices_list.js').ChoiceListPlayerChoice}
         */
        let choice;
        titleMenu.showAndOpen();
        do {
            choice = await title.titleMenuTakeChoice(Object.values(choices));
            if (choice.id === choices.EXIT.id) {
                choicesList = areYouSure.element.choicesList;
                titleMenu.closeAndHide();
                areYouSure.showAndOpen();
                const playerConfirm = await areYouSure.element.areYouSureTakeChoice({
                    choices: [
                        { text: 'Exit the game', id: ARE_YOU_SURE_IDS.YES },
                        { text: 'Cancel', id: ARE_YOU_SURE_IDS.NO },
                    ],
                    explanation: 'Are you sure you want to exit the game?'
                });
                areYouSure.closeAndHide();
                if (playerConfirm.id === ARE_YOU_SURE_IDS.YES) {
                    break;
                } else {
                    choicesList = title.choicesList;
                    titleMenu.showAndOpen();
                }
            }
        } while(!choice.cancelled);
        if (titleMenu.hideable.hideableIsShown) {
            titleMenu.closeAndHide();
        }
    }
};
tests.items();

const keyActionMap = new Map([
    [ 'ArrowDown', () => choicesList.choicesListSelectNextOption() ],
    [ 'ArrowUp', () => choicesList.choicesListSelectPreviousOption() ],
    [ 'Enter', () => choicesList.choicesListConfirmCurrentOption() ],
    [ 'Escape', () => choicesList.choicesListCancel() ],
    [ 'ArrowRight', () => {
        optionsMenu.optionsMenuSetNextValue();
        if (choicesList instanceof ScrollableListComponent) {
            choicesList.scrollableListNextPage();
        } else {
            choicesList.choicesListGoToBottom();
        }
    } ],
    [ 'ArrowLeft', () => {
        optionsMenu.optionsMenuSetPreviousValue();
        if (choicesList instanceof ScrollableListComponent) {
            choicesList.scrollableListPreviousPage();
        } else {
            choicesList.choicesListGoToTop();
        }
    } ]
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