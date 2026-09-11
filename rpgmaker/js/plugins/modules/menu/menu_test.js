import { SCROLLABLE_LIST_EVENTS, ScrollableListComponent } from '../common/components/scrollable_list_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { SelectableChoicesList } from '../common/helpers/selectable_choices_list.js';
import { SelectableScrollableList } from '../common/helpers/selectable_scrollable_list.js';
import { CHOICES_LIST_EVENTS } from '../message/components/choices_list.js';
import { addChoiceIds, takeAreYouSure } from '../message/components/utils.js';
import { ARE_YOU_SURE_IDS, AreYouSureComponent } from './components/are_you_sure.js';
import { ItemsMenuComponent } from './components/items_menu.js';
import { MainMenuComponent } from './components/main_menu.js';
import { INPUT_TYPE, OptionsMenuComponent } from './components/options_menu.js';
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
 * @type {import('../common/helpers/selectable_interface.js').SelectableInterface}
 */
let selectable;

const tests = {
    async menu() {
        selectable = new SelectableChoicesList(mainMenu.element.choicesList);
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
        selectable =  new SelectableChoicesList(areYouSure.element.choicesList);
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
        selectable =  new SelectableScrollableList(items.choicesList);

        // for (const eventName of [ ...Object.values(CHOICES_LIST_EVENTS), ...Object.values(SCROLLABLE_LIST_EVENTS) ]) {
        //     items.choicesList.addEventListener(eventName, event => {
        //         console.log(eventName, event.detail);
        //     });
        // }

        for (const list of [ items._listWithExplanation.choicesList, items._itemUseDialog.element.choicesList ]) {
            list.addEventListener(CHOICES_LIST_EVENTS.ACTIVATED, () => {
                console.log('activated', list)
                selectable = (list instanceof ScrollableListComponent)
                    ? new SelectableScrollableList(list)
                    : new SelectableChoicesList(list);
            });
        }
    },

    async options() {
        selectable =  new SelectableChoicesList(optionsMenu.choicesList);
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
                input: { type: INPUT_TYPE.RADIO, values: [ { value: true, text: 'ON'}, { value: false, text: 'OFF'} ] },
                get value() { return ConfigManager.alwaysDash; },
                set value(val) { ConfigManager.alwaysDash = val; }
            },
            {
                text: 'BGM Volume',
                explanation: 'Volume of the background music.',
                input: { type: INPUT_TYPE.SLIDER, min: 0, max: 100, step: 10 },
                get value() { return ConfigManager.bgmVolume },
                set value(val) { ConfigManager.bgmVolume = val }
            },
            {
                text: 'BGS Volume',
                explanation: 'Volume of the background sounds.',
                input: { type: INPUT_TYPE.SLIDER, min: 0, max: 100, step: 10 },
                get value() { return ConfigManager.bgsVolume },
                set value(val) { ConfigManager.bgsVolume = val }
            },
            {
                text: 'ME Volume',
                explanation: 'Volume of the musical effects.',
                input: { type: INPUT_TYPE.SLIDER, min: 0, max: 100, step: 10 },
                get value() { return ConfigManager.meVolume },
                set value(val) { ConfigManager.meVolume = val }
            },
            {
                text: 'SE Volume',
                explanation: 'Volume of the sound effects.',
                input: { type: INPUT_TYPE.SLIDER, min: 0, max: 100, step: 10 },
                get value() { return ConfigManager.seVolume },
                set value(val) { ConfigManager.seVolume = val }
            },
            {
                text: 'Go back',
                explanation: 'Save changes, and go back to the game.',
                input: { type: INPUT_TYPE.BACK }
            }
        ];

        optionsMenu.optionsMenuSetOptions(options);
        optionsMenuHideableOpenable.showAndOpen();
        await optionsMenu.optionsMenuStart();
        ConfigManager.save();
        await optionsMenuHideableOpenable.closeAndHide();
    },

    async title() {
        selectable =  new SelectableChoicesList(title.choicesList);
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
                selectable =  new SelectableChoicesList(areYouSure.element.choicesList);
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
                    selectable =  new SelectableChoicesList(title.choicesList);
                    titleMenu.showAndOpen();
                }
            }
        } while(!choice.cancelled);
        if (titleMenu.hideable.hideableIsShown) {
            titleMenu.closeAndHide();
        }
    }
};
tests.options();

const keyActionMap = new Map([
    [ 'ArrowDown', () => selectable.selectDown() ],
    [ 'ArrowUp', () => selectable.selectUp() ],
    [ 'Enter', () => selectable.confirmCurrent() ],
    [ 'Escape', () => selectable.cancel() ],
    [ 'ArrowRight', () => selectable.selectRight()],
    [ 'ArrowLeft', () => selectable.selectLeft()]
]);
document.addEventListener('keydown', event => {
    const action = keyActionMap.get(event.key);
    if (action) {
        action();
    }
});