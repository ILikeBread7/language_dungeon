import { ScrollableListComponent } from '../common/components/scrollable_list_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { SelectableChoicesList } from '../common/helpers/selectable_choices_list.js';
import { SelectableOptionsMenu } from '../common/helpers/selectable_options_menu.js';
import { selectableNonCancellable } from '../common/helpers/selectable_restricted.js';
import { addChoiceIds, takeAreYouSure } from '../message/components/utils.js';
import { ARE_YOU_SURE_IDS, AreYouSureComponent } from './components/are_you_sure.js';
import { ITEMS_MENU_EVENTS, ItemsMenuComponent } from './components/items_menu.js';
import { MainMenuComponent } from './components/main_menu.js';
import { INPUT_TYPE, OptionsMenuComponent } from './components/options_menu.js';
import { TitleMenuComponent } from './components/title_menu.js';

/**
 * @type {HideableOpenable<MainMenuComponent>}
 */
let mainMenu;

/**
 * @type {HideableOpenable<AreYouSureComponent>}
 */
let areYouSure;

/**
 * @type {HideableOpenable<OptionsMenuComponent>}
 */
let optionsMenu;

/**
 * @type {HideableOpenable<ItemsMenuComponent>}
 */
let itemsMenu;

const SCENE_ITEM_TYPES = Object.freeze({
    ITEMS: 1,
    FLOOR: 2
});
let sceneItemType = SCENE_ITEM_TYPES.ITEMS;

/**
 * @type {HideableOpenable<TitleMenuComponent>}
 */
let titleMenu;

/**
 * @type {import('../common/helpers/selectable_interface.js').SelectableInterface}
 */
let selectable;

/**
 * @type {HTMLElement}
 */
let menuContainer;

/**
 * @type {Object<string,import('./components/main_menu.js').MainMenuOption>}
 */
const MAIN_MENU_CHOICES = /** @type {const} */ Object.freeze({
    ITEMS: { text: 'Items', explanation: 'Use and manage items' },
    FLOOR: {
        text: 'Floor',
        explanation: 'Pick up items from the floor',
        isEnabled() {
            const f = window.$f;
            return f.isFloorItem();
        }
    },
    OPTIONS: { text: 'Options', explanation: "Adjust the game's settings" },
    SAVE: {
        text: 'Save',
        explanation: 'Save your progress',
        isEnabled() {
            return $gameSystem.isSaveEnabled();
        }
    },
    BACK: { text: 'Back to the game', explanation: 'Close this menu, and return to the game' },
    EXIT: { text: 'Exit', explanation: 'Exit the game, and return to the title screen' }
});
addChoiceIds(MAIN_MENU_CHOICES);

const configManager = window.ConfigManager;
const step = 10;
const mod = 100 + step;
const resolutions = $mushFeatures.params['MOSR_ResolutionOptions'];
const OPTIONS_MENU_CHOICES = [
    {
        text: 'Screen resolution',
        explanation: 'Adjusts the screen resolution',
        input: {
            type: INPUT_TYPE.RADIO,
            values: resolutions
                .map(([ width, height ], index) => ({ value: index, text: `${width}x${height}` }))
        },
        get value() { return ConfigManager['mosr_screenResolution']; },
        set value(index) {
            const [ width, height ] = resolutions[index];
            SceneManager.mush_changeGraphicResolution(width, height);
            ConfigManager['mosr_screenResolution'] = index;
            setTimeout($f.adjustDimensions, 100);
        }
    },
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

/**
 * 
 * @param {HTMLElement} [container] 
 */
export function initializeMainMenu(container = document.body) {
    menuContainer = container;
    MainMenuComponent.register();
    mainMenu = new HideableOpenable(new MainMenuComponent());
    mainMenu.element.mainMenuSetOptions(Object.values(MAIN_MENU_CHOICES));

    AreYouSureComponent.register();
    areYouSure = new HideableOpenable(new AreYouSureComponent());
    areYouSure.topElement.classList.add('vertical-center');

    OptionsMenuComponent.register();
    optionsMenu = new HideableOpenable(new OptionsMenuComponent());
    optionsMenu.topElement.classList.add('vertical-center');

    ItemsMenuComponent.register();
    itemsMenu = new HideableOpenable(new ItemsMenuComponent());
    createItemsMenuEventListeners();

    TitleMenuComponent.register();
    titleMenu = new HideableOpenable(new TitleMenuComponent());
    titleMenu.topElement.classList.add('vertical-center');

    container.append(
        mainMenu.topElement,
        areYouSure.topElement,
        optionsMenu.topElement,
        itemsMenu.topElement,
        titleMenu.topElement
    );
}

Scene_Menu.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    const gameTemp = window.$gameTemp;
    const f = window.$f;
    selectable = new SelectableChoicesList(mainMenu.element.choicesList);

    addMenuBackdrop();
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
            case MAIN_MENU_CHOICES.ITEMS.id:
                sceneItemType = SCENE_ITEM_TYPES.ITEMS;
                SceneManager.push(Scene_Item);
            break;
            case MAIN_MENU_CHOICES.FLOOR.id:
                showFloor();
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
    selectable = new SelectableChoicesList(areYouSure.element.choicesList);

    takeAreYouSure(areYouSure, {
        explanation: /*html*/`Are you sure you want to exit the game and return to the title screen?<br>All unsaved progress will be lost.`,
        choices: [
            { text: 'Return to title', id: ARE_YOU_SURE_IDS.YES },
            { text: 'Cancel', id: ARE_YOU_SURE_IDS.NO }
        ]
    }).then(playerChoice => {
        if (playerChoice.id === ARE_YOU_SURE_IDS.YES) {
            removeMenuBackdrop();
            this.fadeOutAll();
            SceneManager.goto(Scene_Title);
        } else {
            this.popScene();
        }
    });
}

Scene_Options.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    addMenuBackdrop();
    selectable = new SelectableOptionsMenu(optionsMenu.element);
    handleOptionsMenu().then(() => {
        configManager.save();
        this.popScene();
    });
}

async function handleOptionsMenu() {
    optionsMenu.element.optionsMenuSetOptions(OPTIONS_MENU_CHOICES);
    optionsMenu.showAndOpen();
    await optionsMenu.element.optionsMenuStart();
    await optionsMenu.closeAndHide();
}

Scene_Item.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    addMenuBackdrop();

    const choices = createItemChoices();
    itemsMenu.showAndOpen();

    (
        sceneItemType === SCENE_ITEM_TYPES.FLOOR && choices.length === 1
            ? itemsMenu.element.itemsMenuStartOpenFirst(choices)
            : itemsMenu.element.itemsMenuStart(choices)
    ).then(async () => {
        await itemsMenu.closeAndHide();
        this.popScene();
    });
}

function createItemChoices() {
    const ICON_COLUMNS = 16;

    return getItems().map(item => {
        const iconIndex = item.iconIndex;
        const iconX = iconIndex % ICON_COLUMNS;
        const iconY = Math.floor(iconIndex / ICON_COLUMNS);

        const amount = getItemAmounts(item);
        return {
            text: `<div class="item-icon" style="--icon-x:${iconX};--icon-y:${iconY}"></div> ${item.name} x${amount}`,
            explanation: item.description,
            id: item.id,
            amount,
            consumable: $dataItems[item.id].consumable,
            canUse: () => true,
            canPickUp: () => sceneItemType === SCENE_ITEM_TYPES.FLOOR,
            canDrop: () => sceneItemType === SCENE_ITEM_TYPES.ITEMS && !!item.meta.item
        }
    });
}

function getItems() {
    switch (sceneItemType) {
        case SCENE_ITEM_TYPES.FLOOR: return $f.getFloorItems();
        default: return $gameParty.items();
    }
}

function getItemAmounts(item) {
    switch (sceneItemType) {
        case SCENE_ITEM_TYPES.FLOOR: return item.amount;
        default: return $gameParty.numItems($dataItems[item.id]);
    }
}

function createItemsMenuEventListeners() {
    const f = window.$f;
    
    itemsMenu.element.addEventListener(ITEMS_MENU_EVENTS.ITEM_USED, event => {
        goBackFromItemsMenu();

        const dataItems = window.$dataItems;
        const itemId = event.detail.itemId;
        const itemData = dataItems[itemId];

        switch (sceneItemType) {
            case SCENE_ITEM_TYPES.FLOOR:
                const x = $gamePlayer.x;
                const y = $gamePlayer.y;
                const itemEvent = $gameMap.eventsXy(x, y)
                    .findLast(event => event && !event._erased && event.event()?.meta?.item === itemData.meta.item);
                itemEvent.erase();
                f.useFloorItem(itemId);
            break;
            default: f.useInventoryItem(itemId);
        }
    });
    
    itemsMenu.element.addEventListener(ITEMS_MENU_EVENTS.ITEM_DROPPED, event => {
        goBackFromItemsMenu();

        mapStartActions.push(() => {
            const itemId = event.detail.itemId;
            const itemData = $dataItems[itemId];

            f.placeItemEvent($gamePlayer.x, $gamePlayer.y, itemData?.meta?.item);
            $gameParty.loseItem(itemData, 1);
            f.moveEnemies();
        });
    });
    
    itemsMenu.element.addEventListener(ITEMS_MENU_EVENTS.ITEM_PICKED_UP, event => {
        goBackFromItemsMenu();

        mapStartActions.push(() => {
            const itemId = event.detail.itemId;
            const x = $gamePlayer.x;
            const y = $gamePlayer.y;
            const itemData = $dataItems[itemId];
    
            const itemEvent = $gameMap.eventsXy(x, y)
                .findLast(event => !event._erased && itemData.meta.item === event.event()?.meta?.item);
            itemEvent.erase();
            $gameParty.gainItem(itemData, 1);
            f.moveEnemies();
        });
    });
}

function showFloor() {
    if (itemsMenu.hideable.hideableIsShown) {
        return;
    }
    sceneItemType = SCENE_ITEM_TYPES.FLOOR;
    SceneManager.push(Scene_Item);
}

window.$f = $f || {};
$f.showFloor = showFloor;

function goBackFromItemsMenu() {
    itemsMenu.closeAndHide();
    SceneManager.goto(Scene_Map);
}

/**
 * @type {Object<string,import('../message/components/choices_list.js').ChoiceListChoice>}
 */
const TITLE_CHOICES = {
    CONTINUE: { text: 'Continue', isEnabled: () => DataManager.isAnySavefileExists() },
    NEW_GAME: { text: 'New game' },
    OPTIONS: { text: 'Options' },
    EXIT: { text: 'Exit' }
};
addChoiceIds(TITLE_CHOICES);

const _Scene_Title_start = Scene_Title.prototype.start;
Scene_Title.prototype.start = function() {
    _Scene_Title_start.call(this);
    mapStartActions = [];
    removeMenuBackdrop();

    takeTitleChoiceAsync().then(choice => {
        switch (choice.id) {
            case TITLE_CHOICES.EXIT.id:
                SceneManager.push(Scene_GameExit);
            return;
            case TITLE_CHOICES.NEW_GAME.id:
                DataManager.setupNewGame();
                this.fadeOutAll();
                SceneManager.goto(Scene_Map);
            break;
            case TITLE_CHOICES.CONTINUE.id:
                SceneManager.push(Scene_Load);
            break;
            case TITLE_CHOICES.OPTIONS.id:
                SceneManager.push(Scene_Options);
            break;
        }
    });
}

async function takeTitleChoiceAsync() {
    const title = titleMenu.element;
    const choices = Object.values(TITLE_CHOICES);
    selectable = new selectableNonCancellable(SelectableChoicesList, title.choicesList);
    
    titleMenu.showAndOpen();
    const choice = await title.titleMenuTakeChoice(choices);
    titleMenu.closeAndHide();
    return choice;
}

Scene_Title.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    handleMenuInputs(Scene_Title);
}

Scene_Title.prototype.isBusy = Scene_Base.prototype.isBusy;

Scene_Title.prototype.createCommandWindow = function() {
    // empty
}

class Scene_GameExit extends Scene_MenuBase {
    
    async start() {
        super.start();
        addMenuBackdrop();

        selectable = new SelectableChoicesList(areYouSure.element.choicesList);
        areYouSure.showAndOpen();
        const playerConfirm = await areYouSure.element.areYouSureTakeChoice({
            choices: [
                { text: 'Exit the game', id: ARE_YOU_SURE_IDS.YES },
                { text: 'Cancel', id: ARE_YOU_SURE_IDS.NO },
            ],
            explanation: 'Are you sure you want to exit the game?'
        });

        if (playerConfirm.id === ARE_YOU_SURE_IDS.YES) {
            SceneManager.exit();
            return;
        }

        areYouSure.closeAndHide();
        this.popScene();
    }

}
// For PreventTitleFadeIn plugin
window.Scene_GameExit = Scene_GameExit;

for (const scene of [
        Scene_Menu,
        Scene_GameEnd,
        Scene_Options,
        Scene_Item,
        Scene_GameExit
]) {
    const _scene_update = scene.prototype.update;
    scene.prototype.update = function() {
        _scene_update.call(this);
        handleMenuInputs(scene);
    }

    scene.prototype.create = Scene_MenuBase.prototype.create;
    scene.prototype.stop = Scene_MenuBase.prototype.stop;
    scene.prototype.createBackground = Scene_MenuBase.prototype.createBackground;
}

const _Scene_Item_update = Scene_Item.prototype.update;
Scene_Item.prototype.update = function() {
    selectable = new SelectableChoicesList(itemsMenu.element.choicesList);
    _Scene_Item_update.call(this);
}

function handleMenuInputs(scene) {
    const input = window.Input;
    const touchInput = window.TouchInput;

    if (input.isTriggered('up')) {
        selectable.selectUp();
    } else if (input.isTriggered('down')) {
        selectable.selectDown();
    } else if (input.isTriggered('ok')) {
        selectable.confirmCurrent();
    } else if (input.isTriggered('cancel') || touchInput.isCancelled()) {
        selectable.cancel();
    } if (input.isTriggered('right')) {
        selectable.selectRight();
    } else if (input.isTriggered('left')) {
        selectable.selectLeft();
    }
}

function mapToOnOff(boolValue) {
    return boolValue ? 'ON' : 'OFF';
}

function mapToPercentage(value) {
    return `${value}%`;
}

function addMenuBackdrop() {
    menuContainer.classList.add('menu-backdrop');
}

function removeMenuBackdrop() {
    menuContainer.classList.remove('menu-backdrop');
}

let mapStartActions;
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    _Scene_Map_start.call(this);
    for (const action of mapStartActions) {
        action();
    }
    mapStartActions = [];

    removeMenuBackdrop();
}